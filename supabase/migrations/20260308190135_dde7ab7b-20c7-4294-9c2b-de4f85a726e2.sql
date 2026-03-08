
-- Add folder and tags columns to webhook_endpoints
ALTER TABLE public.webhook_endpoints
  ADD COLUMN IF NOT EXISTS folder text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Index for folder filtering
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_folder ON public.webhook_endpoints (user_id, folder);

-- GIN index for tag searching
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_tags ON public.webhook_endpoints USING gin (tags);
