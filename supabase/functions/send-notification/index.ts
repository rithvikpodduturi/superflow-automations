import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Support both user tokens and service role key
    let userId: string
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (token === serviceRoleKey) {
      // Called internally from webhook-capture with service role
      const body = await req.json()
      userId = body.user_id
      
      if (!userId) {
        return new Response(JSON.stringify({ error: 'user_id required for service role calls' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Get SMTP config for the user
      const { data: smtpConfig, error: smtpError } = await supabase
        .from('smtp_configurations')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      if (smtpError || !smtpConfig) {
        return new Response(JSON.stringify({ error: 'No active SMTP configuration found' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { subject, body: emailBody, to } = body
      const recipient = to || smtpConfig.smtp_email

      const client = new SmtpClient()
      const connectConfig: any = {
        hostname: smtpConfig.smtp_host,
        port: smtpConfig.smtp_port,
        username: smtpConfig.smtp_username,
        password: smtpConfig.smtp_password,
      }

      if (smtpConfig.use_tls) {
        await client.connectTLS(connectConfig)
      } else {
        await client.connect(connectConfig)
      }

      await client.send({
        from: smtpConfig.smtp_email,
        to: recipient,
        subject: subject,
        content: emailBody,
      })

      await client.close()

      return new Response(JSON.stringify({ success: true, message: 'Email sent successfully' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Regular user token flow
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: smtpConfig, error: smtpError } = await supabase
      .from('smtp_configurations')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (smtpError || !smtpConfig) {
      return new Response(JSON.stringify({ error: 'No active SMTP configuration found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { subject, body: emailBody, to } = await req.json()

    if (!subject || !emailBody) {
      return new Response(JSON.stringify({ error: 'Subject and body are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const recipient = to || smtpConfig.smtp_email

    const client = new SmtpClient()
    const connectConfig: any = {
      hostname: smtpConfig.smtp_host,
      port: smtpConfig.smtp_port,
      username: smtpConfig.smtp_username,
      password: smtpConfig.smtp_password,
    }

    if (smtpConfig.use_tls) {
      await client.connectTLS(connectConfig)
    } else {
      await client.connect(connectConfig)
    }

    await client.send({
      from: smtpConfig.smtp_email,
      to: recipient,
      subject: subject,
      content: emailBody,
    })

    await client.close()

    return new Response(JSON.stringify({ success: true, message: 'Email sent successfully' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error sending notification:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
