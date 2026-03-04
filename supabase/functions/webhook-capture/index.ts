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

    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/').filter(Boolean)
    const endpointId = pathSegments[pathSegments.length - 1]
    
    if (!endpointId || endpointId === 'webhook-capture') {
      return new Response(JSON.stringify({ error: 'Endpoint ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify the endpoint exists
    const { data: endpoint, error: endpointError } = await supabase
      .from('webhook_endpoints')
      .select('*')
      .eq('endpoint_id', endpointId)
      .eq('is_active', true)
      .single()

    if (endpointError || !endpoint) {
      return new Response(JSON.stringify({ error: 'Endpoint not found or inactive' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check API key authentication if configured
    if (endpoint.api_key) {
      const providedKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '')
      if (providedKey !== endpoint.api_key) {
        return new Response(JSON.stringify({ error: 'Unauthorized - invalid API key' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Get request headers
    const headers: Record<string, string> = {}
    req.headers.forEach((value, key) => {
      headers[key] = value
    })

    // Get query parameters
    const queryParams: Record<string, string> = {}
    url.searchParams.forEach((value, key) => {
      queryParams[key] = value
    })

    // Get request body
    let body = null
    const contentType = req.headers.get('content-type') || ''
    
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      try {
        const bodyText = await req.text()
        if (bodyText) {
          if (contentType.includes('application/json')) {
            body = JSON.parse(bodyText)
          } else {
            body = bodyText
          }
        }
      } catch (error) {
        console.error('Error parsing request body:', error)
      }
    }

    // Store webhook data
    const { error: insertError } = await supabase
      .from('webhooks')
      .insert({
        url_path: url.pathname,
        method: req.method,
        headers,
        body,
        query_params: Object.keys(queryParams).length > 0 ? queryParams : null,
        source_ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        user_agent: req.headers.get('user-agent'),
        content_type: contentType,
        user_id: endpoint.user_id
      })

    if (insertError) {
      console.error('Error inserting webhook data:', insertError)
      return new Response(JSON.stringify({ error: 'Failed to store webhook data' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Auto-notify via email if enabled
    if (endpoint.notify_on_receive) {
      try {
        // Get SMTP config
        const { data: smtpConfig } = await supabase
          .from('smtp_configurations')
          .select('*')
          .eq('user_id', endpoint.user_id)
          .eq('is_active', true)
          .single()

        if (smtpConfig) {
          // Fire and forget - call the send-notification function internally
          const notifyUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`
          fetch(notifyUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              user_id: endpoint.user_id,
              subject: `🔔 New ${req.method} webhook received on "${endpoint.name || endpointId}"`,
              body: `A new ${req.method} request was received on your webhook endpoint "${endpoint.name || endpointId}".\n\nPath: ${url.pathname}\nSource IP: ${req.headers.get('x-forwarded-for') || 'Unknown'}\nContent-Type: ${contentType || 'N/A'}\nTimestamp: ${new Date().toISOString()}\n\nCheck your dashboard for full details.`,
              to: smtpConfig.smtp_email,
            }),
          }).catch(err => console.error('Notification send error:', err))
        }

        // Notify via Slack/Discord channels
        const { data: channels } = await supabase
          .from('notification_channels')
          .select('*')
          .eq('user_id', endpoint.user_id)
          .eq('is_active', true)

        if (channels && channels.length > 0) {
          for (const channel of channels) {
            try {
              const message = `🔔 New ${req.method} webhook received on "${endpoint.name || endpointId}"\nPath: ${url.pathname}\nSource: ${req.headers.get('x-forwarded-for') || 'Unknown'}\nTime: ${new Date().toISOString()}`
              
              if (channel.channel_type === 'slack') {
                fetch(channel.webhook_url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ text: message }),
                }).catch(err => console.error('Slack notify error:', err))
              } else if (channel.channel_type === 'discord') {
                fetch(channel.webhook_url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ content: message }),
                }).catch(err => console.error('Discord notify error:', err))
              }
            } catch (err) {
              console.error('Channel notify error:', err)
            }
          }
        }
      } catch (err) {
        console.error('Notification error:', err)
      }
    }

    // Return custom response if configured
    const responseHeaders: Record<string, string> = { ...corsHeaders, 'Content-Type': 'application/json' }
    if (endpoint.response_headers && typeof endpoint.response_headers === 'object') {
      Object.entries(endpoint.response_headers).forEach(([key, value]) => {
        responseHeaders[key] = String(value)
      })
    }

    const responseBody = endpoint.response_body || JSON.stringify({ 
      success: true, 
      message: 'Webhook received successfully',
      timestamp: new Date().toISOString()
    })

    return new Response(responseBody, {
      status: endpoint.response_status_code || 200,
      headers: responseHeaders,
    })

  } catch (error) {
    console.error('Error in webhook-capture function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
