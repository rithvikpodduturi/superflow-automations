import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Copy, Check, ExternalLink, Zap, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AppTemplate {
  id: string;
  name: string;
  source: string;
  tagline: string;
  description: string;
  logo: string;
  category: string;
  steps: { title: string; detail: string; screenshotPlaceholder?: string }[];
  settingsUrl: string;
}

const apps: AppTemplate[] = [
  {
    id: "typeform",
    name: "Form Submissions",
    source: "Typeform",
    tagline: "Get notified when someone fills out your form",
    description: "Automatically receive a notification every time a visitor submits your Typeform. See their name, email, and answers right in your dashboard — no setup skills needed.",
    logo: "https://cdn.brandfetch.io/idMPbPe9eU/w/400/h/400/theme/dark/icon.jpeg",
    category: "Forms",
    steps: [
      { title: "Copy your unique link", detail: "Click the copy button below. This is the special link that connects Typeform to your dashboard.", screenshotPlaceholder: "Copy button and link preview" },
      { title: "Open your Typeform settings", detail: "Log in to Typeform, open the form you want to connect, and click \"Connect\" in the top menu.", screenshotPlaceholder: "Typeform Connect menu" },
      { title: "Add a new connection", detail: "Click \"Webhooks\" in the sidebar, then \"Add a webhook\". Paste the link you copied and toggle it on. That's it!", screenshotPlaceholder: "Typeform webhook toggle" },
    ],
    settingsUrl: "https://admin.typeform.com",
  },
  {
    id: "stripe",
    name: "Payments & Subscriptions",
    source: "Stripe",
    tagline: "Track payments and subscription changes instantly",
    description: "Know the moment someone pays you, upgrades, cancels, or requests a refund. Every transaction from Stripe shows up in your dashboard within seconds.",
    logo: "https://cdn.brandfetch.io/idxAg10C0L/w/400/h/400/theme/dark/icon.jpeg",
    category: "Payments",
    steps: [
      { title: "Copy your unique link", detail: "Click the copy button below to grab your personal link.", screenshotPlaceholder: "Copy button and link preview" },
      { title: "Go to Stripe's developer area", detail: "Log in to Stripe and click \"Developers\" in the sidebar, then choose \"Webhooks\".", screenshotPlaceholder: "Stripe Developers menu" },
      { title: "Add your link", detail: "Click \"Add endpoint\", paste your link, and pick the events you care about (like \"Payment succeeded\"). Click \"Add endpoint\" to finish.", screenshotPlaceholder: "Stripe add endpoint form" },
    ],
    settingsUrl: "https://dashboard.stripe.com/webhooks",
  },
  {
    id: "shopify",
    name: "New Orders",
    source: "Shopify",
    tagline: "Get alerts for every new order in your store",
    description: "Receive instant updates whenever a customer places an order, a shipment goes out, or a return is initiated. Stay on top of your store without refreshing Shopify.",
    logo: "https://cdn.brandfetch.io/id2S-38Pfa/w/400/h/400/theme/dark/icon.jpeg",
    category: "E-commerce",
    steps: [
      { title: "Copy your unique link", detail: "Click the copy button below to save your personal link.", screenshotPlaceholder: "Copy button and link preview" },
      { title: "Open Shopify notifications", detail: "In your Shopify admin, go to Settings → Notifications → scroll to the bottom.", screenshotPlaceholder: "Shopify Settings navigation" },
      { title: "Create a notification", detail: "Click \"Create webhook\", pick an event (like \"Order creation\"), set the format to JSON, and paste your link. Hit Save.", screenshotPlaceholder: "Shopify create webhook dialog" },
    ],
    settingsUrl: "https://admin.shopify.com",
  },
  {
    id: "calendly",
    name: "Meeting Bookings",
    source: "Calendly",
    tagline: "Know instantly when someone books a meeting",
    description: "Get notified the moment someone schedules, reschedules, or cancels a meeting on your Calendly. Never miss a booking again.",
    logo: "https://cdn.brandfetch.io/idS4SMqLs-/w/400/h/400/theme/dark/icon.jpeg",
    category: "Scheduling",
    steps: [
      { title: "Copy your unique link", detail: "Click the copy button below.", screenshotPlaceholder: "Copy button and link preview" },
      { title: "Open Calendly integrations", detail: "Log in to Calendly, go to the \"Integrations\" page from the main menu.", screenshotPlaceholder: "Calendly integrations page" },
      { title: "Add your link", detail: "Find \"Webhooks\", click \"Add webhook subscription\", paste your link, and choose the events you want (like \"Invitee created\").", screenshotPlaceholder: "Calendly webhook subscription form" },
    ],
    settingsUrl: "https://calendly.com/integrations",
  },
  {
    id: "gumroad",
    name: "Product Sales",
    source: "Gumroad",
    tagline: "Get updates when someone buys your product",
    description: "Instantly know whenever someone purchases your digital product on Gumroad. See the buyer's name and what they bought.",
    logo: "https://cdn.brandfetch.io/idMMapJMVq/w/400/h/400/theme/dark/icon.jpeg",
    category: "E-commerce",
    steps: [
      { title: "Copy your unique link", detail: "Click the copy button below.", screenshotPlaceholder: "Copy button and link preview" },
      { title: "Open Gumroad settings", detail: "Log in to Gumroad, click your profile icon, and go to Settings → Advanced.", screenshotPlaceholder: "Gumroad advanced settings" },
      { title: "Paste your link", detail: "Find the \"Notification URL\" (or \"Ping\") field, paste your link there, and click Save.", screenshotPlaceholder: "Gumroad notification URL field" },
    ],
    settingsUrl: "https://app.gumroad.com/settings",
  },
  {
    id: "woocommerce",
    name: "Store Orders",
    source: "WooCommerce",
    tagline: "Track orders from your WordPress store",
    description: "Receive real-time alerts when customers place orders, make payments, or when order statuses change in your WooCommerce store.",
    logo: "https://cdn.brandfetch.io/idTHPHNSty/w/400/h/400/theme/dark/icon.jpeg",
    category: "E-commerce",
    steps: [
      { title: "Copy your unique link", detail: "Click the copy button below.", screenshotPlaceholder: "Copy button and link preview" },
      { title: "Open WooCommerce settings", detail: "In your WordPress admin, go to WooCommerce → Settings → Advanced → Webhooks.", screenshotPlaceholder: "WooCommerce settings navigation" },
      { title: "Add a new notification", detail: "Click \"Add webhook\", give it a name, set Status to \"Active\", pick a topic (like \"Order created\"), and paste your link in the Delivery URL field. Click Save.", screenshotPlaceholder: "WooCommerce webhook form" },
    ],
    settingsUrl: "",
  },
  {
    id: "convertkit",
    name: "New Subscribers",
    source: "ConvertKit",
    tagline: "Know when someone joins your email list",
    description: "Get notified the moment someone subscribes to your newsletter or completes a sequence in ConvertKit. Great for tracking your audience growth.",
    logo: "https://cdn.brandfetch.io/idR3_fef2q/w/400/h/400/theme/dark/icon.jpeg",
    category: "Email",
    steps: [
      { title: "Copy your unique link", detail: "Click the copy button below.", screenshotPlaceholder: "Copy button and link preview" },
      { title: "Open ConvertKit automations", detail: "Log in to ConvertKit, go to Automations → Rules.", screenshotPlaceholder: "ConvertKit automations page" },
      { title: "Create a rule", detail: "Click \"Add Rule\". Set the trigger (like \"Subscribes to a form\") and the action to \"Send webhook\". Paste your link and save.", screenshotPlaceholder: "ConvertKit rule builder" },
    ],
    settingsUrl: "https://app.convertkit.com/automations",
  },
  {
    id: "mailchimp",
    name: "Audience Activity",
    source: "Mailchimp",
    tagline: "Track subscribes, unsubscribes, and campaign activity",
    description: "Stay informed when people join or leave your Mailchimp audience, or when campaigns are sent. Perfect for keeping your team in the loop.",
    logo: "https://cdn.brandfetch.io/id1Unpy1YD/w/400/h/400/theme/dark/icon.jpeg",
    category: "Email",
    steps: [
      { title: "Copy your unique link", detail: "Click the copy button below.", screenshotPlaceholder: "Copy button and link preview" },
      { title: "Open Mailchimp audience settings", detail: "In Mailchimp, go to Audience → Settings → Webhooks.", screenshotPlaceholder: "Mailchimp audience settings" },
      { title: "Add your link", detail: "Click \"Create New Webhook\", paste your link in the URL field, choose which events to send (like subscribes and unsubscribes), and click Save.", screenshotPlaceholder: "Mailchimp webhook settings" },
    ],
    settingsUrl: "https://mailchimp.com",
  },
];

const categories = ["All", ...Array.from(new Set(apps.map((a) => a.category)))];

interface IntegrationTemplatesProps {
  userId: string;
  onEndpointCreated: () => void;
}

export function IntegrationTemplates({ userId, onEndpointCreated }: IntegrationTemplatesProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [setupDialog, setSetupDialog] = useState<{ app: AppTemplate; endpointId: string } | null>(null);
  const [creating, setCreating] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const { toast } = useToast();

  const filtered = apps.filter((a) => {
    const matchesSearch =
      a.source.toLowerCase().includes(search.toLowerCase()) ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.tagline.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "All" || a.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const connectApp = async (app: AppTemplate) => {
    setCreating(app.id);
    const endpointId = crypto.randomUUID().slice(0, 8);
    const { error } = await (supabase as any).from("webhook_endpoints").insert({
      name: `${app.source} — ${app.name}`,
      endpoint_id: endpointId,
      description: app.tagline,
      user_id: userId,
      notify_on_receive: true,
    });

    if (error) {
      toast({ title: "Something went wrong", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Connected!", description: `Your ${app.source} connection is ready.` });
      onEndpointCreated();
      setActiveStep(0);
      setSetupDialog({ app, endpointId });
    }
    setCreating(null);
  };

  const getWebhookUrl = (endpointId: string) =>
    `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/webhook-capture/${endpointId}`;

  const copyUrl = (endpointId: string) => {
    navigator.clipboard.writeText(getWebhookUrl(endpointId));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Link copied!" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Connect Your Tools</h2>
        <p className="text-muted-foreground mt-1">
          Pick an app and we'll give you a unique link to connect it — no coding needed.
        </p>
      </div>

      {/* Search & filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search apps…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={activeCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory(cat)}
              className="text-xs"
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* App grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">No apps found</p>
          <p className="text-sm mt-1">Try a different search term or category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((app) => (
            <Card key={app.id} className="group hover:shadow-lg transition-all hover:border-primary/30">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <img
                    src={app.logo}
                    alt={`${app.source} logo`}
                    className="h-11 w-11 rounded-xl object-cover ring-1 ring-border"
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base leading-tight">{app.source}</CardTitle>
                    <Badge variant="secondary" className="mt-1 text-[10px] font-normal">{app.category}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <CardDescription className="text-sm leading-relaxed min-h-[40px]">
                  {app.tagline}
                </CardDescription>
                <Button
                  className="w-full"
                  onClick={() => connectApp(app)}
                  disabled={creating === app.id}
                >
                  {creating === app.id ? (
                    "Setting up…"
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Connect
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Setup guide dialog */}
      <Dialog open={!!setupDialog} onOpenChange={(o) => !o && setSetupDialog(null)}>
        {setupDialog && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <img
                  src={setupDialog.app.logo}
                  alt={`${setupDialog.app.source} logo`}
                  className="h-11 w-11 rounded-xl object-cover ring-1 ring-border"
                />
                <div>
                  <DialogTitle className="text-lg">Connect {setupDialog.app.source}</DialogTitle>
                  <DialogDescription>Follow these simple steps — it only takes a minute.</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Unique link box */}
            <div className="bg-muted rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wider">Your Unique Link</p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-background px-3 py-2 rounded-lg flex-1 truncate border font-mono">
                  {getWebhookUrl(setupDialog.endpointId)}
                </code>
                <Button variant="outline" size="sm" onClick={() => copyUrl(setupDialog.endpointId)} className="shrink-0">
                  {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Step-by-step guide */}
            <div className="space-y-3 mt-1">
              {setupDialog.app.steps.map((step, i) => (
                <button
                  key={i}
                  onClick={() => setActiveStep(i)}
                  className={`w-full text-left rounded-xl border p-4 transition-all ${
                    activeStep === i
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/20"
                  }`}
                >
                  <div className="flex gap-3">
                    <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      activeStep === i
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{step.title}</p>
                      {activeStep === i && (
                        <div className="mt-2 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                          <p className="text-sm text-muted-foreground leading-relaxed">{step.detail}</p>
                          {step.screenshotPlaceholder && (
                            <div className="bg-muted rounded-lg h-28 flex items-center justify-center border border-dashed border-border">
                              <p className="text-xs text-muted-foreground">{step.screenshotPlaceholder}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Open app settings */}
            {setupDialog.app.settingsUrl && (
              <Button variant="outline" className="w-full mt-1" asChild>
                <a href={setupDialog.app.settingsUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open {setupDialog.app.source} Settings
                </a>
              </Button>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
