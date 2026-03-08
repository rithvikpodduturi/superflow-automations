-- Super admin can update all endpoints (needed for ban/deactivation)
CREATE POLICY "Super admins can update all endpoints"
ON public.webhook_endpoints
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Super admin can view all SMTP configs (for monitoring)
CREATE POLICY "Super admins can view all smtp configs"
ON public.smtp_configurations
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Add email column to profiles so admin can see user emails
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;