import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Users, ShieldAlert, ArrowLeft, Ban, CheckCircle, Search,
  Activity, Webhook, Bell, Gauge, Settings, Save, Loader2,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UserProfile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface UserLimits {
  id: string;
  user_id: string;
  is_banned: boolean;
  ban_reason: string | null;
  banned_at: string | null;
  max_endpoints: number;
  max_webhooks_per_hour: number;
  max_webhooks_per_day: number;
  max_webhooks_per_month: number;
  max_notification_channels: number;
  requests_per_minute: number;
}

interface UserStats {
  user_id: string;
  email?: string;
  full_name: string | null;
  created_at: string;
  endpoint_count: number;
  webhook_count: number;
  channel_count: number;
  limits: UserLimits | null;
}

const Admin = () => {
  const [users, setUsers] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserStats | null>(null);
  const [limitsDialog, setLimitsDialog] = useState(false);
  const [banDialog, setBanDialog] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [limitsForm, setLimitsForm] = useState({
    max_endpoints: 10,
    max_webhooks_per_hour: 100,
    max_webhooks_per_day: 1000,
    max_webhooks_per_month: 30000,
    max_notification_channels: 5,
    requests_per_minute: 60,
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    checkRole();
  }, [user, authLoading]);

  const checkRole = async () => {
    if (!user) return;
    const { data } = await (supabase as any).from("user_roles").select("role").eq("user_id", user.id).single();
    if (data?.role !== "super_admin") {
      navigate("/dashboard");
      return;
    }
    setUserRole("super_admin");
    loadUsers();
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Load profiles
      const { data: profiles } = await (supabase as any).from("profiles").select("*");
      // Load endpoints count per user
      const { data: endpoints } = await (supabase as any).from("webhook_endpoints").select("user_id");
      // Load webhooks count per user
      const { data: webhooks } = await (supabase as any).from("webhooks").select("user_id");
      // Load channels count per user
      const { data: channels } = await (supabase as any).from("notification_channels").select("user_id");
      // Load limits
      const { data: limits } = await (supabase as any).from("user_limits").select("*");

      const userStats: UserStats[] = (profiles || []).map((p: UserProfile) => {
        const endpointCount = (endpoints || []).filter((e: any) => e.user_id === p.user_id).length;
        const webhookCount = (webhooks || []).filter((w: any) => w.user_id === p.user_id).length;
        const channelCount = (channels || []).filter((c: any) => c.user_id === p.user_id).length;
        const userLimits = (limits || []).find((l: any) => l.user_id === p.user_id) || null;

        return {
          user_id: p.user_id,
          full_name: p.full_name,
          created_at: p.created_at,
          endpoint_count: endpointCount,
          webhook_count: webhookCount,
          channel_count: channelCount,
          limits: userLimits,
        };
      });

      setUsers(userStats);
    } catch (e: any) {
      toast({ title: "Error loading users", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openLimitsDialog = (u: UserStats) => {
    setSelectedUser(u);
    setLimitsForm({
      max_endpoints: u.limits?.max_endpoints ?? 10,
      max_webhooks_per_hour: u.limits?.max_webhooks_per_hour ?? 100,
      max_webhooks_per_day: u.limits?.max_webhooks_per_day ?? 1000,
      max_webhooks_per_month: u.limits?.max_webhooks_per_month ?? 30000,
      max_notification_channels: u.limits?.max_notification_channels ?? 5,
      requests_per_minute: u.limits?.requests_per_minute ?? 60,
    });
    setLimitsDialog(true);
  };

  const saveLimits = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      if (selectedUser.limits) {
        const { error } = await (supabase as any)
          .from("user_limits")
          .update(limitsForm)
          .eq("user_id", selectedUser.user_id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("user_limits")
          .insert({ ...limitsForm, user_id: selectedUser.user_id });
        if (error) throw error;
      }
      toast({ title: "Limits updated" });
      setLimitsDialog(false);
      loadUsers();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const openBanDialog = (u: UserStats) => {
    setSelectedUser(u);
    setBanReason("");
    setBanDialog(true);
  };

  const toggleBan = async (ban: boolean) => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const updateData: any = {
        is_banned: ban,
        banned_at: ban ? new Date().toISOString() : null,
        ban_reason: ban ? banReason || null : null,
      };

      if (selectedUser.limits) {
        const { error } = await (supabase as any)
          .from("user_limits")
          .update(updateData)
          .eq("user_id", selectedUser.user_id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("user_limits")
          .insert({ ...updateData, user_id: selectedUser.user_id });
        if (error) throw error;
      }

      // Deactivate all endpoints if banning
      if (ban) {
        await (supabase as any)
          .from("webhook_endpoints")
          .update({ is_active: false })
          .eq("user_id", selectedUser.user_id);
      }

      toast({ title: ban ? "User suspended" : "User reinstated" });
      setBanDialog(false);
      loadUsers();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      u.user_id.toLowerCase().includes(search.toLowerCase())
  );

  const totalEndpoints = users.reduce((s, u) => s + u.endpoint_count, 0);
  const totalWebhooks = users.reduce((s, u) => s + u.webhook_count, 0);
  const bannedCount = users.filter((u) => u.limits?.is_banned).length;

  if (authLoading || !userRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <ShieldAlert className="h-7 w-7 text-destructive" />
                Admin Panel
              </h1>
              <p className="text-muted-foreground">Manage users, set limits, and monitor platform usage</p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Overview stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{users.length}</p>
                  <p className="text-xs text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Webhook className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{totalEndpoints}</p>
                  <p className="text-xs text-muted-foreground">Total Endpoints</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{totalWebhooks}</p>
                  <p className="text-xs text-muted-foreground">Total Webhooks</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-2xl font-bold">{bannedCount}</p>
                  <p className="text-xs text-muted-foreground">Suspended</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Users table */}
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>View usage stats, set limits, and manage accounts</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead className="text-center">Endpoints</TableHead>
                      <TableHead className="text-center">Webhooks</TableHead>
                      <TableHead className="text-center">Channels</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Limits</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u) => {
                      const isBanned = u.limits?.is_banned;
                      const isOverEndpoints = u.limits && u.endpoint_count >= u.limits.max_endpoints;
                      const isOverWebhooks = u.limits && u.webhook_count >= u.limits.max_webhooks_per_day;
                      return (
                        <TableRow key={u.user_id} className={isBanned ? "opacity-60" : ""}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{u.full_name || "Unnamed User"}</p>
                              <p className="text-xs text-muted-foreground font-mono">{u.user_id.slice(0, 8)}...</p>
                              <p className="text-xs text-muted-foreground">
                                Joined {new Date(u.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={isOverEndpoints ? "text-destructive font-bold" : ""}>
                              {u.endpoint_count}
                            </span>
                            {u.limits && (
                              <span className="text-xs text-muted-foreground">/{u.limits.max_endpoints}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={isOverWebhooks ? "text-destructive font-bold" : ""}>
                              {u.webhook_count}
                            </span>
                            {u.limits && (
                              <span className="text-xs text-muted-foreground">/{u.limits.max_webhooks_per_day}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {u.channel_count}
                            {u.limits && (
                              <span className="text-xs text-muted-foreground">/{u.limits.max_notification_channels}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {isBanned ? (
                              <Badge variant="destructive">Suspended</Badge>
                            ) : (
                              <Badge variant="secondary">Active</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {u.limits ? (
                              <span className="text-xs text-muted-foreground">
                                {u.limits.requests_per_minute} req/min
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Default</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => openLimitsDialog(u)}>
                                <Gauge className="h-4 w-4 mr-1" /> Limits
                              </Button>
                              {isBanned ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUser(u);
                                    toggleBan(false);
                                  }}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" /> Reinstate
                                </Button>
                              ) : (
                                <Button variant="destructive" size="sm" onClick={() => openBanDialog(u)}>
                                  <Ban className="h-4 w-4 mr-1" /> Suspend
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No users found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Limits Dialog */}
      <Dialog open={limitsDialog} onOpenChange={setLimitsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              Set Limits — {selectedUser?.full_name || "User"}
            </DialogTitle>
            <DialogDescription>
              Configure usage limits for this user. Changes take effect immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Max Endpoints</Label>
                <Input
                  type="number"
                  value={limitsForm.max_endpoints}
                  onChange={(e) => setLimitsForm((p) => ({ ...p, max_endpoints: parseInt(e.target.value) || 0 }))}
                />
                <p className="text-xs text-muted-foreground mt-1">Current: {selectedUser?.endpoint_count}</p>
              </div>
              <div>
                <Label>Max Webhooks / Day</Label>
                <Input
                  type="number"
                  value={limitsForm.max_webhooks_per_day}
                  onChange={(e) => setLimitsForm((p) => ({ ...p, max_webhooks_per_day: parseInt(e.target.value) || 0 }))}
                />
                <p className="text-xs text-muted-foreground mt-1">Current: {selectedUser?.webhook_count}</p>
              </div>
              <div>
                <Label>Max Notification Channels</Label>
                <Input
                  type="number"
                  value={limitsForm.max_notification_channels}
                  onChange={(e) => setLimitsForm((p) => ({ ...p, max_notification_channels: parseInt(e.target.value) || 0 }))}
                />
                <p className="text-xs text-muted-foreground mt-1">Current: {selectedUser?.channel_count}</p>
              </div>
              <div>
                <Label>Rate Limit (req/min)</Label>
                <Input
                  type="number"
                  value={limitsForm.requests_per_minute}
                  onChange={(e) => setLimitsForm((p) => ({ ...p, requests_per_minute: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <Separator />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setLimitsDialog(false)}>Cancel</Button>
              <Button onClick={saveLimits} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Limits
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ban Dialog */}
      <Dialog open={banDialog} onOpenChange={setBanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="h-5 w-5" />
              Suspend User — {selectedUser?.full_name || "User"}
            </DialogTitle>
            <DialogDescription>
              This will deactivate all their endpoints. They can still log in but will see a suspended notice.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Reason (optional)</Label>
              <Textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="e.g. Excessive API usage, Terms of Service violation..."
                rows={3}
              />
            </div>
            <Separator />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setBanDialog(false)}>Cancel</Button>
              <Button variant="destructive" onClick={() => toggleBan(true)} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Ban className="h-4 w-4 mr-2" />}
                Confirm Suspension
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
