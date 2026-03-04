
-- Webhook endpoints table
CREATE TABLE public.webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint_id text NOT NULL UNIQUE,
  name text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Webhooks (captured requests) table
CREATE TABLE public.webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  url_path text,
  method text,
  headers jsonb,
  body jsonb,
  query_params jsonb,
  source_ip text,
  user_agent text,
  content_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS policies for webhook_endpoints
CREATE POLICY "Users can view their own endpoints"
  ON public.webhook_endpoints FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own endpoints"
  ON public.webhook_endpoints FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own endpoints"
  ON public.webhook_endpoints FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own endpoints"
  ON public.webhook_endpoints FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can read all endpoints"
  ON public.webhook_endpoints FOR SELECT TO service_role
  USING (true);

-- RLS policies for webhooks
CREATE POLICY "Users can view their own webhooks"
  ON public.webhooks FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert webhooks"
  ON public.webhooks FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Users can delete their own webhooks"
  ON public.webhooks FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Update trigger for webhook_endpoints
CREATE TRIGGER update_webhook_endpoints_updated_at
  BEFORE UPDATE ON public.webhook_endpoints
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
