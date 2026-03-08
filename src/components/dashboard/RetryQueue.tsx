import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RefreshCw, Settings, RotateCcw, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WebhookEndpoint {
  id: string;
  name: string;
  endpoint_id: string;
}

interface ForwardConfig {
  id: string;
  endpoint_id: string;
  forward_url: string;
  is_active: boolean;
  max_retries: number;
  retry_delay_seconds: number;
  custom_headers: Record<string, string>;
}

interface WebhookForward {
  id: string;
  webhook_id: string;
  endpoint_id: string;
  forward_url: string;
  status: string;
  attempts: number;
  max_retries: number;
  next_retry_at: string | null;
  last_response_status: number | null;
  last_error: string | null;
  response_time_ms: number | null;
  created_at: string;
}

interface Props {
  endpoints: WebhookEndpoint[];
  userId: string;
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  pending: { icon: Clock, color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200", label: "Pending" },
  delivered: { icon: CheckCircle2, color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200", label: "Delivered" },
  failed: { icon: XCircle, color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", label: "Failed" },
  retrying: { icon: Loader2, color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", label: "Retrying" },
};

export function RetryQueue({ endpoints, userId }: Props) {
  const [forwards, setForwards] = useState<WebhookForward[]>([]);
  const [configs, setConfigs] = useState<ForwardConfig[]>([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>("all");
  const [configDialog, setConfigDialog] = useState<WebhookEndpoint | null>(null);
  const [configForm, setConfigForm] = useState({ forward_url: "", is_active: false, max_retries: 3, retry_delay_seconds: 30, custom_headers: "{}" });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadForwards();
    loadConfigs();
  }, [userId]);

  const loadForwards = async () => {
    let query = (supabase as any).from("webhook_forwards").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100);
    const { data } = await query;
    setForwards(data || []);
  };

  const loadConfigs = async () => {
    const { data } = await (supabase as any).from("forward_configs").select("*").eq("user_id", userId);
    setConfigs(data || []);
  };

  const openConfigDialog = (ep: WebhookEndpoint) => {
    const existing = configs.find((c) => c.endpoint_id === ep.id);
    setConfigDialog(ep);
    if (existing) {
      setConfigForm({
        forward_url: existing.forward_url,
        is_active: existing.is_active,
        max_retries: existing.max_retries,
        retry_delay_seconds: existing.retry_delay_seconds,
        custom_headers: JSON.stringify(existing.custom_headers || {}, null, 2),
      });
    } else {
      setConfigForm({ forward_url: "", is_active: false, max_retries: 3, retry_delay_seconds: 30, custom_headers: "{}" });
    }
  };

  const saveConfig = async () => {
    if (!configDialog) return;
    setLoading(true);
    let parsedHeaders = {};
    try { parsedHeaders = JSON.parse(configForm.custom_headers); } catch {}

    const existing = configs.find((c) => c.endpoint_id === configDialog.id);
    const payload = {
      endpoint_id: configDialog.id,
      user_id: userId,
      forward_url: configForm.forward_url,
      is_active: configForm.is_active,
      max_retries: configForm.max_retries,
      retry_delay_seconds: configForm.retry_delay_seconds,
      custom_headers: parsedHeaders,
    };

    const { error } = existing
      ? await (supabase as any).from("forward_configs").update(payload).eq("id", existing.id)
      : await (supabase as any).from("forward_configs").insert(payload);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Forward config saved!" });
      setConfigDialog(null);
      loadConfigs();
    }
    setLoading(false);
  };

  const manualRetry = async (forwardId: string) => {
    const { error } = await (supabase as any).from("webhook_forwards").update({ status: "retrying", next_retry_at: new Date().toISOString() }).eq("id", forwardId);
    if (!error) {
      toast({ title: "Queued for retry" });
      loadForwards();
    }
  };

  const filteredForwards = selectedEndpoint === "all" ? forwards : forwards.filter((f) => f.endpoint_id === selectedEndpoint);

  const stats = {
    delivered: forwards.filter((f) => f.status === "delivered").length,
    failed: forwards.filter((f) => f.status === "failed").length,
    retrying: forwards.filter((f) => f.status === "retrying").length,
    pending: forwards.filter((f) => f.status === "pending").length,
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(stats).map(([key, count]) => {
          const cfg = statusConfig[key];
          const Icon = cfg.icon;
          return (
            <Card key={key}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{cfg.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Forward configs per endpoint */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" /> Forward Configurations
          </CardTitle>
          <CardDescription>Configure automatic forwarding and retry settings per endpoint</CardDescription>
        </CardHeader>
        <CardContent>
          {endpoints.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No endpoints yet.</p>
          ) : (
            <div className="space-y-2">
              {endpoints.map((ep) => {
                const cfg = configs.find((c) => c.endpoint_id === ep.id);
                return (
                  <div key={ep.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{ep.name}</p>
                      {cfg ? (
                        <p className="text-xs text-muted-foreground">
                          → {cfg.forward_url} · {cfg.max_retries} retries · {cfg.retry_delay_seconds}s delay
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">No forwarding configured</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {cfg && (
                        <Badge variant={cfg.is_active ? "default" : "secondary"}>
                          {cfg.is_active ? "Active" : "Inactive"}
                        </Badge>
                      )}
                      <Button variant="outline" size="sm" onClick={() => openConfigDialog(ep)}>
                        <Settings className="h-3.5 w-3.5 mr-1" /> Configure
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery history */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" /> Delivery History
              </CardTitle>
              <CardDescription>Track forward attempts and retry status</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedEndpoint} onValueChange={setSelectedEndpoint}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by endpoint" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Endpoints</SelectItem>
                  {endpoints.map((ep) => (
                    <SelectItem key={ep.id} value={ep.id}>{ep.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={loadForwards}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredForwards.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No forward attempts yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Response</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredForwards.map((fwd) => {
                  const cfg = statusConfig[fwd.status] || statusConfig.pending;
                  const Icon = cfg.icon;
                  return (
                    <TableRow key={fwd.id}>
                      <TableCell>
                        <Badge variant="outline" className={`${cfg.color} flex items-center gap-1 w-fit`}>
                          <Icon className="h-3 w-3" /> {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded max-w-[200px] truncate block">{fwd.forward_url}</code>
                      </TableCell>
                      <TableCell className="text-sm">{fwd.attempts}/{fwd.max_retries}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {fwd.last_response_status ? `${fwd.last_response_status}` : fwd.last_error ? "Error" : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {fwd.response_time_ms ? `${fwd.response_time_ms}ms` : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(fwd.created_at).toLocaleString()}</TableCell>
                      <TableCell>
                        {(fwd.status === "failed") && (
                          <Button variant="outline" size="sm" onClick={() => manualRetry(fwd.id)} title="Retry">
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Config dialog */}
      <Dialog open={!!configDialog} onOpenChange={(o) => !o && setConfigDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Forward Config: {configDialog?.name}</DialogTitle>
            <DialogDescription>Configure automatic forwarding with retry for this endpoint</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Forward URL</Label>
              <Input value={configForm.forward_url} onChange={(e) => setConfigForm((p) => ({ ...p, forward_url: e.target.value }))} placeholder="https://your-api.com/webhook" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Max Retries</Label>
                <Input type="number" value={configForm.max_retries} onChange={(e) => setConfigForm((p) => ({ ...p, max_retries: parseInt(e.target.value) || 3 }))} />
              </div>
              <div>
                <Label>Retry Delay (seconds)</Label>
                <Input type="number" value={configForm.retry_delay_seconds} onChange={(e) => setConfigForm((p) => ({ ...p, retry_delay_seconds: parseInt(e.target.value) || 30 }))} />
              </div>
            </div>
            <div>
              <Label>Custom Headers (JSON)</Label>
              <Input value={configForm.custom_headers} onChange={(e) => setConfigForm((p) => ({ ...p, custom_headers: e.target.value }))} placeholder='{"Authorization": "Bearer ..."}' />
            </div>
            <div className="flex items-center space-x-2">
              <Switch checked={configForm.is_active} onCheckedChange={(c) => setConfigForm((p) => ({ ...p, is_active: c }))} />
              <Label>Enable automatic forwarding</Label>
            </div>
            <Button onClick={saveConfig} className="w-full" disabled={loading || !configForm.forward_url}>
              {loading ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
