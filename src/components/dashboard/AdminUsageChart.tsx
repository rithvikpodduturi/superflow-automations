import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Loader2 } from "lucide-react";

interface UserInfo {
  user_id: string;
  full_name: string | null;
}

interface ChartDataPoint {
  date: string;
  [userName: string]: string | number;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(142 71% 45%)",
  "hsl(38 92% 50%)",
  "hsl(262 83% 58%)",
  "hsl(190 90% 50%)",
  "hsl(330 80% 60%)",
  "hsl(15 80% 55%)",
];

export function AdminUsageChart({ users }: { users: UserInfo[] }) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [userNames, setUserNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (users.length > 0) loadChartData();
  }, [users]);

  const loadChartData = async () => {
    setLoading(true);
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: webhooks } = await (supabase as any)
        .from("webhooks")
        .select("user_id, created_at")
        .gte("created_at", sevenDaysAgo.toISOString());

      if (!webhooks) { setLoading(false); return; }

      // Build a map of user_id -> display name
      const nameMap: Record<string, string> = {};
      users.forEach((u) => {
        nameMap[u.user_id] = u.full_name || u.user_id.slice(0, 8);
      });

      // Build daily counts per user
      const days: Record<string, Record<string, number>> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        days[key] = {};
      }

      const activeUserIds = new Set<string>();
      for (const w of webhooks) {
        const day = w.created_at.slice(0, 10);
        if (!days[day]) continue;
        const name = nameMap[w.user_id] || w.user_id.slice(0, 8);
        days[day][name] = (days[day][name] || 0) + 1;
        activeUserIds.add(name);
      }

      const names = Array.from(activeUserIds).slice(0, 8); // top 8 users
      setUserNames(names);

      const data: ChartDataPoint[] = Object.entries(days).map(([date, counts]) => {
        const point: ChartDataPoint = {
          date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        };
        names.forEach((name) => { point[name] = counts[name] || 0; });
        return point;
      });

      setChartData(data);
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
        <CardDescription>Daily webhook requests per user</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : chartData.length === 0 || userNames.length === 0 ? (
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
              <Legend />
              {userNames.map((name, i) => (
                <Bar
                  key={name}
                  dataKey={name}
                  stackId="a"
                  fill={COLORS[i % COLORS.length]}
                  radius={i === userNames.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
