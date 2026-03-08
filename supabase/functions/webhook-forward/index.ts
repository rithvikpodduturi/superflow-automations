import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { webhook_id, forward_url, custom_method, custom_headers, custom_body } = await req.json()

    if (!webhook_id || !forward_url) {
      return new Response(JSON.stringify({ error: 'webhook_id and forward_url are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get the webhook data (RLS ensures user can only access their own)
    const { data: webhook, error: webhookError } = await supabase
      .from('webhooks')
      .select('*')
      .eq('id', webhook_id)
      .eq('user_id', user.id)
      .single()

    if (webhookError || !webhook) {
      return new Response(JSON.stringify({ error: 'Webhook not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Forward the request
    const forwardHeaders: Record<string, string> = {
      'Content-Type': webhook.content_type || 'application/json',
      'X-Forwarded-From': 'webhook-capture',
      'X-Original-Method': webhook.method || 'POST',
    }

    const forwardResponse = await fetch(forward_url, {
      method: webhook.method || 'POST',
      headers: forwardHeaders,
      body: webhook.body ? JSON.stringify(webhook.body) : undefined,
    })

    const responseBody = await forwardResponse.text()

    return new Response(JSON.stringify({ 
      success: true,
      forward_status: forwardResponse.status,
      forward_response: responseBody.substring(0, 1000),
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error forwarding webhook:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
