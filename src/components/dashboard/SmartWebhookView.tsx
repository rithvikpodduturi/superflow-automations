import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  FileText,
  Calendar,
  ShoppingBag,
  Mail,
  DollarSign,
  Globe,
  User,
  Package,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

interface DetectedSource {
  name: string;
  icon: React.ReactNode;
  event: string;
  summary: string;
  details: { label: string; value: string }[];
  color: string;
}

function detectStripe(body: any): DetectedSource | null {
  if (!body?.type || !body?.data?.object || !body?.api_version) return null;
  const obj = body.data.object;
  const event = body.type as string;

  let summary = `Stripe event: ${event}`;
  const details: { label: string; value: string }[] = [
    { label: "Event", value: event },
    { label: "API Version", value: body.api_version },
  ];

  if (event.startsWith("payment_intent")) {
    const amount = obj.amount ? `$${(obj.amount / 100).toFixed(2)}` : "N/A";
    const currency = (obj.currency || "").toUpperCase();
    summary = `Payment ${obj.status || event.split(".")[1]} — ${amount} ${currency}`;
    details.push({ label: "Amount", value: `${amount} ${currency}` }, { label: "Status", value: obj.status || "unknown" });
    if (obj.receipt_email) details.push({ label: "Email", value: obj.receipt_email });
  } else if (event.startsWith("customer")) {
    summary = `Customer ${event.split(".").pop()} — ${obj.email || obj.name || obj.id}`;
    if (obj.email) details.push({ label: "Email", value: obj.email });
    if (obj.name) details.push({ label: "Name", value: obj.name });
  } else if (event.startsWith("invoice")) {
    const amount = obj.amount_due ? `$${(obj.amount_due / 100).toFixed(2)}` : "";
    summary = `Invoice ${event.split(".").pop()}${amount ? ` — ${amount}` : ""}`;
    if (obj.customer_email) details.push({ label: "Customer", value: obj.customer_email });
  } else if (event.startsWith("checkout.session")) {
    summary = `Checkout session ${event.split(".").pop()} — ${obj.customer_email || ""}`;
    if (obj.amount_total) details.push({ label: "Total", value: `$${(obj.amount_total / 100).toFixed(2)}` });
  }

  return { name: "Stripe", icon: <CreditCard className="h-5 w-5" />, event, summary, details, color: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300" };
}

function detectTypeform(body: any): DetectedSource | null {
  if (!body?.form_response && !body?.event_type?.includes("form_response")) return null;
  const fr = body.form_response || body;
  const answers = fr.answers || [];
  const hidden = fr.hidden || {};

  let name = "";
  let email = "";

  for (const a of answers) {
    const field = a.field?.ref || a.field?.id || "";
    if (a.type === "email" || field.includes("email")) email = a.email || a.text || "";
    if (a.type === "short_text" && (field.includes("name") || field.includes("first"))) name = a.text || "";
  }
  if (!name) name = hidden.name || hidden.first_name || "";
  if (!email) email = hidden.email || "";

  const formTitle = fr.definition?.title || body.form_response?.definition?.title || "form";
  const summary = name || email
    ? `New Typeform submission from ${name}${email ? ` — ${email}` : ""}`
    : `New Typeform submission on "${formTitle}"`;

  const details: { label: string; value: string }[] = [
    { label: "Form", value: formTitle },
    { label: "Answers", value: `${answers.length} field(s)` },
  ];
  if (name) details.push({ label: "Name", value: name });
  if (email) details.push({ label: "Email", value: email });
  if (fr.submitted_at) details.push({ label: "Submitted", value: new Date(fr.submitted_at).toLocaleString() });

  return { name: "Typeform", icon: <FileText className="h-5 w-5" />, event: "form_response", summary, details, color: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300" };
}

function detectCalendly(body: any): DetectedSource | null {
  if (!body?.event || !body?.payload || typeof body.event !== "string" || !body.event.startsWith("invitee")) return null;
  const p = body.payload;
  const invitee = p.invitee || p;
  const eventType = p.event_type?.name || p.event?.name || "event";
  const name = invitee.name || "";
  const email = invitee.email || "";

  const summary = `Calendly: ${name || "Someone"}${email ? ` (${email})` : ""} — ${body.event.replace("invitee.", "").replace("_", " ")} for "${eventType}"`;
  const details: { label: string; value: string }[] = [
    { label: "Event Type", value: eventType },
    { label: "Action", value: body.event },
  ];
  if (name) details.push({ label: "Name", value: name });
  if (email) details.push({ label: "Email", value: email });
  if (p.event?.start_time) details.push({ label: "Start", value: new Date(p.event.start_time).toLocaleString() });

  return { name: "Calendly", icon: <Calendar className="h-5 w-5" />, event: body.event, summary, details, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" };
}

function detectShopify(body: any): DetectedSource | null {
  const hasShopifyShape = body?.id && (body?.admin_graphql_api_id || body?.shop_id || body?.order_number || body?.line_items);
  if (!hasShopifyShape) return null;

  let event = "webhook";
  let summary = `Shopify event — ID: ${body.id}`;
  const details: { label: string; value: string }[] = [];

  if (body.order_number || body.line_items) {
    event = "order";
    const total = body.total_price ? `$${body.total_price}` : "";
    const customer = body.customer ? `${body.customer.first_name || ""} ${body.customer.last_name || ""}`.trim() : "";
    summary = `New Shopify order #${body.order_number || body.id}${total ? ` — ${total}` : ""}${customer ? ` from ${customer}` : ""}`;
    if (total) details.push({ label: "Total", value: total });
    if (customer) details.push({ label: "Customer", value: customer });
    if (body.customer?.email) details.push({ label: "Email", value: body.customer.email });
    details.push({ label: "Items", value: `${(body.line_items || []).length} item(s)` });
  } else if (body.title && body.variants) {
    event = "product";
    summary = `Shopify product update: "${body.title}"`;
    details.push({ label: "Product", value: body.title });
    details.push({ label: "Variants", value: `${(body.variants || []).length}` });
  }

  return { name: "Shopify", icon: <ShoppingBag className="h-5 w-5" />, event, summary, details, color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" };
}

function detectConvertKit(body: any): DetectedSource | null {
  if (!body?.subscriber) return null;
  const sub = body.subscriber;
  const email = sub.email_address || "";
  const name = sub.first_name || "";

  const summary = `ConvertKit: ${name || "Subscriber"}${email ? ` (${email})` : ""} — ${body.event || "subscriber event"}`;
  const details: { label: string; value: string }[] = [];
  if (body.event) details.push({ label: "Event", value: body.event });
  if (name) details.push({ label: "Name", value: name });
  if (email) details.push({ label: "Email", value: email });
  if (sub.state) details.push({ label: "State", value: sub.state });

  return { name: "ConvertKit", icon: <Mail className="h-5 w-5" />, event: body.event || "subscriber", summary, details, color: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300" };
}

function detectGumroad(body: any): DetectedSource | null {
  if (!body?.seller_id && !body?.product_id && !body?.product_name) return null;
  if (!body?.email && !body?.purchaser_id) return null;

  const product = body.product_name || body.product_id || "product";
  const email = body.email || "";
  const price = body.price ? `$${(body.price / 100).toFixed(2)}` : body.formatted_display_price || "";

  const summary = `Gumroad sale: "${product}"${price ? ` — ${price}` : ""}${email ? ` to ${email}` : ""}`;
  const details: { label: string; value: string }[] = [
    { label: "Product", value: product },
  ];
  if (price) details.push({ label: "Price", value: price });
  if (email) details.push({ label: "Buyer", value: email });
  if (body.refunded !== undefined) details.push({ label: "Refunded", value: body.refunded ? "Yes" : "No" });

  return { name: "Gumroad", icon: <DollarSign className="h-5 w-5" />, event: "sale", summary, details, color: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300" };
}

const detectors = [detectStripe, detectTypeform, detectCalendly, detectShopify, detectConvertKit, detectGumroad];

export function detectWebhookSource(body: any): DetectedSource | null {
  if (!body || typeof body !== "object") return null;
  for (const detect of detectors) {
    const result = detect(body);
    if (result) return result;
  }
  return null;
}

interface SmartWebhookViewProps {
  body: any;
  method: string;
  contentType: string;
  createdAt: string;
}

export function SmartWebhookView({ body, method, contentType, createdAt }: SmartWebhookViewProps) {
  const source = detectWebhookSource(body);

  if (!source) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-center">
          <Globe className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">Unknown webhook source</p>
          <p className="text-xs text-muted-foreground mt-1">
            Could not auto-detect the source. Switch to Developer View to inspect the raw payload.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Source badge + summary */}
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-lg shrink-0 ${source.color}`}>
          {source.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant="secondary" className="text-xs font-semibold">
              {source.name}
            </Badge>
            <Badge variant="outline" className="text-xs font-mono">
              {source.event}
            </Badge>
          </div>
          <p className="text-sm font-medium leading-snug">{source.summary}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Details table */}
      {source.details.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {source.details.map((d, i) => (
                <div key={i} className={`flex text-sm ${i % 2 === 0 ? "bg-muted/30" : ""}`}>
                  <div className="w-1/3 p-3 font-medium text-muted-foreground">{d.label}</div>
                  <div className="flex-1 p-3 break-all">{d.value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
