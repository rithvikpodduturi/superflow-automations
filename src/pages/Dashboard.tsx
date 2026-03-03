import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Copy, Plus, Trash2, Eye, LogOut, User, Filter, Mail, Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';

interface WebhookEndpoint {
  id: string;
  name: string;
  endpoint_id: string;
  description: string;
  is_active: boolean;
  created_at: string;
  user_id: string;
}

interface WebhookRequest {
  id: string;
  url_path: string;
  method: string;
  headers: any;
  body: any;
  query_params: any;
  source_ip: string;
  user_agent: string;
  content_type: string;
  created_at: string;
  user_id: string;
}

interface SmtpConfig {
  id: string;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_email: string;
  smtp_password: string;
  use_tls: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const Dashboard = () => {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [requests, setRequests] = useState<WebhookRequest[]>([]);
  const [newEndpoint, setNewEndpoint] = useState({ name: '', description: '' });
  const [selectedRequest, setSelectedRequest] = useState<WebhookRequest | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showGetRequests, setShowGetRequests] = useState(true);
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig | null>(null);
  const [smtpForm, setSmtpForm] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_email: '',
    smtp_password: '',
    use_tls: true,
  });
  const [smtpDialogOpen, setSmtpDialogOpen] = useState(false);
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [notifyOnWebhook, setNotifyOnWebhook] = useState(false);
  const { toast } = useToast();
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      navigate('/auth');
      return;
    }
    
    fetchUserRole();
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && userRole !== null) {
      loadEndpoints();
      loadRequests();
      loadSmtpConfig();

      const channel = supabase
        .channel('webhook-updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'webhooks'
          },
          (payload) => {
            const newRequest = payload.new as WebhookRequest;
            if (userRole === 'admin' || newRequest.user_id === user.id) {
              setRequests(prev => [newRequest, ...prev]);
              toast({
                title: "New webhook received!",
                description: `${newRequest.method} request to ${newRequest.url_path}`,
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, userRole, toast]);

  const fetchUserRole = async () => {
    if (!user) return;
    
    const { data, error } = await (supabase as any)
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    if (data) {
      setUserRole(data.role);
    } else {
      setUserRole('user');
    }
  };

  const loadEndpoints = async () => {
    if (!user) return;
    
    let query = (supabase as any)
      .from('webhook_endpoints')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (userRole !== 'admin') {
      query = query.eq('user_id', user.id);
    }
    
    const { data, error } = await query;

    if (error) {
      toast({
        title: "Error loading endpoints",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setEndpoints(data || []);
    }
  };

  const loadRequests = async () => {
    if (!user) return;
    
    let query = (supabase as any)
      .from('webhooks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (userRole !== 'admin') {
      query = query.eq('user_id', user.id);
    }
    
    const { data, error } = await query;

    if (error) {
      toast({
        title: "Error loading requests",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setRequests(data || []);
    }
  };

  const loadSmtpConfig = async () => {
    if (!user) return;

    const { data, error } = await (supabase as any)
      .from('smtp_configurations')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setSmtpConfig(data);
      setSmtpForm({
        smtp_host: data.smtp_host,
        smtp_port: data.smtp_port,
        smtp_username: data.smtp_username,
        smtp_email: data.smtp_email,
        smtp_password: data.smtp_password,
        use_tls: data.use_tls,
      });
    }
  };

  const saveSmtpConfig = async () => {
    if (!user) return;
    setSmtpLoading(true);

    try {
      if (smtpConfig) {
        const { error } = await (supabase as any)
          .from('smtp_configurations')
          .update({
            smtp_host: smtpForm.smtp_host,
            smtp_port: smtpForm.smtp_port,
            smtp_username: smtpForm.smtp_username,
            smtp_email: smtpForm.smtp_email,
            smtp_password: smtpForm.smtp_password,
            use_tls: smtpForm.use_tls,
          })
          .eq('id', smtpConfig.id);

        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('smtp_configurations')
          .insert({
            user_id: user.id,
            smtp_host: smtpForm.smtp_host,
            smtp_port: smtpForm.smtp_port,
            smtp_username: smtpForm.smtp_username,
            smtp_email: smtpForm.smtp_email,
            smtp_password: smtpForm.smtp_password,
            use_tls: smtpForm.use_tls,
          });

        if (error) throw error;
      }

      toast({ title: "SMTP configuration saved!", description: "Your email notification settings have been updated." });
      setSmtpDialogOpen(false);
      loadSmtpConfig();
    } catch (error: any) {
      toast({ title: "Error saving SMTP config", description: error.message, variant: "destructive" });
    } finally {
      setSmtpLoading(false);
    }
  };

  const deleteSmtpConfig = async () => {
    if (!smtpConfig) return;

    const { error } = await (supabase as any)
      .from('smtp_configurations')
      .delete()
      .eq('id', smtpConfig.id);

    if (error) {
      toast({ title: "Error deleting SMTP config", description: error.message, variant: "destructive" });
    } else {
      setSmtpConfig(null);
      setSmtpForm({ smtp_host: '', smtp_port: 587, smtp_username: '', smtp_email: '', smtp_password: '', use_tls: true });
      toast({ title: "SMTP configuration removed" });
    }
  };

  const sendTestEmail = async () => {
    if (!user) return;

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/send-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            subject: 'Test Email from Webhook Dashboard',
            body: 'This is a test email to verify your SMTP configuration is working correctly.',
            to: smtpConfig?.smtp_email,
          }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        toast({ title: "Test email sent!", description: `Check your inbox at ${smtpConfig?.smtp_email}` });
      } else {
        toast({ title: "Failed to send test email", description: result.error || 'Unknown error', variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error sending test email", description: error.message, variant: "destructive" });
    }
  };

  const createEndpoint = async () => {
    if (!user) return;
    
    if (!newEndpoint.name) {
      toast({
        title: "Name required",
        description: "Please enter a name for the endpoint",
        variant: "destructive"
      });
      return;
    }

    const endpointId = crypto.randomUUID().slice(0, 8);
    
    const { error } = await (supabase as any)
      .from('webhook_endpoints')
      .insert({
        name: newEndpoint.name,
        endpoint_id: endpointId,
        description: newEndpoint.description,
        user_id: user.id
      });

    if (error) {
      toast({
        title: "Error creating endpoint",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Endpoint created!",
        description: "Your new webhook endpoint is ready to use",
      });
      setNewEndpoint({ name: '', description: '' });
      loadEndpoints();
    }
  };

  const copyWebhookUrl = (endpointId: string) => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const url = `https://${projectId}.supabase.co/functions/v1/webhook-capture/${endpointId}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "URL copied!",
      description: "Webhook URL copied to clipboard",
    });
  };

  const deleteEndpoint = async (id: string) => {
    const { error } = await (supabase as any)
      .from('webhook_endpoints')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error deleting endpoint",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Endpoint deleted",
        description: "Webhook endpoint removed successfully",
      });
      loadEndpoints();
    }
  };

  const parseFormData = (body: any): Record<string, string> => {
    if (typeof body === 'string') {
      const params = new URLSearchParams(body);
      const result: Record<string, string> = {};
      for (const [key, value] of params.entries()) {
        result[key] = decodeURIComponent(value);
      }
      return result;
    }
    return body || {};
  };

  const getRequests = requests.filter(req => req.method === 'GET');
  const postRequests = requests.filter(req => req.method === 'POST');

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Loading...</h2>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Webhook Dashboard</h1>
            <p className="text-muted-foreground">Manage your webhook endpoints and view incoming requests</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="text-sm text-muted-foreground">
                {user.email}
              </span>
              {userRole && <Badge variant="secondary">{userRole}</Badge>}
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {userRole === 'admin' && (
          <Alert>
            <AlertDescription>
              You are signed in as an administrator. You can view all endpoints and webhook requests across all users.
            </AlertDescription>
          </Alert>
        )}

        {/* SMTP Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Notifications (SMTP)
                </CardTitle>
                <CardDescription>
                  Configure your SMTP settings to receive email notifications for incoming webhooks
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {smtpConfig && (
                  <>
                    <Badge variant={smtpConfig.is_active ? "default" : "secondary"}>
                      {smtpConfig.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={sendTestEmail}>
                      Send Test Email
                    </Button>
                  </>
                )}
                <Dialog open={smtpDialogOpen} onOpenChange={setSmtpDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant={smtpConfig ? "outline" : "default"} size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      {smtpConfig ? "Edit SMTP" : "Add SMTP"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>{smtpConfig ? "Edit" : "Add"} SMTP Configuration</DialogTitle>
                      <DialogDescription>
                        Enter your SMTP server details to receive email notifications
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="smtp_host">SMTP Host</Label>
                          <Input
                            id="smtp_host"
                            placeholder="smtp.gmail.com"
                            value={smtpForm.smtp_host}
                            onChange={(e) => setSmtpForm(prev => ({ ...prev, smtp_host: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="smtp_port">Port</Label>
                          <Input
                            id="smtp_port"
                            type="number"
                            placeholder="587"
                            value={smtpForm.smtp_port}
                            onChange={(e) => setSmtpForm(prev => ({ ...prev, smtp_port: parseInt(e.target.value) || 587 }))}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="smtp_email">Email Address</Label>
                        <Input
                          id="smtp_email"
                          type="email"
                          placeholder="you@example.com"
                          value={smtpForm.smtp_email}
                          onChange={(e) => setSmtpForm(prev => ({ ...prev, smtp_email: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="smtp_username">Username</Label>
                        <Input
                          id="smtp_username"
                          placeholder="your-username"
                          value={smtpForm.smtp_username}
                          onChange={(e) => setSmtpForm(prev => ({ ...prev, smtp_username: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="smtp_password">Password / App Password</Label>
                        <Input
                          id="smtp_password"
                          type="password"
                          placeholder="••••••••"
                          value={smtpForm.smtp_password}
                          onChange={(e) => setSmtpForm(prev => ({ ...prev, smtp_password: e.target.value }))}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="use_tls"
                          checked={smtpForm.use_tls}
                          onCheckedChange={(checked) => setSmtpForm(prev => ({ ...prev, use_tls: checked === true }))}
                        />
                        <Label htmlFor="use_tls">Use TLS/SSL</Label>
                      </div>
                      <div className="flex justify-between pt-2">
                        {smtpConfig && (
                          <Button variant="destructive" onClick={deleteSmtpConfig}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                        )}
                        <Button
                          className="ml-auto"
                          onClick={saveSmtpConfig}
                          disabled={smtpLoading || !smtpForm.smtp_host || !smtpForm.smtp_email || !smtpForm.smtp_password}
                        >
                          {smtpLoading ? "Saving..." : "Save Configuration"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          {smtpConfig && (
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <div className="flex border-b bg-muted/50">
                  <div className="w-1/4 p-3 font-medium text-muted-foreground border-r">Host</div>
                  <div className="flex-1 p-3">{smtpConfig.smtp_host}:{smtpConfig.smtp_port}</div>
                </div>
                <div className="flex border-b bg-background">
                  <div className="w-1/4 p-3 font-medium text-muted-foreground border-r">Email</div>
                  <div className="flex-1 p-3">{smtpConfig.smtp_email}</div>
                </div>
                <div className="flex bg-muted/30">
                  <div className="w-1/4 p-3 font-medium text-muted-foreground border-r">TLS</div>
                  <div className="flex-1 p-3">{smtpConfig.use_tls ? "Enabled" : "Disabled"}</div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Create New Endpoint */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Webhook Endpoint
            </CardTitle>
            <CardDescription>
              Generate a unique URL to capture incoming webhook data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Endpoint Name</Label>
                <Input
                  id="name"
                  value={newEndpoint.name}
                  onChange={(e) => setNewEndpoint(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My API Webhook"
                />
              </div>
              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={newEndpoint.description}
                  onChange={(e) => setNewEndpoint(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Webhook for user registrations"
                />
              </div>
            </div>
            <Button onClick={createEndpoint}>Create Endpoint</Button>
          </CardContent>
        </Card>

        {/* Existing Endpoints */}
        <Card>
          <CardHeader>
            <CardTitle>Your Webhook Endpoints</CardTitle>
            <CardDescription>
              {endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''} created
            </CardDescription>
          </CardHeader>
          <CardContent>
            {endpoints.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No endpoints created yet. Create your first endpoint above.
              </p>
            ) : (
              <div className="space-y-4">
                {endpoints.map((endpoint) => (
                  <div key={endpoint.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{endpoint.name}</h3>
                        {endpoint.description && (
                          <p className="text-sm text-muted-foreground">{endpoint.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={endpoint.is_active ? "default" : "secondary"}>
                          {endpoint.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteEndpoint(endpoint.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <code className="bg-muted px-2 py-1 rounded flex-1">
                        {`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/webhook-capture/${endpoint.endpoint_id}`}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyWebhookUrl(endpoint.endpoint_id)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* POST Requests */}
        <Card>
          <CardHeader>
            <CardTitle>POST Requests</CardTitle>
            <CardDescription>
              {postRequests.length} POST request{postRequests.length !== 1 ? 's' : ''} captured
            </CardDescription>
          </CardHeader>
          <CardContent>
            {postRequests.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No POST requests yet. Send a POST request to one of your endpoints to see it here.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {postRequests.map((request) => {
                    const formData = parseFormData(request.body);
                    return (
                      <TableRow key={request.id}>
                        <TableCell>
                          <span className="font-medium">
                            {formData.name || 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {formData.email ? (
                            <a href={`mailto:${formData.email}`} className="text-blue-600 hover:underline">
                              {formData.email}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {formData.phone ? (
                            <a href={`tel:${formData.phone}`} className="text-blue-600 hover:underline">
                              {formData.phone}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(request.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedRequest(request)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
                              <DialogHeader>
                                <DialogTitle>POST Request Details</DialogTitle>
                                <DialogDescription>
                                  POST request to {request.url_path} at {new Date(request.created_at).toLocaleString()}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-6">
                                <div>
                                  <Label className="text-lg font-semibold">Request Information</Label>
                                  <div className="border rounded-lg mt-2 overflow-hidden">
                                    <div className="flex border-b bg-muted/50">
                                      <div className="w-1/3 p-3 font-medium text-muted-foreground border-r">Path</div>
                                      <div className="flex-1 p-3"><code>{request.url_path}</code></div>
                                    </div>
                                    <div className="flex border-b bg-background">
                                      <div className="w-1/3 p-3 font-medium text-muted-foreground border-r">Source IP</div>
                                      <div className="flex-1 p-3">{request.source_ip || 'Unknown'}</div>
                                    </div>
                                    <div className="flex border-b bg-muted/30">
                                      <div className="w-1/3 p-3 font-medium text-muted-foreground border-r">Content Type</div>
                                      <div className="flex-1 p-3">{request.content_type || 'N/A'}</div>
                                    </div>
                                    <div className="flex bg-background">
                                      <div className="w-1/3 p-3 font-medium text-muted-foreground border-r">User Agent</div>
                                      <div className="flex-1 p-3 break-all">{request.user_agent || 'N/A'}</div>
                                    </div>
                                  </div>
                                </div>

                                {request.body && (
                                  <div>
                                    <div className="flex items-center justify-between mb-4">
                                      <Label className="text-lg font-semibold">Form Data</Label>
                                      <Badge variant="outline">{Object.keys(parseFormData(request.body)).length} fields</Badge>
                                    </div>
                                    <div className="border rounded-lg overflow-hidden">
                                      <div className="max-h-96 overflow-y-auto">
                                        {Object.entries(parseFormData(request.body)).map(([key, value], index) => (
                                          <div key={key} className={`flex border-b last:border-b-0 ${index % 2 === 0 ? 'bg-muted/30' : 'bg-background'}`}>
                                            <div className="w-1/3 p-4 font-medium text-muted-foreground border-r bg-muted/50">
                                              {key}
                                            </div>
                                            <div className="flex-1 p-4">
                                              {key === 'email' && value.includes('@') ? (
                                                <a href={`mailto:${value}`} className="text-blue-600 hover:underline">
                                                  {value}
                                                </a>
                                              ) : key === 'phone' && (value.startsWith('+') || value.match(/^\d+$/)) ? (
                                                <a href={`tel:${value}`} className="text-blue-600 hover:underline">
                                                  {value}
                                                </a>
                                              ) : key === 'page' && value.startsWith('http') ? (
                                                <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                  {value}
                                                </a>
                                              ) : key === 'created' && !isNaN(Number(value)) ? (
                                                <span>{new Date(Number(value)).toLocaleString()}</span>
                                              ) : (
                                                <span className="break-all">{value}</span>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                <div>
                                  <Label className="text-lg font-semibold">Headers</Label>
                                  <Textarea
                                    value={JSON.stringify(request.headers, null, 2)}
                                    readOnly
                                    className="font-mono text-sm h-32 mt-2"
                                  />
                                </div>
                                
                                {request.query_params && (
                                  <div>
                                    <Label className="text-lg font-semibold">Query Parameters</Label>
                                    <Textarea
                                      value={JSON.stringify(request.query_params, null, 2)}
                                      readOnly
                                      className="font-mono text-sm h-24 mt-2"
                                    />
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* GET Requests */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>GET Requests</CardTitle>
                <CardDescription>
                  {getRequests.length} GET request{getRequests.length !== 1 ? 's' : ''} captured
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4" />
                <Label htmlFor="show-get">Show GET requests</Label>
                <Switch
                  id="show-get"
                  checked={showGetRequests}
                  onCheckedChange={setShowGetRequests}
                />
              </div>
            </div>
          </CardHeader>
          {showGetRequests && (
            <CardContent>
              {getRequests.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No GET requests yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Path</TableHead>
                      <TableHead>Source IP</TableHead>
                      <TableHead>User Agent</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {request.url_path}
                          </code>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {request.source_ip || 'Unknown'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {request.user_agent || 'N/A'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(request.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedRequest(request)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                              <DialogHeader>
                                <DialogTitle>GET Request Details</DialogTitle>
                                <DialogDescription>
                                  GET request to {request.url_path} at {new Date(request.created_at).toLocaleString()}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Headers</Label>
                                  <Textarea
                                    value={JSON.stringify(request.headers, null, 2)}
                                    readOnly
                                    className="font-mono text-sm h-32"
                                  />
                                </div>
                                {request.query_params && (
                                  <div>
                                    <Label>Query Parameters</Label>
                                    <Textarea
                                      value={JSON.stringify(request.query_params, null, 2)}
                                      readOnly
                                      className="font-mono text-sm h-24"
                                    />
                                  </div>
                                )}
                                <div>
                                  <Label>User Agent</Label>
                                  <Textarea
                                    value={request.user_agent || 'N/A'}
                                    readOnly
                                    className="font-mono text-sm h-16"
                                  />
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
