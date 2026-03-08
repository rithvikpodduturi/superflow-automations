import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Search, Download, ChevronLeft, ChevronRight, Code, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SmartWebhookView } from "./SmartWebhookView";
import { WebhookReplayDialog } from "./WebhookReplayDialog";

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

interface WebhookEndpoint {
  id: string;
  name: string;
  endpoint_id: string;
}

interface Props {
  requests: WebhookRequest[];
  endpoints: WebhookEndpoint[];
}

const ITEMS_PER_PAGE = 20;

export function WebhookTable({ requests, endpoints }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [endpointFilter, setEndpointFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<WebhookRequest | null>(null);
  const [viewMode, setViewMode] = useState<"smart" | "developer">("smart");
  const { toast } = useToast();

  // Filter
  const filtered = requests.filter((req) => {
    if (methodFilter !== "all" && req.method !== methodFilter) return false;
    if (endpointFilter !== "all" && !req.url_path?.includes(endpointFilter)) return false;
    if (dateFrom && new Date(req.created_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(req.created_at) > new Date(dateTo + "T23:59:59")) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const bodyStr = JSON.stringify(req.body || "").toLowerCase();
      const headersStr = JSON.stringify(req.headers || "").toLowerCase();
      const pathStr = (req.url_path || "").toLowerCase();
      if (!bodyStr.includes(q) && !headersStr.includes(q) && !pathStr.includes(q) && !(req.source_ip || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const exportData = (format: "json" | "csv") => {
    if (format === "json") {
      const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `webhooks-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = ["id", "method", "url_path", "source_ip", "content_type", "created_at"];
      const csvRows = [headers.join(",")];
      for (const req of filtered) {
        csvRows.push(headers.map((h) => `"${(req as any)[h] || ""}"`).join(","));
      }
      const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `webhooks-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    toast({ title: `Exported ${filtered.length} records as ${format.toUpperCase()}` });
  };

  const forwardWebhook = async (webhookId: string) => {
    if (!forwardUrl) return;
    setForwarding(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/webhook-forward`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ webhook_id: webhookId, forward_url: forwardUrl }),
        }
      );
      const result = await response.json();
      if (response.ok) {
        toast({ title: "Webhook forwarded!", description: `Status: ${result.forward_status}` });
      } else {
        toast({ title: "Forward failed", description: result.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setForwarding(false);
    }
  };

  const parseFormData = (body: any): Record<string, string> => {
    if (typeof body === "string") {
      const params = new URLSearchParams(body);
      const result: Record<string, string> = {};
      for (const [key, value] of params.entries()) result[key] = decodeURIComponent(value);
      return result;
    }
    return body || {};
  };

  const methodColors: Record<string, string> = {
    GET: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
    POST: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    PUT: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    PATCH: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle>Webhook Requests ({filtered.length})</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportData("csv")}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportData("json")}>
              <Download className="h-4 w-4 mr-1" /> JSON
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search body, headers, path, IP..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="pl-9"
            />
          </div>
          <Select value={methodFilter} onValueChange={(v) => { setMethodFilter(v); setCurrentPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Method" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="GET">GET</SelectItem>
              <SelectItem value="POST">POST</SelectItem>
              <SelectItem value="PUT">PUT</SelectItem>
              <SelectItem value="PATCH">PATCH</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" placeholder="From" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }} />
          <Input type="date" placeholder="To" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }} />
        </div>
      </CardHeader>
      <CardContent>
        {paginated.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No requests found matching your filters.</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Method</TableHead>
                  <TableHead>Path</TableHead>
                  <TableHead>Source IP</TableHead>
                  <TableHead>Content Type</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${methodColors[request.method] || "bg-muted"}`}>
                        {request.method}
                      </span>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded max-w-[200px] truncate block">
                        {request.url_path}
                      </code>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{request.source_ip || "Unknown"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{request.content_type || "N/A"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(request.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setSelectedRequest(request)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                            <DialogHeader>
                              <DialogTitle>{request.method} Request Details</DialogTitle>
                              <DialogDescription>
                                {request.method} to {request.url_path} at {new Date(request.created_at).toLocaleString()}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              {/* Smart / Developer toggle */}
                              <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
                                <button
                                  onClick={() => setViewMode("smart")}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === "smart" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                                >
                                  <Sparkles className="h-3.5 w-3.5" /> Smart View
                                </button>
                                <button
                                  onClick={() => setViewMode("developer")}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === "developer" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                                >
                                  <Code className="h-3.5 w-3.5" /> Developer View
                                </button>
                              </div>

                              {viewMode === "smart" ? (
                                <SmartWebhookView
                                  body={request.body}
                                  method={request.method}
                                  contentType={request.content_type}
                                  createdAt={request.created_at}
                                />
                              ) : (
                                <>
                                  <div className="border rounded-lg overflow-hidden">
                                    <div className="flex border-b bg-muted/50">
                                      <div className="w-1/3 p-3 font-medium text-muted-foreground border-r">Path</div>
                                      <div className="flex-1 p-3"><code>{request.url_path}</code></div>
                                    </div>
                                    <div className="flex border-b">
                                      <div className="w-1/3 p-3 font-medium text-muted-foreground border-r">Source IP</div>
                                      <div className="flex-1 p-3">{request.source_ip || "Unknown"}</div>
                                    </div>
                                    <div className="flex border-b bg-muted/50">
                                      <div className="w-1/3 p-3 font-medium text-muted-foreground border-r">Content-Type</div>
                                      <div className="flex-1 p-3">{request.content_type || "N/A"}</div>
                                    </div>
                                    <div className="flex">
                                      <div className="w-1/3 p-3 font-medium text-muted-foreground border-r">User Agent</div>
                                      <div className="flex-1 p-3 break-all text-sm">{request.user_agent || "N/A"}</div>
                                    </div>
                                  </div>

                                  {request.body && (
                                    <div>
                                      <Label className="text-sm font-semibold">Body</Label>
                                      <Textarea
                                        value={typeof request.body === "string" ? request.body : JSON.stringify(request.body, null, 2)}
                                        readOnly
                                        className="font-mono text-sm h-40 mt-1"
                                      />
                                    </div>
                                  )}

                                  <div>
                                    <Label className="text-sm font-semibold">Headers</Label>
                                    <Textarea value={JSON.stringify(request.headers, null, 2)} readOnly className="font-mono text-sm h-32 mt-1" />
                                  </div>

                                  {request.query_params && (
                                    <div>
                                      <Label className="text-sm font-semibold">Query Params</Label>
                                      <Textarea value={JSON.stringify(request.query_params, null, 2)} readOnly className="font-mono text-sm h-24 mt-1" />
                                    </div>
                                  )}
                                </>
                              )}

                              {/* Forward/Replay */}
                              <div className="border-t pt-4">
                                <Label className="text-sm font-semibold">Forward / Replay</Label>
                                <div className="flex gap-2 mt-2">
                                  <Input
                                    placeholder="https://your-server.com/webhook"
                                    value={forwardUrl}
                                    onChange={(e) => setForwardUrl(e.target.value)}
                                    className="flex-1"
                                  />
                                  <Button
                                    onClick={() => forwardWebhook(request.id)}
                                    disabled={forwarding || !forwardUrl}
                                    size="sm"
                                  >
                                    <Send className="h-4 w-4 mr-1" />
                                    {forwarding ? "Sending..." : "Forward"}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages} · {filtered.length} total
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" /> Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
