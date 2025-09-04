import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Webhook, Database, Eye, Zap } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-6 mb-16">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Webhook Capture Platform
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Create unique webhook URLs to capture and inspect incoming HTTP requests. 
            Perfect for testing integrations and debugging webhooks in real-time.
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/auth">
                Get Started
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/dashboard">
                View Dashboard
              </Link>
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5 text-primary" />
                Instant URLs
              </CardTitle>
              <CardDescription>
                Generate unique webhook URLs instantly with custom names and descriptions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Create webhook endpoints in seconds. Each endpoint gets a unique URL that you can use immediately.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                Real-time Monitoring
              </CardTitle>
              <CardDescription>
                Watch incoming requests in real-time with detailed inspection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                See requests as they come in. Inspect headers, body, query parameters, and more.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Data Persistence
              </CardTitle>
              <CardDescription>
                All webhook data is stored and searchable for later analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Never lose webhook data. All requests are automatically stored with full details.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How it Works */}
        <div className="text-center space-y-8">
          <h2 className="text-3xl font-bold">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto">
                <span className="text-primary-foreground font-bold">1</span>
              </div>
              <h3 className="font-semibold">Create Endpoint</h3>
              <p className="text-sm text-muted-foreground">
                Generate a unique webhook URL with a custom name
              </p>
            </div>
            <div className="space-y-3">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto">
                <span className="text-primary-foreground font-bold">2</span>
              </div>
              <h3 className="font-semibold">Send Requests</h3>
              <p className="text-sm text-muted-foreground">
                Configure your services to send webhooks to your URL
              </p>
            </div>
            <div className="space-y-3">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto">
                <span className="text-primary-foreground font-bold">3</span>
              </div>
              <h3 className="font-semibold">Inspect Data</h3>
              <p className="text-sm text-muted-foreground">
                View and analyze all incoming webhook data in real-time
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
