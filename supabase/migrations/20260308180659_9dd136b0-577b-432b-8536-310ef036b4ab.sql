
-- Webhook transforms table
CREATE TABLE public.webhook_transforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id uuid NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Untitled Transform',
  transform_type text NOT NULL CHECK (transform_type IN ('field_map', 'filter', 'template')),
  transform_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  execution_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_transforms ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own transforms"
  ON public.webhook_transforms FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transforms"
  ON public.webhook_transforms FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transforms"
  ON public.webhook_transforms FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transforms"
  ON public.webhook_transforms FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can read all transforms"
  ON public.webhook_transforms FOR SELECT
  USING (true);

-- Updated_at trigger
CREATE TRIGGER update_webhook_transforms_updated_at
  BEFORE UPDATE ON public.webhook_transforms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Avatars storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage RLS: anyone can view avatars
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Users can upload their own avatar
CREATE POLICY "Users can upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Users can update their own avatar
CREATE POLICY "Users can update avatars"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Users can delete their own avatar
CREATE POLICY "Users can delete avatars"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
