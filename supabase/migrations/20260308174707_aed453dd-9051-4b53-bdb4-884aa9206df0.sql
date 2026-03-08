CREATE POLICY "Super admins can view all webhooks"
ON public.webhooks
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can view all endpoints"
ON public.webhook_endpoints
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can view all channels"
ON public.notification_channels
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role));