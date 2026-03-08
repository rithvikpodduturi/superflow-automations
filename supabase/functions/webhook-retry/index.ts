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

    // Get forwards that need retrying
    const { data: pendingForwards, error: fetchError } = await supabase
      .from('webhook_forwards')
      .select('*, forward_configs:endpoint_id(custom_headers)')
      .in('status', ['retrying', 'pending'])
      .lte('next_retry_at', new Date().toISOString())
      .limit(50)

    if (fetchError) {
      console.error('Error fetching forwards:', fetchError)
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!pendingForwards || pendingForwards.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending retries', processed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let processed = 0
    let succeeded = 0
    let failed = 0

    for (const forward of pendingForwards) {
      processed++

      // Get the original webhook data
      const { data: webhook } = await supabase
        .from('webhooks')
        .select('*')
        .eq('id', forward.webhook_id)
        .single()

      if (!webhook) {
        await supabase.from('webhook_forwards').update({
          status: 'failed',
          last_error: 'Original webhook not found',
          attempts: forward.attempts + 1,
        }).eq('id', forward.id)
        failed++
        continue
      }

      // Get forward config for custom headers
      const { data: config } = await supabase
        .from('forward_configs')
        .select('custom_headers')
        .eq('endpoint_id', forward.endpoint_id)
        .single()

      const customHeaders = config?.custom_headers || {}

      try {
        const startTime = Date.now()
        const forwardHeaders: Record<string, string> = {
          'Content-Type': webhook.content_type || 'application/json',
          'X-Forwarded-From': 'webhook-capture',
          'X-Original-Method': webhook.method || 'POST',
          'X-Retry-Attempt': String(forward.attempts + 1),
          ...(typeof customHeaders === 'object' ? customHeaders : {}),
        }

        const response = await fetch(forward.forward_url, {
          method: webhook.method || 'POST',
          headers: forwardHeaders,
          body: webhook.body ? (typeof webhook.body === 'string' ? webhook.body : JSON.stringify(webhook.body)) : undefined,
        })

        const responseTime = Date.now() - startTime
        const responseBody = await response.text()

        if (response.ok) {
          await supabase.from('webhook_forwards').update({
            status: 'delivered',
            attempts: forward.attempts + 1,
            last_response_status: response.status,
            last_response_body: responseBody.substring(0, 1000),
            response_time_ms: responseTime,
            next_retry_at: null,
          }).eq('id', forward.id)
          succeeded++
        } else {
          const newAttempts = forward.attempts + 1
          if (newAttempts >= forward.max_retries) {
            await supabase.from('webhook_forwards').update({
              status: 'failed',
              attempts: newAttempts,
              last_response_status: response.status,
              last_response_body: responseBody.substring(0, 1000),
              response_time_ms: responseTime,
              next_retry_at: null,
            }).eq('id', forward.id)
            failed++
          } else {
            // Exponential backoff: delay * 2^attempts
            const { data: fwdConfig } = await supabase
              .from('forward_configs')
              .select('retry_delay_seconds')
              .eq('endpoint_id', forward.endpoint_id)
              .single()

            const baseDelay = fwdConfig?.retry_delay_seconds || 30
            const backoffMs = baseDelay * Math.pow(2, newAttempts) * 1000
            const nextRetry = new Date(Date.now() + backoffMs).toISOString()

            await supabase.from('webhook_forwards').update({
              status: 'retrying',
              attempts: newAttempts,
              last_response_status: response.status,
              last_response_body: responseBody.substring(0, 1000),
              response_time_ms: responseTime,
              next_retry_at: nextRetry,
            }).eq('id', forward.id)
          }
        }
      } catch (err: any) {
        const newAttempts = forward.attempts + 1
        if (newAttempts >= forward.max_retries) {
          await supabase.from('webhook_forwards').update({
            status: 'failed',
            attempts: newAttempts,
            last_error: err.message,
            next_retry_at: null,
          }).eq('id', forward.id)
          failed++
        } else {
          const { data: fwdConfig } = await supabase
            .from('forward_configs')
            .select('retry_delay_seconds')
            .eq('endpoint_id', forward.endpoint_id)
            .single()

          const baseDelay = fwdConfig?.retry_delay_seconds || 30
          const backoffMs = baseDelay * Math.pow(2, newAttempts) * 1000
          const nextRetry = new Date(Date.now() + backoffMs).toISOString()

          await supabase.from('webhook_forwards').update({
            status: 'retrying',
            attempts: newAttempts,
            last_error: err.message,
            next_retry_at: nextRetry,
          }).eq('id', forward.id)
        }
      }
    }

    return new Response(JSON.stringify({ processed, succeeded, failed }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Error in webhook-retry:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
