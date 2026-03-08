import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Copy, Plus, Trash2, LogOut, User, Mail, Settings, Activity, BarChart3, Shield, Bell, HeartPulse, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WebhookTable } from "@/components/dashboard/WebhookTable";
import { AnalyticsCharts } from "@/components/dashboard/AnalyticsCharts";
import { NotificationChannels } from "@/components/dashboard/NotificationChannels";
import { IntegrationTemplates } from "@/components/dashboard/IntegrationTemplates";
import { GoogleSheetsConfig } from "@/components/dashboard/GoogleSheetsConfig";
import { WebhookTransforms } from "@/components/dashboard/WebhookTransforms";
import { LiveFeedIndicator } from "@/components/dashboard/LiveFeedIndicator";
import { RetryQueue } from "@/components/dashboard/RetryQueue";
import { HealthMonitoring } from "@/components/dashboard/HealthMonitoring";

interface WebhookEndpoint {
  id: string;
  name: string;
  endpoint_id: string;
  description: string;
  is_active: boolean;
  created_at: string;
  user_id: string;
  response_status_code: number;
  response_headers: any;
  response_body: string;
  api_key: string | null;
  notify_on_receive: boolean;
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
}

interface NotificationChannel {
  id: string;
  channel_type: string;
  webhook_url: string;
  channel_name: string | null;
  is_active: boolean;
}

const Dashboard = () => {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [requests, setRequests] = useState<WebhookRequest[]>([]);
  const [newEndpoint, setNewEndpoint] = useState({ name: "", description: "" });
  const [userRole, setUserRole] = useState<string | null>(null);
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig | null>(null);
  const [smtpForm, setSmtpForm] = useState({
    smtp_host: "", smtp_port: 587, smtp_username: "", smtp_email: "", smtp_password: "", use_tls: true,
  });
  const [smtpDialogOpen, setSmtpDialogOpen] = useState(false);
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [endpointConfigDialog, setEndpointConfigDialog] = useState<WebhookEndpoint | null>(null);
  const [endpointConfig, setEndpointConfig] = useState({
    response_status_code: 200,
    response_headers: "{}",
    response_body: '{"success": true}',
    api_key: "",
    notify_on_receive: false,
  });

  // Live feed state
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [newRequestIds, setNewRequestIds] = useState<Set<string>>(new Set());
  const pausedQueueRef = useRef<WebhookRequest[]>([]);

  const { toast } = useToast();
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    fetchUserRole();
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && userRole !== null) {
      loadAll();
      const channel = supabase
        .channel("webhook-updates")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "webhooks" }, (payload) => {
          const newReq = payload.new as WebhookRequest;
          if (newReq.user_id === user.id) {
            if (isPaused) {
              pausedQueueRef.current.push(newReq);
            } else {
              setRequests((prev) => [newReq, ...prev]);
              setNewRequestIds((prev) => {
                const next = new Set(prev);
                next.add(newReq.id);
                setTimeout(() => setNewRequestIds((p) => { const n = new Set(p); n.delete(newReq.id); return n; }), 3000);
                return next;
              });
            }
            setSessionCount((c) => c + 1);
            toast({ title: "New webhook received!", description: `${newReq.method} request` });
          }
        })
        .subscribe((status) => {
          setIsLiveConnected(status === "SUBSCRIBED");
        });
      return () => { supabase.removeChannel(channel); };
    }
  }, [user, userRole, toast, isPaused]);

  const handleTogglePause = useCallback(() => {
    setIsPaused((prev) => {
      if (prev) {
        // Resuming — flush queued requests
        const queued = pausedQueueRef.current;
        if (queued.length > 0) {
          setRequests((r) => [...queued.reverse(), ...r]);
          queued.forEach((q) => {
            setNewRequestIds((p) => {
              const n = new Set(p);
              n.add(q.id);
              setTimeout(() => setNewRequestIds((pp) => { const nn = new Set(pp); nn.delete(q.id); return nn; }), 3000);
              return n;
            });
          });
          pausedQueueRef.current = [];
        }
      }
      return !prev;
    });
  }, []);

  const loadAll = () => {
    loadEndpoints();
    loadRequests();
    loadSmtpConfig();
    loadChannels();
  };

  const fetchUserRole = async () => {
    if (!user) return;
    const { data } = await (supabase as any).from("user_roles").select("role").eq("user_id", user.id).single();
    setUserRole(data?.role || "user");
  };

  const loadEndpoints = async () => {
    if (!user) return;
    const { data } = await (supabase as any).from("webhook_endpoints").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setEndpoints(data || []);
  };

  const loadRequests = async () => {
    if (!user) return;
    const { data } = await (supabase as any).from("webhooks").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(500);
    setRequests(data || []);
  };

  const fetchAllRequests = async (): Promise<WebhookRequest[]> => {
    if (!user) return [];
    const allData: WebhookRequest[] = [];
    let from = 0;
    const batchSize = 1000;
    while (true) {
      const { data } = await (supabase as any).from("webhooks").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).range(from, from + batchSize - 1);
      if (!data || data.length === 0) break;
      allData.push(...data);
      if (data.length < batchSize) break;
      from += batchSize;
    }
    return allData;
  };

  const loadSmtpConfig = async () => {
    if (!user) return;
    const { data } = await (supabase as any).from("smtp_configurations").select("*").eq("user_id", user.id).single();
    if (data) {
      setSmtpConfig(data);
      setSmtpForm({ smtp_host: data.smtp_host, smtp_port: data.smtp_port, smtp_username: data.smtp_username, smtp_email: data.smtp_email, smtp_password: data.smtp_password, use_tls: data.use_tls });
    }
  };

  const loadChannels = async () => {
    if (!user) return;
    const { data } = await (supabase as any).from("notification_channels").select("*").eq("user_id", user.id);
    setChannels(data || []);
  };

  const saveSmtpConfig = async () => {
    if (!user) return;
    setSmtpLoading(true);
    try {
      if (smtpConfig) {
        const { error } = await (supabase as any).from("smtp_configurations").update(smtpForm).eq("id", smtpConfig.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("smtp_configurations").insert({ ...smtpForm, user_id: user.id });
        if (error) throw error;
      }
      toast({ title: "SMTP saved!" });
      setSmtpDialogOpen(false);
      loadSmtpConfig();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSmtpLoading(false);
    }
  };

  const deleteSmtpConfig = async () => {
    if (!smtpConfig) return;
    await (supabase as any).from("smtp_configurations").delete().eq("id", smtpConfig.id);
    setSmtpConfig(null);
    setSmtpForm({ smtp_host: "", smtp_port: 587, smtp_username: "", smtp_email: "", smtp_password: "", use_tls: true });
    toast({ title: "SMTP removed" });
  };

  const sendTestEmail = async () => {
    if (!user) return;
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/send-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ subject: "Test Email", body: "SMTP is working!", to: smtpConfig?.smtp_email }),
      });
      const result = await res.json();
      toast(res.ok ? { title: "Test email sent!" } : { title: "Failed", description: result.error, variant: "destructive" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const createEndpoint = async () => {
    if (!user || !newEndpoint.name) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    const endpointId = crypto.randomUUID().slice(0, 8);
    const { error } = await (supabase as any).from("webhook_endpoints").insert({
      name: newEndpoint.name, endpoint_id: endpointId, description: newEndpoint.description, user_id: user.id,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Endpoint created!" });
      setNewEndpoint({ name: "", description: "" });
      loadEndpoints();
    }
  };

  const deleteEndpoint = async (id: string) => {
    const { error } = await (supabase as any).from("webhook_endpoints").delete().eq("id", id);
    if (!error) { toast({ title: "Endpoint deleted" }); loadEndpoints(); }
  };

  const copyUrl = (eid: string) => {
    const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/webhook-capture/${eid}`;
    navigator.clipboard.writeText(url);
    toast({ title: "URL copied!" });
  };

  const openEndpointConfig = (ep: WebhookEndpoint) => {
    setEndpointConfigDialog(ep);
    setEndpointConfig({
      response_status_code: ep.response_status_code || 200,
      response_headers: JSON.stringify(ep.response_headers || {}, null, 2),
      response_body: ep.response_body || '{"success": true}',
      api_key: ep.api_key || "",
      notify_on_receive: ep.notify_on_receive || false,
    });
  };

  const saveEndpointConfig = async () => {
    if (!endpointConfigDialog) return;
    let parsedHeaders = {};
    try { parsedHeaders = JSON.parse(endpointConfig.response_headers); } catch {}
    const { error } = await (supabase as any).from("webhook_endpoints").update({
      response_status_code: endpointConfig.response_status_code,
      response_headers: parsedHeaders,
      response_body: endpointConfig.response_body,
      api_key: endpointConfig.api_key || null,
      notify_on_receive: endpointConfig.notify_on_receive,
    }).eq("id", endpointConfigDialog.id);
    if (!error) {
      toast({ title: "Endpoint config saved!" });
      setEndpointConfigDialog(null);
      loadEndpoints();
    } else {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const requestCountByEndpoint = (endpointId: string) => {
    return requests.filter((r) => r.url_path?.includes(endpointId)).length;
  };

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen"><h2 className="text-2xl font-bold">Loading...</h2></div>;
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">Webhook Dashboard</h1>
              <p className="text-muted-foreground">Manage endpoints, monitor requests, and analyze data</p>
            </div>
            <LiveFeedIndicator
              isConnected={isLiveConnected}
              sessionCount={sessionCount}
              isPaused={isPaused}
              onTogglePause={handleTogglePause}
            />
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {userRole === "super_admin" && (
              <Button variant="outline" onClick={() => navigate("/admin")}>
                <Shield className="h-4 w-4 mr-2" /> Admin Panel
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate("/profile")}>
              <User className="h-4 w-4 mr-1" />
              <span className="hidden md:inline">{user.email}</span>
              {userRole && <Badge variant="secondary" className="ml-1">{userRole}</Badge>}
            </Button>
            <Button variant="outline" onClick={async () => { await signOut(); navigate("/"); }}>
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
            </Button>
          </div>
        </div>

        {userRole === "super_admin" && (
          <Alert><AlertDescription>Super admin mode — viewing all data across users.</AlertDescription></Alert>
        )}

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{endpoints.length}</p>
                  <p className="text-xs text-muted-foreground">Endpoints</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{requests.length}</p>
                  <p className="text-xs text-muted-foreground">Total Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{endpoints.filter((e) => e.api_key).length}</p>
                  <p className="text-xs text-muted-foreground">Secured</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{endpoints.filter((e) => e.notify_on_receive).length}</p>
                  <p className="text-xs text-muted-foreground">Notifying</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main tabs */}
        <Tabs defaultValue="requests" className="space-y-4">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
            <TabsTrigger value="forwards">Forwards</TabsTrigger>
            <TabsTrigger value="health">Health</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Requests tab */}
          <TabsContent value="requests">
            <WebhookTable requests={requests} endpoints={endpoints} newRequestIds={newRequestIds} onExportAll={fetchAllRequests} />
          </TabsContent>

          {/* Endpoints tab */}
          <TabsContent value="endpoints" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> New Endpoint</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Name</Label>
                    <Input value={newEndpoint.name} onChange={(e) => setNewEndpoint((p) => ({ ...p, name: e.target.value }))} placeholder="My Webhook" />
                  </div>
                  <div>
                    <Label>Description (optional)</Label>
                    <Input value={newEndpoint.description} onChange={(e) => setNewEndpoint((p) => ({ ...p, description: e.target.value }))} placeholder="For user signups" />
                  </div>
                </div>
                <Button onClick={createEndpoint}>Create Endpoint</Button>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {endpoints.map((ep) => (
                <Card key={ep.id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{ep.name}</h3>
                          <Badge variant={ep.is_active ? "default" : "secondary"}>{ep.is_active ? "Active" : "Inactive"}</Badge>
                          {ep.api_key && <Badge variant="outline"><Shield className="h-3 w-3 mr-1" />Secured</Badge>}
                          {ep.notify_on_receive && <Badge variant="outline"><Bell className="h-3 w-3 mr-1" />Notifying</Badge>}
                        </div>
                        {ep.description && <p className="text-sm text-muted-foreground">{ep.description}</p>}
                        <div className="flex items-center gap-2 mt-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                            {`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/webhook-capture/${ep.endpoint_id}`}
                          </code>
                          <Button variant="outline" size="sm" onClick={() => copyUrl(ep.endpoint_id)}><Copy className="h-4 w-4" /></Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {requestCountByEndpoint(ep.endpoint_id)} requests captured
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEndpointConfig(ep)}>
                          <Settings className="h-4 w-4 mr-1" /> Configure
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => deleteEndpoint(ep.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {endpoints.length === 0 && <p className="text-muted-foreground text-center py-8">No endpoints yet.</p>}
            </div>
          </TabsContent>

          {/* Forwards / Retry Queue tab */}
          <TabsContent value="forwards">
            <RetryQueue endpoints={endpoints} userId={user.id} />
          </TabsContent>

          {/* Health Monitoring tab */}
          <TabsContent value="health">
            <HealthMonitoring endpoints={endpoints} userId={user.id} />
          </TabsContent>

          {/* Integrations tab */}
          <TabsContent value="integrations">
            <IntegrationTemplates userId={user.id} onEndpointCreated={loadEndpoints} />
          </TabsContent>

          {/* Analytics tab */}
          <TabsContent value="analytics">
            <AnalyticsCharts requests={requests} />
          </TabsContent>

          {/* Settings tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Email Notifications (SMTP)</CardTitle>
                    <CardDescription>Configure SMTP to receive email alerts</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {smtpConfig && (
                      <>
                        <Badge variant={smtpConfig.is_active ? "default" : "secondary"}>{smtpConfig.is_active ? "Active" : "Inactive"}</Badge>
                        <Button variant="outline" size="sm" onClick={sendTestEmail}>Test</Button>
                      </>
                    )}
                    <Dialog open={smtpDialogOpen} onOpenChange={setSmtpDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant={smtpConfig ? "outline" : "default"} size="sm">
                          <Settings className="h-4 w-4 mr-1" /> {smtpConfig ? "Edit" : "Add"} SMTP
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{smtpConfig ? "Edit" : "Add"} SMTP</DialogTitle>
                          <DialogDescription>Enter your SMTP server details</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div><Label>Host</Label><Input value={smtpForm.smtp_host} onChange={(e) => setSmtpForm((p) => ({ ...p, smtp_host: e.target.value }))} placeholder="smtp.gmail.com" /></div>
                            <div><Label>Port</Label><Input type="number" value={smtpForm.smtp_port} onChange={(e) => setSmtpForm((p) => ({ ...p, smtp_port: parseInt(e.target.value) || 587 }))} /></div>
                          </div>
                          <div><Label>Email</Label><Input type="email" value={smtpForm.smtp_email} onChange={(e) => setSmtpForm((p) => ({ ...p, smtp_email: e.target.value }))} /></div>
                          <div><Label>Username</Label><Input value={smtpForm.smtp_username} onChange={(e) => setSmtpForm((p) => ({ ...p, smtp_username: e.target.value }))} /></div>
                          <div><Label>Password</Label><Input type="password" value={smtpForm.smtp_password} onChange={(e) => setSmtpForm((p) => ({ ...p, smtp_password: e.target.value }))} /></div>
                          <div className="flex items-center space-x-2">
                            <Checkbox checked={smtpForm.use_tls} onCheckedChange={(c) => setSmtpForm((p) => ({ ...p, use_tls: c === true }))} />
                            <Label>Use TLS</Label>
                          </div>
                          <div className="flex justify-between">
                            {smtpConfig && <Button variant="destructive" onClick={deleteSmtpConfig}><Trash2 className="h-4 w-4 mr-1" /> Remove</Button>}
                            <Button className="ml-auto" onClick={saveSmtpConfig} disabled={smtpLoading || !smtpForm.smtp_host || !smtpForm.smtp_email}>
                              {smtpLoading ? "Saving..." : "Save"}
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
                  <div className="text-sm space-y-1">
                    <p><span className="text-muted-foreground">Host:</span> {smtpConfig.smtp_host}:{smtpConfig.smtp_port}</p>
                    <p><span className="text-muted-foreground">Email:</span> {smtpConfig.smtp_email}</p>
                    <p><span className="text-muted-foreground">TLS:</span> {smtpConfig.use_tls ? "Enabled" : "Disabled"}</p>
                  </div>
                </CardContent>
              )}
            </Card>

            <NotificationChannels channels={channels} userId={user.id} onRefresh={loadChannels} />
            <GoogleSheetsConfig userId={user.id} />
          </TabsContent>
        </Tabs>

        {/* Endpoint config dialog */}
        <Dialog open={!!endpointConfigDialog} onOpenChange={(o) => !o && setEndpointConfigDialog(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Configure: {endpointConfigDialog?.name}</DialogTitle>
              <DialogDescription>Set custom responses, API key auth, and notifications</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Response Status Code</Label>
                <Input type="number" value={endpointConfig.response_status_code} onChange={(e) => setEndpointConfig((p) => ({ ...p, response_status_code: parseInt(e.target.value) || 200 }))} />
              </div>
              <div>
                <Label>Response Body</Label>
                <Textarea value={endpointConfig.response_body} onChange={(e) => setEndpointConfig((p) => ({ ...p, response_body: e.target.value }))} className="font-mono text-sm h-24" />
              </div>
              <div>
                <Label>Response Headers (JSON)</Label>
                <Textarea value={endpointConfig.response_headers} onChange={(e) => setEndpointConfig((p) => ({ ...p, response_headers: e.target.value }))} className="font-mono text-sm h-20" />
              </div>
              <div>
                <Label>API Key (optional — senders must include in x-api-key header)</Label>
                <Input value={endpointConfig.api_key} onChange={(e) => setEndpointConfig((p) => ({ ...p, api_key: e.target.value }))} placeholder="Leave empty for no auth" />
              </div>
              <div className="flex items-center space-x-2">
                <Switch checked={endpointConfig.notify_on_receive} onCheckedChange={(c) => setEndpointConfig((p) => ({ ...p, notify_on_receive: c }))} />
                <Label>Notify on webhook receive (email + Slack/Discord)</Label>
              </div>
              <Button onClick={saveEndpointConfig} className="w-full">Save Configuration</Button>
              {endpointConfigDialog && (
                <WebhookTransforms endpointId={endpointConfigDialog.id} userId={user.id} />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Dashboard;
