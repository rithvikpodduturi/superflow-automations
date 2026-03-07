
-- User limits and ban management table
CREATE TABLE public.user_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  is_banned boolean NOT NULL DEFAULT false,
  ban_reason text,
  banned_at timestamp with time zone,
  max_endpoints integer NOT NULL DEFAULT 10,
  max_webhooks_per_day integer NOT NULL DEFAULT 1000,
  max_notification_channels integer NOT NULL DEFAULT 5,
  requests_per_minute integer NOT NULL DEFAULT 60,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE public.user_limits ENABLE ROW LEVEL SECURITY;

-- Users can view their own limits
CREATE POLICY "Users can view their own limits"
ON public.user_limits FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Super admins can do everything
CREATE POLICY "Super admins can manage all limits"
ON public.user_limits FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Auto-create limits for new users (update the handle_new_user function)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  INSERT INTO public.user_limits (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

-- Updated_at trigger
CREATE TRIGGER update_user_limits_updated_at
  BEFORE UPDATE ON public.user_limits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
