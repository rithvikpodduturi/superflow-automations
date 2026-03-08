import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Wand2, Filter, Map, FileCode } from "lucide-react";

interface Transform {
  id: string;
  endpoint_id: string;
  user_id: string;
  name: string;
  transform_type: string;
  transform_config: any;
  is_active: boolean;
  execution_order: number;
}

interface Props {
  endpointId: string;
  userId: string;
}

const TRANSFORM_TYPES = [
  { value: "field_map", label: "Field Map", icon: Map, description: "Pick and rename fields from the payload" },
  { value: "filter", label: "Filter", icon: Filter, description: "Only store webhooks matching conditions" },
  { value: "template", label: "Template", icon: FileCode, description: "Reshape the body using a JSON template" },
];

export function WebhookTransforms({ endpointId, userId }: Props) {
  const [transforms, setTransforms] = useState<Transform[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransform, setEditingTransform] = useState<Transform | null>(null);
  const [form, setForm] = useState({ name: "", transform_type: "field_map", config: "{}" });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadTransforms(); }, [endpointId]);

  const loadTransforms = async () => {
    const { data } = await (supabase as any).from("webhook_transforms").select("*").eq("endpoint_id", endpointId).order("execution_order");
    setTransforms(data || []);
  };

  const openCreate = () => {
    setEditingTransform(null);
    setForm({ name: "", transform_type: "field_map", config: getDefaultConfig("field_map") });
    setDialogOpen(true);
  };

  const openEdit = (t: Transform) => {
    setEditingTransform(t);
    setForm({ name: t.name, transform_type: t.transform_type, config: JSON.stringify(t.transform_config, null, 2) });
    setDialogOpen(true);
  };

  const getDefaultConfig = (type: string) => {
    if (type === "field_map") return JSON.stringify({ mappings: [{ from: "data.email", to: "email" }] }, null, 2);
    if (type === "filter") return JSON.stringify({ field: "event", operator: "equals", value: "payment.completed" }, null, 2);
    return JSON.stringify({ template: { event: "{{event}}", user: "{{data.user_id}}" } }, null, 2);
  };

  const saveTransform = async () => {
    let parsedConfig: any;
    try { parsedConfig = JSON.parse(form.config); } catch {
      toast({ title: "Invalid JSON config", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editingTransform) {
        const { error } = await (supabase as any).from("webhook_transforms").update({
          name: form.name, transform_type: form.transform_type, transform_config: parsedConfig,
        }).eq("id", editingTransform.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("webhook_transforms").insert({
          endpoint_id: endpointId, user_id: userId, name: form.name,
          transform_type: form.transform_type, transform_config: parsedConfig,
          execution_order: transforms.length,
        });
        if (error) throw error;
      }
      toast({ title: editingTransform ? "Transform updated!" : "Transform created!" });
      setDialogOpen(false);
      loadTransforms();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (t: Transform) => {
    await (supabase as any).from("webhook_transforms").update({ is_active: !t.is_active }).eq("id", t.id);
    loadTransforms();
  };

  const deleteTransform = async (id: string) => {
    await (supabase as any).from("webhook_transforms").delete().eq("id", id);
    loadTransforms();
    toast({ title: "Transform deleted" });
  };

  const typeInfo = (type: string) => TRANSFORM_TYPES.find((t) => t.value === type);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Wand2 className="h-5 w-5" /> Transforms</CardTitle>
            <CardDescription>Transform webhook data before storage</CardDescription>
          </div>
          <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Add</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {transforms.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No transforms configured. Add one to reshape or filter incoming webhooks.</p>
        )}
        {transforms.map((t) => {
          const info = typeInfo(t.transform_type);
          const Icon = info?.icon || Wand2;
          return (
            <div key={t.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-xs">{info?.label}</Badge>
                    <span className="text-xs text-muted-foreground">Order: {t.execution_order}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={t.is_active} onCheckedChange={() => toggleActive(t)} />
                <Button variant="outline" size="sm" onClick={() => openEdit(t)}>Edit</Button>
                <Button variant="outline" size="sm" onClick={() => deleteTransform(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          );
        })}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingTransform ? "Edit" : "Create"} Transform</DialogTitle>
              <DialogDescription>Define how incoming webhook data should be transformed</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Extract email field" /></div>
              <div>
                <Label>Type</Label>
                <Select value={form.transform_type} onValueChange={(v) => setForm((p) => ({ ...p, transform_type: v, config: getDefaultConfig(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRANSFORM_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <span className="flex items-center gap-2">{t.label} — <span className="text-muted-foreground text-xs">{t.description}</span></span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Configuration (JSON)</Label>
                <Textarea value={form.config} onChange={(e) => setForm((p) => ({ ...p, config: e.target.value }))} className="font-mono text-sm h-40" />
                <p className="text-xs text-muted-foreground mt-1">
                  {form.transform_type === "field_map" && 'Format: { "mappings": [{ "from": "data.email", "to": "email" }] }'}
                  {form.transform_type === "filter" && 'Format: { "field": "event", "operator": "equals|contains|exists", "value": "..." }'}
                  {form.transform_type === "template" && 'Format: { "template": { "key": "{{body.field}}" } } — use {{field}} placeholders'}
                </p>
              </div>
              <Button onClick={saveTransform} disabled={saving || !form.name} className="w-full">
                {saving ? "Saving..." : editingTransform ? "Update Transform" : "Create Transform"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
