-- Create webhooks table to store incoming webhook data
CREATE TABLE public.webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url_path TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'POST',
  headers JSONB,
  body JSONB,
  query_params JSONB,
  source_ip TEXT,
  user_agent TEXT,
  content_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create webhook_endpoints table to manage custom webhook URLs
CREATE TABLE public.webhook_endpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  endpoint_id TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (webhooks need to be accessible without auth)
CREATE POLICY "Webhooks are publicly readable" 
ON public.webhooks 
FOR SELECT 
USING (true);

CREATE POLICY "Webhooks can be inserted publicly" 
ON public.webhooks 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Webhook endpoints are publicly readable" 
ON public.webhook_endpoints 
FOR SELECT 
USING (true);

CREATE POLICY "Webhook endpoints can be inserted publicly" 
ON public.webhook_endpoints 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Webhook endpoints can be updated publicly" 
ON public.webhook_endpoints 
FOR UPDATE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_webhook_endpoints_updated_at
BEFORE UPDATE ON public.webhook_endpoints
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_webhooks_created_at ON public.webhooks(created_at DESC);
CREATE INDEX idx_webhooks_url_path ON public.webhooks(url_path);
CREATE INDEX idx_webhook_endpoints_endpoint_id ON public.webhook_endpoints(endpoint_id);

-- Enable realtime for webhooks table
ALTER TABLE public.webhooks REPLICA IDENTITY FULL;
ALTER TABLE public.webhook_endpoints REPLICA IDENTITY FULL;