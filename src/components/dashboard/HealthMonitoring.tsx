import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HeartPulse, TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface WebhookEndpoint {
  id: string;
  name: string;
  endpoint_id: string;
}

interface WebhookForward {
  id: string;
  endpoint_id: string;
  status: string;
  last_response_status: number | null;
  response_time_ms: number | null;
  created_at: string;
}

interface Props {
  endpoints: WebhookEndpoint[];
  userId: string;
}

const STATUS_COLORS = {
  healthy: "text-emerald-700 dark:text-emerald-400",
  degraded: "text-amber-700 dark:text-amber-400",
  down: "text-red-700 dark:text-red-400",
};

const PIE_COLORS = ["hsl(142, 71%, 45%)", "hsl(0, 84%, 60%)", "hsl(38, 92%, 50%)", "hsl(217, 91%, 60%)"];

export function HealthMonitoring({ endpoints, userId }: Props) {
  const [forwards, setForwards] = useState<WebhookForward[]>([]);
  const [timeRange, setTimeRange] = useState<string>("24h");

  useEffect(() => { loadForwards(); }, [userId, timeRange]);

  const loadForwards = async () => {
    const hoursMap: Record<string, number> = { "1h": 1, "24h": 24, "7d": 168, "30d": 720 };
    const hours = hoursMap[timeRange] || 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data } = await (supabase as any)
      .from("webhook_forwards")
      .select("id, endpoint_id, status, last_response_status, response_time_ms, created_at")
      .eq("user_id", userId)
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(1000);
    setForwards(data || []);
  };

  const endpointHealth = useMemo(() => {
    return endpoints.map((ep) => {
      const epForwards = forwards.filter((f) => f.endpoint_id === ep.id);
      const total = epForwards.length;
      const delivered = epForwards.filter((f) => f.status === "delivered").length;
      const failed = epForwards.filter((f) => f.status === "failed").length;
      const successRate = total > 0 ? (delivered / total) * 100 : 100;
      const avgResponseTime = epForwards.filter((f) => f.response_time_ms).reduce((sum, f) => sum + (f.response_time_ms || 0), 0) / (epForwards.filter((f) => f.response_time_ms).length || 1);
      const status = total === 0 ? "healthy" : successRate >= 90 ? "healthy" : successRate >= 50 ? "degraded" : "down";
      return { ...ep, total, delivered, failed, successRate, avgResponseTime, status };
    });
  }, [endpoints, forwards]);

  const overallStats = useMemo(() => {
    const total = forwards.length;
    const delivered = forwards.filter((f) => f.status === "delivered").length;
    const failed = forwards.filter((f) => f.status === "failed").length;
    const retrying = forwards.filter((f) => f.status === "retrying").length;
    const pending = forwards.filter((f) => f.status === "pending").length;
    const avgTime = forwards.filter((f) => f.response_time_ms).reduce((s, f) => s + (f.response_time_ms || 0), 0) / (forwards.filter((f) => f.response_time_ms).length || 1);
    return { total, delivered, failed, retrying, pending, avgTime, successRate: total > 0 ? (delivered / total) * 100 : 100 };
  }, [forwards]);

  const timeSeriesData = useMemo(() => {
    const buckets: Record<string, { time: string; delivered: number; failed: number; avgTime: number; count: number }> = {};
    const bucketSize = timeRange === "1h" ? 5 : timeRange === "24h" ? 60 : timeRange === "7d" ? 360 : 1440;

    forwards.forEach((f) => {
      const d = new Date(f.created_at);
      const bucketTime = new Date(Math.floor(d.getTime() / (bucketSize * 60000)) * bucketSize * 60000);
      const key = bucketTime.toISOString();
      if (!buckets[key]) buckets[key] = { time: key, delivered: 0, failed: 0, avgTime: 0, count: 0 };
      if (f.status === "delivered") buckets[key].delivered++;
      if (f.status === "failed") buckets[key].failed++;
      if (f.response_time_ms) {
        buckets[key].avgTime = (buckets[key].avgTime * buckets[key].count + f.response_time_ms) / (buckets[key].count + 1);
        buckets[key].count++;
      }
    });

    return Object.values(buckets).sort((a, b) => a.time.localeCompare(b.time)).map((b) => ({
      ...b,
      time: new Date(b.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      avgTime: Math.round(b.avgTime),
    }));
  }, [forwards, timeRange]);

  const pieData = [
    { name: "Delivered", value: overallStats.delivered },
    { name: "Failed", value: overallStats.failed },
    { name: "Retrying", value: overallStats.retrying },
    { name: "Pending", value: overallStats.pending },
  ].filter((d) => d.value > 0);

  const statusIcon = (status: string) => {
    if (status === "healthy") return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
    if (status === "degraded") return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HeartPulse className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Health Overview</h3>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last 1h</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7d</SelectItem>
              <SelectItem value="30d">Last 30d</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={loadForwards}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Overall stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <div>
                <p className="text-xl font-bold">{overallStats.successRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Success Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xl font-bold">{Math.round(overallStats.avgTime)}ms</p>
                <p className="text-xs text-muted-foreground">Avg Response</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <div>
                <p className="text-xl font-bold">{overallStats.delivered}</p>
                <p className="text-xs text-muted-foreground">Delivered</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <div>
                <p className="text-xl font-bold">{overallStats.failed}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-endpoint health */}
      <Card>
        <CardHeader>
          <CardTitle>Endpoint Health</CardTitle>
          <CardDescription>Status based on forward success rates in selected time range</CardDescription>
        </CardHeader>
        <CardContent>
          {endpointHealth.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No endpoints yet.</p>
          ) : (
            <div className="space-y-2">
              {endpointHealth.map((ep) => (
                <div key={ep.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {statusIcon(ep.status)}
                    <div>
                      <p className="font-medium text-sm">{ep.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {ep.total} forwards · {ep.successRate.toFixed(0)}% success · ~{Math.round(ep.avgResponseTime)}ms avg
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={STATUS_COLORS[ep.status as keyof typeof STATUS_COLORS]}>
                    {ep.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Delivery Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {timeSeriesData.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <Tooltip />
                  <Bar dataKey="delivered" fill="hsl(142, 71%, 45%)" name="Delivered" />
                  <Bar dataKey="failed" fill="hsl(0, 84%, 60%)" name="Failed" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Response Time (ms)</CardTitle>
          </CardHeader>
          <CardContent>
            {timeSeriesData.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <Tooltip />
                  <Line type="monotone" dataKey="avgTime" stroke="hsl(217, 91%, 60%)" name="Avg Time (ms)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status distribution pie */}
      {pieData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width={300} height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
