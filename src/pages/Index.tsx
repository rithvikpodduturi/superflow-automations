import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Webhook, Eye, Database, Zap, Shield, BarChart3, Send, Bell, Check } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <h2 className="text-xl font-bold">SuperFlow</h2>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button asChild variant="outline" size="sm">
            <Link to="/auth">Sign In</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/auth">Get Started</Link>
          </Button>
        </div>
      </div>

      {/* Hero */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center space-y-6 mb-20">
          <Badge variant="secondary" className="text-sm px-4 py-1">Now with Webhook Forwarding & Analytics</Badge>
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent leading-tight">
            Capture, Debug & Forward<br />Webhooks in Real-Time
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Create unique webhook URLs, inspect requests, replay them to your dev server, 
            and get instant notifications. The developer tool you've been waiting for.
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/auth">Start Free</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/dashboard">View Dashboard</Link>
            </Button>
          </div>
        </div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
          {[
            { icon: Webhook, title: "Instant URLs", desc: "Generate unique webhook endpoints in seconds with custom names" },
            { icon: Eye, title: "Real-time Monitoring", desc: "Watch requests as they arrive with full header & body inspection" },
            { icon: Send, title: "Forward & Replay", desc: "Re-send captured webhooks to any URL for debugging" },
            { icon: Shield, title: "API Key Auth", desc: "Secure your endpoints with optional API key authentication" },
            { icon: BarChart3, title: "Analytics", desc: "Charts and stats showing volume, methods, and top endpoints" },
            { icon: Bell, title: "Instant Alerts", desc: "Email, Slack, and Discord notifications on webhook arrival" },
            { icon: Database, title: "Data Persistence", desc: "All requests stored with full details, searchable and exportable" },
            { icon: Zap, title: "Custom Responses", desc: "Define status codes, headers, and body for each endpoint" },
          ].map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="border-border/50 hover:border-primary/30 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="h-5 w-5 text-primary" /> {title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* How it works */}
        <div className="text-center mb-24">
          <h2 className="text-3xl font-bold mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Create Endpoint", desc: "Generate a unique webhook URL with custom name and response config" },
              { step: "2", title: "Receive Webhooks", desc: "Point your services to your URL and capture every request" },
              { step: "3", title: "Debug & Forward", desc: "Inspect data, replay requests, and export for analysis" },
            ].map(({ step, title, desc }) => (
              <div key={step} className="space-y-3">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto">
                  <span className="text-primary-foreground font-bold">{step}</span>
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <div className="text-center mb-20">
          <h2 className="text-3xl font-bold mb-4">Simple Pricing</h2>
          <p className="text-muted-foreground mb-12">Start free. Upgrade when you need more.</p>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free */}
            <Card className="relative">
              <CardHeader>
                <CardTitle>Free</CardTitle>
                <CardDescription>For trying things out</CardDescription>
                <p className="text-4xl font-bold pt-2">$0<span className="text-base font-normal text-muted-foreground">/mo</span></p>
              </CardHeader>
              <CardContent className="space-y-3">
                {["3 endpoints", "100 requests/day", "7-day data retention", "Email notifications", "JSON export"].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" /> {f}
                  </div>
                ))}
                <Button asChild variant="outline" className="w-full mt-4">
                  <Link to="/auth">Get Started</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Pro */}
            <Card className="relative border-primary shadow-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
              </div>
              <CardHeader>
                <CardTitle>Pro</CardTitle>
                <CardDescription>For developers & small teams</CardDescription>
                <p className="text-4xl font-bold pt-2">$12<span className="text-base font-normal text-muted-foreground">/mo</span></p>
              </CardHeader>
              <CardContent className="space-y-3">
                {["Unlimited endpoints", "10,000 requests/day", "30-day retention", "Webhook forwarding", "Slack & Discord alerts", "API key auth", "CSV & JSON export", "Custom responses", "Analytics dashboard"].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" /> {f}
                  </div>
                ))}
                <Button asChild className="w-full mt-4">
                  <Link to="/auth">Start Pro Trial</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Team */}
            <Card className="relative">
              <CardHeader>
                <CardTitle>Team</CardTitle>
                <CardDescription>For organizations</CardDescription>
                <p className="text-4xl font-bold pt-2">$39<span className="text-base font-normal text-muted-foreground">/mo</span></p>
              </CardHeader>
              <CardContent className="space-y-3">
                {["Everything in Pro", "Unlimited retention", "5 team members", "Role-based access", "Shared workspaces", "Priority support", "SSO (coming soon)"].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" /> {f}
                  </div>
                ))}
                <Button asChild variant="outline" className="w-full mt-4">
                  <Link to="/auth">Contact Sales</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t pt-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} SuperFlow. Built for developers who debug webhooks.</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
