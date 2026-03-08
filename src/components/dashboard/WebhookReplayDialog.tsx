import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Send, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  webhookId: string;
  originalMethod: string;
  originalHeaders: any;
  originalBody: any;
}

export function WebhookReplayDialog({ webhookId, originalMethod, originalHeaders, originalBody }: Props) {
  const [forwardUrl, setForwardUrl] = useState("");
  const [customMethod, setCustomMethod] = useState(originalMethod || "POST");
  const [customHeaders, setCustomHeaders] = useState(JSON.stringify(originalHeaders || {}, null, 2));
  const [customBody, setCustomBody] = useState(
    typeof originalBody === "string" ? originalBody : JSON.stringify(originalBody || {}, null, 2)
  );
  const [forwarding, setForwarding] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [response, setResponse] = useState<{ status: number; body: string } | null>(null);
  const { toast } = useToast();

  const forward = async () => {
    if (!forwardUrl) return;
    setForwarding(true);
    setResponse(null);
    try {
      let parsedHeaders: any = {};
      try { parsedHeaders = JSON.parse(customHeaders); } catch {}
      let parsedBody: any = null;
      try { parsedBody = JSON.parse(customBody); } catch { parsedBody = customBody; }

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/webhook-forward`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          webhook_id: webhookId, forward_url: forwardUrl,
          custom_method: customMethod, custom_headers: parsedHeaders, custom_body: parsedBody,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        setResponse({ status: result.forward_status, body: result.forward_response });
        toast({ title: "Forwarded!", description: `Status: ${result.forward_status}` });
      } else {
        toast({ title: "Forward failed", description: result.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setForwarding(false);
    }
  };

  return (
    <div className="border-t pt-4 space-y-3">
      <Label className="text-sm font-semibold">Forward / Replay</Label>
      <div className="flex gap-2">
        <Input placeholder="https://your-server.com/webhook" value={forwardUrl} onChange={(e) => setForwardUrl(e.target.value)} className="flex-1" />
        <Button onClick={forward} disabled={forwarding || !forwardUrl} size="sm">
          <Send className="h-4 w-4 mr-1" /> {forwarding ? "Sending..." : "Forward"}
        </Button>
      </div>

      <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {showAdvanced ? "Hide" : "Show"} advanced options (edit method, headers, body)
      </button>

      {showAdvanced && (
        <div className="space-y-3 pl-2 border-l-2 border-muted">
          <div>
            <Label className="text-xs">Method</Label>
            <Select value={customMethod} onValueChange={setCustomMethod}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Headers (JSON)</Label>
            <Textarea value={customHeaders} onChange={(e) => setCustomHeaders(e.target.value)} className="font-mono text-xs h-24" />
          </div>
          <div>
            <Label className="text-xs">Body</Label>
            <Textarea value={customBody} onChange={(e) => setCustomBody(e.target.value)} className="font-mono text-xs h-32" />
          </div>
        </div>
      )}

      {response && (
        <div className="p-3 bg-muted rounded-lg space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">Response</span>
            <Badge variant={response.status < 400 ? "default" : "destructive"} className="text-xs">{response.status}</Badge>
          </div>
          <pre className="text-xs overflow-auto max-h-32 whitespace-pre-wrap">{response.body}</pre>
        </div>
      )}
    </div>
  );
}
