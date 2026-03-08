import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function checkRateLimits(supabase: any, userId: string, limits: any): Promise<string | null> {
  const now = new Date()

  // Check per-hour limit
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
  const { count: hourCount } = await supabase
    .from('webhooks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', oneHourAgo)

  if (hourCount !== null && hourCount >= limits.max_webhooks_per_hour) {
    return `Hourly limit reached (${limits.max_webhooks_per_hour}/hr)`
  }

  // Check per-day limit
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const { count: dayCount } = await supabase
    .from('webhooks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', oneDayAgo)

  if (dayCount !== null && dayCount >= limits.max_webhooks_per_day) {
    return `Daily limit reached (${limits.max_webhooks_per_day}/day)`
  }

  // Check per-month limit
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { count: monthCount } = await supabase
    .from('webhooks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', oneMonthAgo)

  if (monthCount !== null && monthCount >= limits.max_webhooks_per_month) {
    return `Monthly limit reached (${limits.max_webhooks_per_month}/mo)`
  }

  // Check per-minute rate limit
  const oneMinAgo = new Date(now.getTime() - 60 * 1000).toISOString()
  const { count: minCount } = await supabase
    .from('webhooks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', oneMinAgo)

  if (minCount !== null && minCount >= limits.requests_per_minute) {
    return `Rate limit reached (${limits.requests_per_minute}/min)`
  }

  return null
}

async function sendNotifications(supabase: any, endpoint: any, endpointId: string, req: Request, url: URL, contentType: string) {
  try {
    const { data: smtpConfig } = await supabase
      .from('smtp_configurations')
      .select('*')
      .eq('user_id', endpoint.user_id)
      .eq('is_active', true)
      .single()

    if (smtpConfig) {
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

    // Check if user is banned
    const { data: userLimits } = await supabase
      .from('user_limits')
      .select('*')
      .eq('user_id', endpoint.user_id)
      .single()

    if (userLimits?.is_banned) {
      return new Response(JSON.stringify({ error: 'This endpoint is currently suspended' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Enforce rate limits
    if (userLimits) {
      const limitError = await checkRateLimits(supabase, endpoint.user_id, userLimits)
      if (limitError) {
        return new Response(JSON.stringify({ error: limitError }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
        })
      }
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
    req.headers.forEach((value, key) => { headers[key] = value })

    // Get query parameters
    const queryParams: Record<string, string> = {}
    url.searchParams.forEach((value, key) => { queryParams[key] = value })

    // Get request body
    let body = null
    const contentType = req.headers.get('content-type') || ''
    
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      try {
        const bodyText = await req.text()
        if (bodyText) {
          body = contentType.includes('application/json') ? JSON.parse(bodyText) : bodyText
        }
      } catch (error) {
        console.error('Error parsing request body:', error)
      }
    }

    // Apply transforms
    const { data: transforms } = await supabase
      .from('webhook_transforms')
      .select('*')
      .eq('endpoint_id', endpoint.id)
      .eq('is_active', true)
      .order('execution_order')

    let transformedBody = body

    if (transforms && transforms.length > 0) {
      for (const transform of transforms) {
        const config = transform.transform_config

        if (transform.transform_type === 'filter') {
          // Check if webhook matches filter condition
          const fieldValue = getNestedValue(transformedBody, config.field)
          let matches = false
          if (config.operator === 'equals') matches = fieldValue === config.value
          else if (config.operator === 'contains') matches = String(fieldValue || '').includes(config.value)
          else if (config.operator === 'exists') matches = fieldValue !== undefined && fieldValue !== null

          if (!matches) {
            // Skip storage — return response without inserting
            const responseHeaders: Record<string, string> = { ...corsHeaders, 'Content-Type': 'application/json' }
            if (endpoint.response_headers && typeof endpoint.response_headers === 'object') {
              Object.entries(endpoint.response_headers).forEach(([key, value]) => {
                responseHeaders[key] = String(value)
              })
            }
            return new Response(endpoint.response_body || JSON.stringify({ success: true, filtered: true }), {
              status: endpoint.response_status_code || 200,
              headers: responseHeaders,
            })
          }
        } else if (transform.transform_type === 'field_map' && config.mappings) {
          const mapped: Record<string, any> = {}
          for (const m of config.mappings) {
            mapped[m.to] = getNestedValue(transformedBody, m.from)
          }
          transformedBody = mapped
        } else if (transform.transform_type === 'template' && config.template) {
          transformedBody = applyTemplate(config.template, body)
        }
      }
    }

    // Store webhook data
    const { error: insertError } = await supabase
      .from('webhooks')
      .insert({
        url_path: url.pathname,
        method: req.method,
        headers,
        body: transformedBody,
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

    // Auto-notify if enabled
    if (endpoint.notify_on_receive) {
      sendNotifications(supabase, endpoint, endpointId, req, url, contentType)
    }

    // Auto-push to Google Sheets if configured
    try {
      const { data: sheetsConfig } = await supabase
        .from('google_sheets_config')
        .select('*')
        .eq('user_id', endpoint.user_id)
        .eq('is_active', true)
        .eq('auto_push', true)
        .single()

      if (sheetsConfig) {
        const pushUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/push-to-sheets`
        // Fire and forget — get the latest webhook
        const { data: latestWebhook } = await supabase
          .from('webhooks')
          .select('id')
          .eq('user_id', endpoint.user_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (latestWebhook) {
          fetch(pushUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({ webhook_ids: [latestWebhook.id] }),
          }).catch(err => console.error('Auto push-to-sheets error:', err))
        }
      }
    } catch (err) {
      console.error('Sheets auto-push check error:', err)
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
