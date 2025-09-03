import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
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
    
    // Extract endpoint ID from path (e.g., /webhook-capture/abc123)
    const endpointId = pathSegments[pathSegments.length - 1]
    
    if (!endpointId || endpointId === 'webhook-capture') {
      return new Response(JSON.stringify({ error: 'Endpoint ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
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
        body = await req.text()
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
        content_type: contentType
      })

    if (insertError) {
      console.error('Error inserting webhook data:', insertError)
      return new Response(JSON.stringify({ error: 'Failed to store webhook data' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Return success response
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Webhook received successfully',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in webhook-capture function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})