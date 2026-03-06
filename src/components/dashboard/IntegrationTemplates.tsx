import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Copy, Check, ExternalLink, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Template {
  id: string;
  name: string;
  source: string;
  description: string;
  logo: string;
  color: string;
  steps: { title: string; detail: string }[];
  settingsUrl: string;
}

const templates: Template[] = [
  {
    id: "typeform",
    name: "New Form Submission",
    source: "Typeform",
    description: "Get notified every time someone fills out your Typeform. See their answers instantly in your dashboard.",
    logo: "https://cdn.brandfetch.io/idMPbPe9eU/w/400/h/400/theme/dark/icon.jpeg",
    color: "hsl(var(--primary))",
    steps: [
      { title: "Copy your webhook URL", detail: "Click the button below to copy it to your clipboard." },
      { title: "Open Typeform", detail: "Go to your form → Connect → Webhooks." },
      { title: "Paste the URL", detail: "Click \"Add a webhook\" and paste your URL. Toggle it on." },
    ],
    settingsUrl: "https://admin.typeform.com",
  },
  {
    id: "stripe",
    name: "Payment Received",
    source: "Stripe",
    description: "Track every payment, subscription change, and refund from Stripe in real time.",
    logo: "https://cdn.brandfetch.io/idxAg10C0L/w/400/h/400/theme/dark/icon.jpeg",
    color: "#635BFF",
    steps: [
      { title: "Copy your webhook URL", detail: "Click the button below to copy it to your clipboard." },
      { title: "Open Stripe Dashboard", detail: "Go to Developers → Webhooks → Add endpoint." },
      { title: "Paste and choose events", detail: "Paste your URL and select the events you want (e.g. payment_intent.succeeded)." },
    ],
    settingsUrl: "https://dashboard.stripe.com/webhooks",
  },
  {
    id: "shopify",
    name: "New Order Placed",
    source: "Shopify",
    description: "Receive alerts for every new order, fulfillment, or customer action in your Shopify store.",
    logo: "https://cdn.brandfetch.io/id2S-38Pfa/w/400/h/400/theme/dark/icon.jpeg",
    color: "#96BF48",
    steps: [
      { title: "Copy your webhook URL", detail: "Click the button below to copy it to your clipboard." },
      { title: "Open Shopify Admin", detail: "Go to Settings → Notifications → Webhooks." },
      { title: "Create webhook", detail: "Click \"Create webhook,\" choose an event (e.g. Order creation), and paste your URL." },
    ],
    settingsUrl: "https://admin.shopify.com",
  },
  {
    id: "calendly",
    name: "Meeting Booked",
    source: "Calendly",
    description: "Know the moment someone books, reschedules, or cancels a meeting on your Calendly.",
    logo: "https://cdn.brandfetch.io/idS4SMqLs-/w/400/h/400/theme/dark/icon.jpeg",
    color: "#006BFF",
    steps: [
      { title: "Copy your webhook URL", detail: "Click the button below to copy it to your clipboard." },
      { title: "Open Calendly", detail: "Go to Integrations → Webhooks (or use their API)." },
      { title: "Subscribe to events", detail: "Add your URL and select events like invitee.created." },
    ],
    settingsUrl: "https://calendly.com/integrations",
  },
  {
    id: "gumroad",
    name: "New Sale",
    source: "Gumroad",
    description: "Get instant updates whenever someone buys your product on Gumroad.",
    logo: "https://cdn.brandfetch.io/idMMapJMVq/w/400/h/400/theme/dark/icon.jpeg",
    color: "#FF90E8",
    steps: [
      { title: "Copy your webhook URL", detail: "Click the button below to copy it to your clipboard." },
      { title: "Open Gumroad Settings", detail: "Go to Settings → Advanced → Notification URL." },
      { title: "Paste the URL", detail: "Paste your webhook URL into the Ping field and save." },
    ],
    settingsUrl: "https://app.gumroad.com/settings",
  },
];

interface IntegrationTemplatesProps {
  userId: string;
  onEndpointCreated: () => void;
}

export function IntegrationTemplates({ userId, onEndpointCreated }: IntegrationTemplatesProps) {
  const [setupDialog, setSetupDialog] = useState<{ template: Template; endpointId: string } | null>(null);
  const [creating, setCreating] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const useTemplate = async (template: Template) => {
    setCreating(template.id);
    const endpointId = crypto.randomUUID().slice(0, 8);
    const { error } = await (supabase as any).from("webhook_endpoints").insert({
      name: `${template.source} — ${template.name}`,
      endpoint_id: endpointId,
      description: template.description,
      user_id: userId,
      notify_on_receive: true,
    });

    if (error) {
      toast({ title: "Something went wrong", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Endpoint ready!", description: `Your ${template.source} webhook is set up.` });
      onEndpointCreated();
      setSetupDialog({ template, endpointId });
    }
    setCreating(null);
  };

  const getWebhookUrl = (endpointId: string) =>
    `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/webhook-capture/${endpointId}`;

  const copyUrl = (endpointId: string) => {
    navigator.clipboard.writeText(getWebhookUrl(endpointId));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "URL copied!" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Connect Your Apps</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Pick an app below and we'll create a ready-to-use webhook for you — no coding required.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((t) => (
          <Card key={t.id} className="group hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <img
                  src={t.logo}
                  alt={`${t.source} logo`}
                  className="h-10 w-10 rounded-lg object-cover"
                  loading="lazy"
                />
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <Badge variant="secondary" className="mt-1 text-xs">{t.source}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <CardDescription className="text-sm leading-relaxed">
                {t.description}
              </CardDescription>
              <Button
                className="w-full"
                onClick={() => useTemplate(t)}
                disabled={creating === t.id}
              >
                {creating === t.id ? (
                  "Setting up..."
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Use Template
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Setup guide dialog */}
      <Dialog open={!!setupDialog} onOpenChange={(o) => !o && setSetupDialog(null)}>
        {setupDialog && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <img
                  src={setupDialog.template.logo}
                  alt={`${setupDialog.template.source} logo`}
                  className="h-10 w-10 rounded-lg object-cover"
                />
                <div>
                  <DialogTitle>Set Up {setupDialog.template.source}</DialogTitle>
                  <DialogDescription>Follow these simple steps to finish connecting.</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Webhook URL box */}
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Your Webhook URL</p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-background px-2 py-1.5 rounded flex-1 truncate border">
                  {getWebhookUrl(setupDialog.endpointId)}
                </code>
                <Button variant="outline" size="sm" onClick={() => copyUrl(setupDialog.endpointId)}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-4 mt-2">
              {setupDialog.template.steps.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{step.title}</p>
                    <p className="text-sm text-muted-foreground">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <Button variant="outline" className="w-full mt-2" asChild>
              <a href={setupDialog.template.settingsUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open {setupDialog.template.source} Settings
              </a>
            </Button>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
