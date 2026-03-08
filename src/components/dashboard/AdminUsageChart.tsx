import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Loader2 } from "lucide-react";

interface ChartDataPoint {
  date: string;
  count: number;
}

export function AdminUsageChart() {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChartData();
  }, []);

  const loadChartData = async () => {
    setLoading(true);
    try {
      // Use aggregate RPC function — no raw user data accessed
      const { data } = await (supabase as any).rpc("admin_get_webhook_volume", { time_range_hours: 168 });

      if (!data) { setLoading(false); return; }

      const points: ChartDataPoint[] = (data || []).map((d: any) => ({
        date: new Date(d.bucket).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        count: Number(d.count),
      }));

      // Aggregate by day
      const dayMap: Record<string, number> = {};
      points.forEach((p) => {
        dayMap[p.date] = (dayMap[p.date] || 0) + p.count;
      });

      setChartData(Object.entries(dayMap).map(([date, count]) => ({ date, count })));
    } catch (e) {
      console.error("Error loading chart data:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhook Volume — Last 7 Days</CardTitle>
        <CardDescription>Aggregated daily webhook requests (no user-specific data)</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : chartData.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No webhook data in the last 7 days</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--popover-foreground))",
                }}
              />
              <Bar dataKey="count" name="Webhooks" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
