import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Google Auth: create a signed JWT from service account key, exchange for access token
async function getGoogleAccessToken(serviceAccountKey: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const claim = {
    iss: serviceAccountKey.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }

  const encode = (obj: any) => btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const encodedHeader = encode(header)
  const encodedClaim = encode(claim)
  const signInput = `${encodedHeader}.${encodedClaim}`

  // Import the private key
  const pemContent = serviceAccountKey.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\n/g, '')
  const binaryKey = Uint8Array.from(atob(pemContent), c => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(signInput))
  const encodedSig = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const jwt = `${signInput}.${encodedSig}`

  // Exchange JWT for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    throw new Error(`Google token exchange failed: ${err}`)
  }

  const tokenData = await tokenRes.json()
  return tokenData.access_token
}

function extractSpreadsheetId(url: string): string {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (!match) throw new Error('Invalid Google Sheets URL')
  return match[1]
}

async function appendToSheet(accessToken: string, spreadsheetId: string, values: any[][]) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Google Sheets API error [${res.status}]: ${err}`)
  }

  return await res.json()
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

    // Auth: get user from JWT
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { webhook_ids } = await req.json()

    // Get user's Google Sheets config
    const { data: config, error: configError } = await supabase
      .from('google_sheets_config')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (configError || !config) {
      return new Response(JSON.stringify({ error: 'Google Sheets not configured. Please add your config in Settings.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse the service account key
    let serviceAccountKey
    try {
      serviceAccountKey = JSON.parse(config.service_account_key)
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid service account key JSON' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch webhooks to push
    let query = supabase.from('webhooks').select('*').eq('user_id', user.id).order('created_at', { ascending: true })
    if (webhook_ids && webhook_ids.length > 0) {
      query = query.in('id', webhook_ids)
    } else {
      // Default: push last 100
      query = query.limit(100)
    }
    const { data: webhooks, error: whError } = await query
    if (whError || !webhooks || webhooks.length === 0) {
      return new Response(JSON.stringify({ error: 'No webhooks to push' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get access token
    const accessToken = await getGoogleAccessToken(serviceAccountKey)
    const spreadsheetId = extractSpreadsheetId(config.sheet_url)

    // Build rows: [timestamp, method, path, source_ip, content_type, body_json]
    const rows = webhooks.map((wh: any) => [
      wh.created_at,
      wh.method || '',
      wh.url_path || '',
      wh.source_ip || '',
      wh.content_type || '',
      JSON.stringify(wh.body || {}),
      JSON.stringify(wh.headers || {}),
      JSON.stringify(wh.query_params || {}),
    ])

    const result = await appendToSheet(accessToken, spreadsheetId, rows)

    return new Response(JSON.stringify({ 
      success: true, 
      rows_pushed: webhooks.length,
      updates: result.updates 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('Push to Sheets error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
