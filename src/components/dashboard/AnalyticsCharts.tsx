import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";

interface WebhookRequest {
  id: string;
  method: string;
  created_at: string;
  url_path: string;
}

interface Props {
  requests: WebhookRequest[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(210, 80%, 55%)",
  "hsl(40, 90%, 55%)",
  "hsl(150, 60%, 45%)",
  "hsl(280, 60%, 55%)",
];

export function AnalyticsCharts({ requests }: Props) {
  // Methods breakdown
  const methodCounts: Record<string, number> = {};
  requests.forEach((r) => {
    methodCounts[r.method] = (methodCounts[r.method] || 0) + 1;
  });
  const methodData = Object.entries(methodCounts).map(([name, value]) => ({ name, value }));

  // Requests over time (last 7 days)
  const now = new Date();
  const last7Days: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const count = requests.filter((r) => r.created_at.slice(0, 10) === dateStr).length;
    last7Days.push({ date: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }), count });
  }

  // Top endpoints
  const endpointCounts: Record<string, number> = {};
  requests.forEach((r) => {
    const ep = r.url_path?.split("/").pop() || "unknown";
    endpointCounts[ep] = (endpointCounts[ep] || 0) + 1;
  });
  const topEndpoints = Object.entries(endpointCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name: name.slice(0, 12), count }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Volume over time */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Webhooks Over Time (7 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={last7Days}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Methods pie */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">By Method</CardTitle>
        </CardHeader>
        <CardContent>
          {methodData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={methodData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {methodData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top endpoints */}
      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle className="text-base">Top Endpoints</CardTitle>
        </CardHeader>
        <CardContent>
          {topEndpoints.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topEndpoints} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} className="fill-muted-foreground" />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
