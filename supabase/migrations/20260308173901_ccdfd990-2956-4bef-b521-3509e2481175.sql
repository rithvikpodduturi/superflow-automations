ALTER TABLE public.user_limits 
ADD COLUMN max_webhooks_per_hour integer NOT NULL DEFAULT 100,
ADD COLUMN max_webhooks_per_month integer NOT NULL DEFAULT 30000;