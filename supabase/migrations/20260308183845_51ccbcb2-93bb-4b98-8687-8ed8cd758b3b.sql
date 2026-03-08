
-- Forward configs table
CREATE TABLE public.forward_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id uuid REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  forward_url text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  max_retries integer NOT NULL DEFAULT 3,
  retry_delay_seconds integer NOT NULL DEFAULT 30,
  custom_headers jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.forward_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own forward configs" ON public.forward_configs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own forward configs" ON public.forward_configs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own forward configs" ON public.forward_configs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own forward configs" ON public.forward_configs FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role can read all forward configs" ON public.forward_configs FOR SELECT USING (true);

CREATE TRIGGER update_forward_configs_updated_at BEFORE UPDATE ON public.forward_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Webhook forwards table
CREATE TABLE public.webhook_forwards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid REFERENCES public.webhooks(id) ON DELETE CASCADE NOT NULL,
  endpoint_id uuid REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  forward_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  next_retry_at timestamptz,
  last_response_status integer,
  last_response_body text,
  last_error text,
  response_time_ms integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_forwards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own forwards" ON public.webhook_forwards FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own forwards" ON public.webhook_forwards FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own forwards" ON public.webhook_forwards FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage all forwards" ON public.webhook_forwards FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_webhook_forwards_updated_at BEFORE UPDATE ON public.webhook_forwards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_webhook_forwards_status ON public.webhook_forwards(status, next_retry_at);
CREATE INDEX idx_webhook_forwards_user ON public.webhook_forwards(user_id, created_at DESC);
CREATE INDEX idx_webhook_forwards_endpoint ON public.webhook_forwards(endpoint_id, created_at DESC);

-- Endpoint health checks table
CREATE TABLE public.endpoint_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id uuid REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  check_url text,
  is_active boolean NOT NULL DEFAULT false,
  interval_seconds integer NOT NULL DEFAULT 300,
  last_check_at timestamptz,
  last_status text NOT NULL DEFAULT 'healthy',
  last_response_time_ms integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.endpoint_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own health checks" ON public.endpoint_health_checks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own health checks" ON public.endpoint_health_checks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own health checks" ON public.endpoint_health_checks FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own health checks" ON public.endpoint_health_checks FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage all health checks" ON public.endpoint_health_checks FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_endpoint_health_checks_updated_at BEFORE UPDATE ON public.endpoint_health_checks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
