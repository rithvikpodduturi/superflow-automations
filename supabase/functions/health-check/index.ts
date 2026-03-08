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

    // Get active health checks that are due
    const { data: checks, error } = await supabase
      .from('endpoint_health_checks')
      .select('*, webhook_endpoints(name, endpoint_id, is_active)')
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching health checks:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!checks || checks.length === 0) {
      return new Response(JSON.stringify({ message: 'No active health checks', processed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let processed = 0
    const now = Date.now()

    for (const check of checks) {
      // Check if enough time has passed since last check
      if (check.last_check_at) {
        const lastCheck = new Date(check.last_check_at).getTime()
        if (now - lastCheck < check.interval_seconds * 1000) continue
      }

      processed++

      if (!check.check_url) {
        // No URL to check — derive health from recent forwards
        const since = new Date(now - 3600000).toISOString() // last hour
        const { data: recentForwards } = await supabase
          .from('webhook_forwards')
          .select('status')
          .eq('endpoint_id', check.endpoint_id)
          .gte('created_at', since)

        const total = recentForwards?.length || 0
        const failed = recentForwards?.filter((f: any) => f.status === 'failed').length || 0
        const successRate = total > 0 ? ((total - failed) / total) * 100 : 100

        const status = successRate >= 90 ? 'healthy' : successRate >= 50 ? 'degraded' : 'down'

        await supabase.from('endpoint_health_checks').update({
          last_check_at: new Date().toISOString(),
          last_status: status,
        }).eq('id', check.id)
      } else {
        // Ping the URL
        try {
          const startTime = Date.now()
          const response = await fetch(check.check_url, {
            method: 'GET',
            signal: AbortSignal.timeout(10000),
          })
          const responseTime = Date.now() - startTime

          const status = response.ok ? 'healthy' : response.status >= 500 ? 'down' : 'degraded'

          await supabase.from('endpoint_health_checks').update({
            last_check_at: new Date().toISOString(),
            last_status: status,
            last_response_time_ms: responseTime,
          }).eq('id', check.id)
        } catch (err: any) {
          await supabase.from('endpoint_health_checks').update({
            last_check_at: new Date().toISOString(),
            last_status: 'down',
          }).eq('id', check.id)
        }
      }
    }

    return new Response(JSON.stringify({ processed }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Error in health-check:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
