import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Plus, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface NotificationChannel {
  id: string;
  channel_type: string;
  webhook_url: string;
  channel_name: string | null;
  is_active: boolean;
}

interface Props {
  channels: NotificationChannel[];
  userId: string;
  onRefresh: () => void;
}

export function NotificationChannels({ channels, userId, onRefresh }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ channel_type: "slack", webhook_url: "", channel_name: "" });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await (supabase as any).from("notification_channels").insert({
        user_id: userId,
        channel_type: form.channel_type,
        webhook_url: form.webhook_url,
        channel_name: form.channel_name || null,
      });
      if (error) throw error;
      toast({ title: "Channel added!" });
      setForm({ channel_type: "slack", webhook_url: "", channel_name: "" });
      setDialogOpen(false);
      onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from("notification_channels").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Channel removed" });
      onRefresh();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" /> Notification Channels
            </CardTitle>
            <CardDescription>Send webhook alerts to Slack or Discord</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Channel</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Notification Channel</DialogTitle>
                <DialogDescription>Configure a Slack or Discord webhook to receive alerts</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Type</Label>
                  <Select value={form.channel_type} onValueChange={(v) => setForm((p) => ({ ...p, channel_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="slack">Slack</SelectItem>
                      <SelectItem value="discord">Discord</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Channel Name (optional)</Label>
                  <Input value={form.channel_name} onChange={(e) => setForm((p) => ({ ...p, channel_name: e.target.value }))} placeholder="#webhooks" />
                </div>
                <div>
                  <Label>Webhook URL</Label>
                  <Input value={form.webhook_url} onChange={(e) => setForm((p) => ({ ...p, webhook_url: e.target.value }))} placeholder="https://hooks.slack.com/..." />
                </div>
                <Button onClick={save} disabled={saving || !form.webhook_url} className="w-full">
                  {saving ? "Saving..." : "Save Channel"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      {channels.length > 0 && (
        <CardContent>
          <div className="space-y-2">
            {channels.map((ch) => (
              <div key={ch.id} className="flex items-center justify-between border rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{ch.channel_type}</Badge>
                  <span className="text-sm font-medium">{ch.channel_name || "Unnamed"}</span>
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">{ch.webhook_url}</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => remove(ch.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
