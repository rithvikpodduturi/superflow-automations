
-- Remove super_admin SELECT access to raw user data
DROP POLICY IF EXISTS "Super admins can view all webhooks" ON public.webhooks;
DROP POLICY IF EXISTS "Super admins can view all endpoints" ON public.webhook_endpoints;
DROP POLICY IF EXISTS "Super admins can update all endpoints" ON public.webhook_endpoints;
DROP POLICY IF EXISTS "Super admins can view all channels" ON public.notification_channels;
DROP POLICY IF EXISTS "Super admins can view all smtp configs" ON public.smtp_configurations;

-- Create security definer functions for aggregate stats only
CREATE OR REPLACE FUNCTION public.admin_get_user_stats()
RETURNS TABLE (
  user_id uuid,
  endpoint_count bigint,
  webhook_count bigint,
  webhook_count_today bigint,
  channel_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    (SELECT count(*) FROM webhook_endpoints e WHERE e.user_id = p.user_id) AS endpoint_count,
    (SELECT count(*) FROM webhooks w WHERE w.user_id = p.user_id) AS webhook_count,
    (SELECT count(*) FROM webhooks w WHERE w.user_id = p.user_id AND w.created_at >= now() - interval '24 hours') AS webhook_count_today,
    (SELECT count(*) FROM notification_channels c WHERE c.user_id = p.user_id) AS channel_count
  FROM profiles p
  WHERE has_role(auth.uid(), 'super_admin'::app_role)
$$;

-- Create function for platform-wide analytics (no raw data)
CREATE OR REPLACE FUNCTION public.admin_get_platform_analytics(time_range_hours integer DEFAULT 168)
RETURNS TABLE (
  total_users bigint,
  total_endpoints bigint,
  total_webhooks bigint,
  webhooks_in_range bigint,
  total_forwards bigint,
  successful_forwards bigint,
  failed_forwards bigint,
  avg_response_time_ms numeric,
  banned_users bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM profiles),
    (SELECT count(*) FROM webhook_endpoints),
    (SELECT count(*) FROM webhooks),
    (SELECT count(*) FROM webhooks WHERE created_at >= now() - (time_range_hours || ' hours')::interval),
    (SELECT count(*) FROM webhook_forwards),
    (SELECT count(*) FROM webhook_forwards WHERE status = 'delivered'),
    (SELECT count(*) FROM webhook_forwards WHERE status = 'failed'),
    (SELECT coalesce(avg(response_time_ms), 0) FROM webhook_forwards WHERE response_time_ms IS NOT NULL),
    (SELECT count(*) FROM user_limits WHERE is_banned = true)
  WHERE has_role(auth.uid(), 'super_admin'::app_role)
$$;

-- Create function for webhook volume over time (aggregated, no raw data)
CREATE OR REPLACE FUNCTION public.admin_get_webhook_volume(time_range_hours integer DEFAULT 168)
RETURNS TABLE (
  bucket timestamptz,
  count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    date_trunc('hour', created_at) AS bucket,
    count(*) AS count
  FROM webhooks
  WHERE created_at >= now() - (time_range_hours || ' hours')::interval
    AND has_role(auth.uid(), 'super_admin'::app_role)
  GROUP BY bucket
  ORDER BY bucket
$$;
