

## Plan: Real-time Live Feed, Retry Queue, Advanced Search & Export, Health Monitoring

---

### Feature 1: Real-time Live Feed

The dashboard already has a basic Supabase Realtime subscription (lines 107-118 of Dashboard.tsx) that listens for new webhook inserts and prepends them. We will enhance this into a proper live feed experience.

**Changes:**
- **`src/components/dashboard/LiveFeedIndicator.tsx`** (new): A pulsing "Live" indicator badge that shows connection status (connected/reconnecting/disconnected). Displays a streaming count of webhooks received this session.
- **`src/components/dashboard/WebhookTable.tsx`**: Add a highlight animation for newly arrived rows (CSS flash on insert). Add a "pause/resume" toggle so users can freeze the feed while inspecting data without new rows pushing content down.
- **`src/pages/Dashboard.tsx`**: Replace the inline Realtime subscription with a shared hook. Show the LiveFeedIndicator in the header area near the stats cards.

No database changes needed -- Realtime is already enabled on the webhooks table.

---

### Feature 2: Retry Queue

Allow users to configure automatic retries for webhook forwards that fail, with exponential backoff and delivery status tracking.

**Database changes (migration):**
- New `webhook_forwards` table:
  - `id` (uuid PK)
  - `webhook_id` (uuid, FK to webhooks)
  - `endpoint_id` (uuid, FK to webhook_endpoints)
  - `user_id` (uuid)
  - `forward_url` (text)
  - `status` (text: 'pending', 'delivered', 'failed', 'retrying')
  - `attempts` (integer, default 0)
  - `max_retries` (integer, default 3)
  - `next_retry_at` (timestamptz, nullable)
  - `last_response_status` (integer, nullable)
  - `last_response_body` (text, nullable)
  - `last_error` (text, nullable)
  - `created_at`, `updated_at` (timestamptz)
- RLS: users manage their own forwards, service role can read/update all.

- New `forward_configs` table:
  - `id` (uuid PK)
  - `endpoint_id` (uuid, FK to webhook_endpoints, unique)
  - `user_id` (uuid)
  - `forward_url` (text)
  - `is_active` (boolean, default false)
  - `max_retries` (integer, default 3)
  - `retry_delay_seconds` (integer, default 30)
  - `custom_headers` (jsonb, default '{}')
  - `created_at`, `updated_at` (timestamptz)
- RLS: users manage their own configs.

**New files:**
- **`src/components/dashboard/RetryQueue.tsx`**: UI showing forward delivery history per endpoint. Status badges (pending/delivered/failed/retrying), manual retry button, forward config editor per endpoint.
- **`supabase/functions/webhook-retry/index.ts`**: Edge function that:
  1. Queries `webhook_forwards` where `status = 'retrying'` and `next_retry_at <= now()`
  2. Attempts the forward, updates status/attempts/next_retry_at with exponential backoff
  3. Marks as 'failed' when max_retries exceeded

**Updated files:**
- **`supabase/functions/webhook-capture/index.ts`**: After storing the webhook, check if the endpoint has an active `forward_config`. If so, create a `webhook_forwards` record with status 'pending' and immediately attempt the forward. On failure, set status to 'retrying' with `next_retry_at`.
- **`src/pages/Dashboard.tsx`**: Add RetryQueue component, accessible from endpoint config or as a sub-section.
- **`supabase/config.toml`**: Register `webhook-retry` function.

**Scheduled retries**: Use `pg_cron` + `pg_net` to invoke the `webhook-retry` edge function every minute to process pending retries.

---

### Feature 3: Advanced Search & Export (Enhanced)

The current WebhookTable already has search, method/date filters, pagination, and CSV/JSON export. We will enhance it with:

**Changes to `src/components/dashboard/WebhookTable.tsx`:**
- Add **endpoint filter** dropdown (already exists but we'll add source IP filter)
- Add **content type filter** dropdown
- Add **source IP filter** input
- Add **body field search** -- search specific JSON paths (e.g., `event=payment`)
- Add **bulk select** with checkboxes for selective export (export only selected rows)
- Add **column visibility toggle** so users can show/hide columns
- Enhance CSV export to include body and headers as columns (currently omitted)
- Add **"Export All" button** that fetches beyond the 500-row client limit by paginating through Supabase (fetches in batches of 1000)

**Changes to `src/pages/Dashboard.tsx`:**
- Pass a `fetchAllRequests` callback to WebhookTable that can paginate through the full dataset for export.

No database changes needed.

---

### Feature 4: Health Monitoring

Dashboard for tracking endpoint uptime, error rates, and response time metrics.

**Database changes (migration):**
- Add columns to `webhooks` table (or new table):
  - New `webhook_forwards` table (from Feature 2) already tracks response status. We'll add `response_time_ms` (integer) to it.
- New `endpoint_health_checks` table:
  - `id` (uuid PK)
  - `endpoint_id` (uuid, FK to webhook_endpoints)
  - `user_id` (uuid)
  - `check_url` (text) -- optional external URL to ping
  - `is_active` (boolean, default false)
  - `interval_seconds` (integer, default 300)
  - `last_check_at` (timestamptz)
  - `last_status` (text: 'healthy', 'degraded', 'down')
  - `created_at`, `updated_at` (timestamptz)
- RLS: users manage their own health checks.

**New files:**
- **`src/components/dashboard/HealthMonitoring.tsx`**: New dashboard tab/section showing:
  - Per-endpoint health status cards (healthy/degraded/down based on recent error rates)
  - Error rate chart (% of 4xx/5xx forward responses over time)
  - Average response time chart from forward attempts
  - Uptime percentage (calculated from forward success rate over last 24h/7d/30d)
  - Alert thresholds configuration (e.g., notify when error rate > 50%)
- **`supabase/functions/health-check/index.ts`**: Edge function that pings configured URLs and records status. Called via pg_cron.

**Updated files:**
- **`src/pages/Dashboard.tsx`**: Add "Health" tab to the main tabs, render HealthMonitoring component.
- **`supabase/functions/webhook-forward/index.ts`**: Record `response_time_ms` in `webhook_forwards` table.
- **`supabase/config.toml`**: Register `health-check` and `webhook-retry` functions.

---

### Technical Summary

```text
New files:
  src/components/dashboard/LiveFeedIndicator.tsx
  src/components/dashboard/RetryQueue.tsx
  src/components/dashboard/HealthMonitoring.tsx
  supabase/functions/webhook-retry/index.ts
  supabase/functions/health-check/index.ts

Modified files:
  src/pages/Dashboard.tsx           (new tabs, live feed, retry queue, health)
  src/components/dashboard/WebhookTable.tsx  (live highlights, advanced filters, bulk export)
  supabase/functions/webhook-capture/index.ts (auto-forward with retry)
  supabase/functions/webhook-forward/index.ts (record response time)
  supabase/config.toml              (register new functions)

New migrations:
  - webhook_forwards table + RLS
  - forward_configs table + RLS
  - endpoint_health_checks table + RLS

Scheduled jobs (pg_cron):
  - webhook-retry: every minute
  - health-check: every 5 minutes
```

