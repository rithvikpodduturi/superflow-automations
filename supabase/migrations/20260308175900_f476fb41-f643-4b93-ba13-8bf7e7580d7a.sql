
CREATE TABLE public.google_sheets_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sheet_url text NOT NULL,
  service_account_key text NOT NULL,
  auto_push boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.google_sheets_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sheets config"
ON public.google_sheets_config FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sheets config"
ON public.google_sheets_config FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sheets config"
ON public.google_sheets_config FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sheets config"
ON public.google_sheets_config FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Updated at trigger
CREATE TRIGGER update_google_sheets_config_updated_at
  BEFORE UPDATE ON public.google_sheets_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
