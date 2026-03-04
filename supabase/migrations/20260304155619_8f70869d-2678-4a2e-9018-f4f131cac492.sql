
-- Add custom response configuration to webhook_endpoints
ALTER TABLE public.webhook_endpoints
  ADD COLUMN IF NOT EXISTS response_status_code integer NOT NULL DEFAULT 200,
  ADD COLUMN IF NOT EXISTS response_headers jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS response_body text DEFAULT '{"success": true, "message": "Webhook received successfully"}',
  ADD COLUMN IF NOT EXISTS api_key text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS notify_on_receive boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS description text DEFAULT NULL;

-- Create notification_channels table for Slack/Discord
CREATE TABLE public.notification_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  channel_type text NOT NULL CHECK (channel_type IN ('slack', 'discord')),
  webhook_url text NOT NULL,
  channel_name text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for notification_channels
CREATE POLICY "Users can view their own channels"
  ON public.notification_channels FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own channels"
  ON public.notification_channels FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own channels"
  ON public.notification_channels FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own channels"
  ON public.notification_channels FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Update trigger for notification_channels
CREATE TRIGGER update_notification_channels_updated_at
  BEFORE UPDATE ON public.notification_channels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
