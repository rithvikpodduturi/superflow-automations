import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Copy, Plus, Trash2, Eye } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface WebhookEndpoint {
  id: string
  name: string
  endpoint_id: string
  description: string
  is_active: boolean
  created_at: string
}

interface WebhookRequest {
  id: string
  url_path: string
  method: string
  headers: any
  body: any
  query_params: any
  source_ip: string
  user_agent: string
  content_type: string
  created_at: string
}

const Dashboard = () => {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([])
  const [requests, setRequests] = useState<WebhookRequest[]>([])
  const [newEndpoint, setNewEndpoint] = useState({ name: '', description: '' })
  const [selectedRequest, setSelectedRequest] = useState<WebhookRequest | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadEndpoints()
    loadRequests()

    // Subscribe to real-time updates
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
          setRequests(prev => [payload.new as WebhookRequest, ...prev])
          toast({
            title: "New webhook received!",
            description: `${payload.new.method} request to ${payload.new.url_path}`,
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const loadEndpoints = async () => {
    const { data, error } = await supabase
      .from('webhook_endpoints')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      toast({
        title: "Error loading endpoints",
        description: error.message,
        variant: "destructive"
      })
    } else {
      setEndpoints(data || [])
    }
  }

  const loadRequests = async () => {
    const { data, error } = await supabase
      .from('webhooks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      toast({
        title: "Error loading requests",
        description: error.message,
        variant: "destructive"
      })
    } else {
      setRequests(data || [])
    }
  }

  const createEndpoint = async () => {
    if (!newEndpoint.name) {
      toast({
        title: "Name required",
        description: "Please enter a name for the endpoint",
        variant: "destructive"
      })
      return
    }

    const endpointId = crypto.randomUUID().slice(0, 8)
    
    const { error } = await supabase
      .from('webhook_endpoints')
      .insert({
        name: newEndpoint.name,
        endpoint_id: endpointId,
        description: newEndpoint.description
      })

    if (error) {
      toast({
        title: "Error creating endpoint",
        description: error.message,
        variant: "destructive"
      })
    } else {
      toast({
        title: "Endpoint created!",
        description: "Your new webhook endpoint is ready to use",
      })
      setNewEndpoint({ name: '', description: '' })
      loadEndpoints()
    }
  }

  const copyWebhookUrl = (endpointId: string) => {
    const url = `https://hucfqmowvhusotacdyxt.supabase.co/functions/v1/webhook-capture/${endpointId}`
    navigator.clipboard.writeText(url)
    toast({
      title: "URL copied!",
      description: "Webhook URL copied to clipboard",
    })
  }

  const deleteEndpoint = async (id: string) => {
    const { error } = await supabase
      .from('webhook_endpoints')
      .delete()
      .eq('id', id)

    if (error) {
      toast({
        title: "Error deleting endpoint",
        description: error.message,
        variant: "destructive"
      })
    } else {
      toast({
        title: "Endpoint deleted",
        description: "Webhook endpoint removed successfully",
      })
      loadEndpoints()
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Webhook Dashboard</h1>
          <p className="text-muted-foreground">Manage your webhook endpoints and view incoming requests</p>
        </div>

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
                        https://hucfqmowvhusotacdyxt.supabase.co/functions/v1/webhook-capture/{endpoint.endpoint_id}
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

        {/* Recent Webhook Requests */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Webhook Requests</CardTitle>
            <CardDescription>
              {requests.length} request{requests.length !== 1 ? 's' : ''} captured
            </CardDescription>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No webhook requests yet. Send a POST request to one of your endpoints to see it here.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Method</TableHead>
                    <TableHead>Path</TableHead>
                    <TableHead>Source IP</TableHead>
                    <TableHead>Content Type</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <Badge variant={request.method === 'POST' ? 'default' : 'secondary'}>
                          {request.method}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {request.url_path}
                        </code>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {request.source_ip || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {request.content_type || 'N/A'}
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
                              <DialogTitle>Webhook Request Details</DialogTitle>
                              <DialogDescription>
                                {request.method} request to {request.url_path} at {new Date(request.created_at).toLocaleString()}
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
                              {request.body && (
                                <div>
                                  <Label>Body</Label>
                                  <Textarea
                                    value={typeof request.body === 'string' ? request.body : JSON.stringify(request.body, null, 2)}
                                    readOnly
                                    className="font-mono text-sm h-48"
                                  />
                                </div>
                              )}
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
        </Card>
      </div>
    </div>
  )
}

export default Dashboard
