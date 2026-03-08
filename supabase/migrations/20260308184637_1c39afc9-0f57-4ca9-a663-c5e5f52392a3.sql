
-- Fix webhooks SELECT policies: drop restrictive, recreate as permissive
DROP POLICY "Users can view their own webhooks" ON public.webhooks;
DROP POLICY "Super admins can view all webhooks" ON public.webhooks;

CREATE POLICY "Users can view their own webhooks" ON public.webhooks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Super admins can view all webhooks" ON public.webhooks FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Fix webhook_endpoints SELECT policies
DROP POLICY "Users can view their own endpoints" ON public.webhook_endpoints;
DROP POLICY "Super admins can view all endpoints" ON public.webhook_endpoints;
DROP POLICY "Service role can read all endpoints" ON public.webhook_endpoints;

CREATE POLICY "Users can view their own endpoints" ON public.webhook_endpoints FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Super admins can view all endpoints" ON public.webhook_endpoints FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Service role can read all endpoints" ON public.webhook_endpoints FOR SELECT USING (true);

-- Fix notification_channels SELECT policies
DROP POLICY "Users can view their own channels" ON public.notification_channels;
DROP POLICY "Super admins can view all channels" ON public.notification_channels;

CREATE POLICY "Users can view their own channels" ON public.notification_channels FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Super admins can view all channels" ON public.notification_channels FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Fix profiles SELECT policies
DROP POLICY "Users can view their own profile" ON public.profiles;
DROP POLICY "Super admins can view all profiles" ON public.profiles;
DROP POLICY "Managers can view all profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Super admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Managers can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'manager'::app_role));

-- Fix smtp_configurations SELECT policies
DROP POLICY "Users can view their own SMTP config" ON public.smtp_configurations;
DROP POLICY "Super admins can view all smtp configs" ON public.smtp_configurations;

CREATE POLICY "Users can view their own SMTP config" ON public.smtp_configurations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Super admins can view all smtp configs" ON public.smtp_configurations FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Fix user_roles SELECT policies
DROP POLICY "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Fix user_limits SELECT policies
DROP POLICY "Users can view their own limits" ON public.user_limits;

CREATE POLICY "Users can view their own limits" ON public.user_limits FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Fix webhook_transforms SELECT policies
DROP POLICY "Users can view their own transforms" ON public.webhook_transforms;
DROP POLICY "Service role can read all transforms" ON public.webhook_transforms;

CREATE POLICY "Users can view their own transforms" ON public.webhook_transforms FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role can read all transforms" ON public.webhook_transforms FOR SELECT USING (true);

-- Fix google_sheets_config SELECT policy
DROP POLICY "Users can view their own sheets config" ON public.google_sheets_config;

CREATE POLICY "Users can view their own sheets config" ON public.google_sheets_config FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Fix new tables too
DROP POLICY "Users can view their own forwards" ON public.webhook_forwards;

CREATE POLICY "Users can view their own forwards" ON public.webhook_forwards FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY "Users can view their own forward configs" ON public.forward_configs;
DROP POLICY "Service role can read all forward configs" ON public.forward_configs;

CREATE POLICY "Users can view their own forward configs" ON public.forward_configs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role can read all forward configs" ON public.forward_configs FOR SELECT USING (true);

DROP POLICY "Users can view their own health checks" ON public.endpoint_health_checks;

CREATE POLICY "Users can view their own health checks" ON public.endpoint_health_checks FOR SELECT TO authenticated USING (auth.uid() = user_id);
