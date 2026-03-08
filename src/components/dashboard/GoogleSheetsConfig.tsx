import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FileSpreadsheet, Settings, Trash2, Upload, ExternalLink } from "lucide-react";

interface Props {
  userId: string;
}

interface SheetsConfig {
  id: string;
  sheet_url: string;
  service_account_key: string;
  auto_push: boolean;
  is_active: boolean;
}

export function GoogleSheetsConfig({ userId }: Props) {
  const [config, setConfig] = useState<SheetsConfig | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [form, setForm] = useState({
    sheet_url: "",
    service_account_key: "",
    auto_push: false,
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadConfig();
  }, [userId]);

  const loadConfig = async () => {
    const { data } = await (supabase as any)
      .from("google_sheets_config")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (data) {
      setConfig(data);
      setForm({
        sheet_url: data.sheet_url,
        service_account_key: data.service_account_key,
        auto_push: data.auto_push,
      });
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      // Validate JSON key
      try {
        const parsed = JSON.parse(form.service_account_key);
        if (!parsed.client_email || !parsed.private_key) {
          throw new Error("Missing client_email or private_key");
        }
      } catch (e: any) {
        toast({ title: "Invalid Service Account Key", description: e.message, variant: "destructive" });
        setSaving(false);
        return;
      }

      // Validate sheet URL
      if (!form.sheet_url.includes("docs.google.com/spreadsheets")) {
        toast({ title: "Invalid Sheet URL", description: "Must be a Google Sheets URL", variant: "destructive" });
        setSaving(false);
        return;
      }

      if (config) {
        const { error } = await (supabase as any)
          .from("google_sheets_config")
          .update({ sheet_url: form.sheet_url, service_account_key: form.service_account_key, auto_push: form.auto_push })
          .eq("id", config.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("google_sheets_config")
          .insert({ user_id: userId, sheet_url: form.sheet_url, service_account_key: form.service_account_key, auto_push: form.auto_push });
        if (error) throw error;
      }

      toast({ title: "Google Sheets config saved!" });
      setDialogOpen(false);
      loadConfig();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteConfig = async () => {
    if (!config) return;
    await (supabase as any).from("google_sheets_config").delete().eq("id", config.id);
    setConfig(null);
    setForm({ sheet_url: "", service_account_key: "", auto_push: false });
    toast({ title: "Google Sheets config removed" });
  };

  const pushNow = async () => {
    setPushing(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/push-to-sheets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({}),
      });
      const result = await res.json();
      if (res.ok) {
        toast({ title: "Pushed to Google Sheets!", description: `${result.rows_pushed} rows appended` });
      } else {
        toast({ title: "Push failed", description: result.error, variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setPushing(false);
    }
  };

  // Extract service account email for display
  let serviceEmail = "";
  if (config?.service_account_key) {
    try {
      serviceEmail = JSON.parse(config.service_account_key).client_email || "";
    } catch {}
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" /> Google Sheets Integration
            </CardTitle>
            <CardDescription>Push webhook data directly to a Google Sheet</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {config && (
              <>
                <Badge variant={config.is_active ? "default" : "secondary"}>
                  {config.auto_push ? "Auto-push" : "Manual"}
                </Badge>
                <Button variant="outline" size="sm" onClick={pushNow} disabled={pushing}>
                  <Upload className="h-4 w-4 mr-1" /> {pushing ? "Pushing..." : "Push Now"}
                </Button>
              </>
            )}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant={config ? "outline" : "default"} size="sm">
                  <Settings className="h-4 w-4 mr-1" /> {config ? "Edit" : "Setup"}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{config ? "Edit" : "Setup"} Google Sheets</DialogTitle>
                  <DialogDescription>
                    Connect your Google Sheet to automatically receive webhook data.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Google Sheet URL</Label>
                    <Input
                      value={form.sheet_url}
                      onChange={(e) => setForm((p) => ({ ...p, sheet_url: e.target.value }))}
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Share the sheet with the service account email (Editor access)
                    </p>
                  </div>
                  <div>
                    <Label>Service Account JSON Key</Label>
                    <Textarea
                      value={form.service_account_key}
                      onChange={(e) => setForm((p) => ({ ...p, service_account_key: e.target.value }))}
                      placeholder='Paste your full JSON key here...'
                      className="font-mono text-xs h-32"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Get this from{" "}
                      <a
                        href="https://console.cloud.google.com/iam-admin/serviceaccounts"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline inline-flex items-center gap-0.5"
                      >
                        Google Cloud Console <ExternalLink className="h-3 w-3" />
                      </a>
                      {" "}→ Create Key → JSON
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={form.auto_push}
                      onCheckedChange={(c) => setForm((p) => ({ ...p, auto_push: c }))}
                    />
                    <Label>Auto-push new webhooks to sheet</Label>
                  </div>
                  <div className="flex justify-between">
                    {config && (
                      <Button variant="destructive" size="sm" onClick={deleteConfig}>
                        <Trash2 className="h-4 w-4 mr-1" /> Remove
                      </Button>
                    )}
                    <Button
                      className="ml-auto"
                      onClick={saveConfig}
                      disabled={saving || !form.sheet_url || !form.service_account_key}
                    >
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      {config && (
        <CardContent>
          <div className="text-sm space-y-1">
            <p>
              <span className="text-muted-foreground">Sheet:</span>{" "}
              <a href={config.sheet_url} target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-0.5">
                Open Sheet <ExternalLink className="h-3 w-3" />
              </a>
            </p>
            {serviceEmail && (
              <p><span className="text-muted-foreground">Service Account:</span> {serviceEmail}</p>
            )}
            <p><span className="text-muted-foreground">Auto-push:</span> {config.auto_push ? "Enabled" : "Disabled"}</p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
