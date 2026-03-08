

## Plan: Build Features 2, 3, and 5

Building three features: **Webhook Replay/Debug**, **User Profile & Settings**, and **Webhook Transformations**.

---

### Feature 2: Webhook Replay/Debug (Enhanced)

The forward/replay UI already exists in `WebhookTable.tsx` inside the request detail dialog. We will enhance it to allow **editing headers and body before replaying**.

**Changes:**
- **`WebhookTable.tsx`**: Add editable fields for method, headers, and body in the Forward/Replay section. Users can modify the original request data before sending. Show the response status, headers, and body after forwarding.
- **`webhook-forward` edge function**: Update to accept optional `custom_headers`, `custom_body`, and `custom_method` overrides so users can modify the request before replay.

---

### Feature 3: User Profile & Settings Page

A new `/profile` page where users manage their account.

**Database changes:**
- Add `avatar_url` storage bucket for avatar uploads (or use URL-based avatars initially).

**New files:**
- **`src/pages/Profile.tsx`**: Profile settings page with sections for:
  - Display name and avatar (update `profiles` table)
  - Email display (read-only, from auth)
  - Change password (via `supabase.auth.updateUser`)
  - Delete account (with confirmation dialog, calls an edge function)
- **`supabase/functions/delete-account/index.ts`**: Edge function that uses service role to delete the user from `auth.users` (cascades to profiles, roles, limits, etc.)

**Other changes:**
- **`App.tsx`**: Add `/profile` route
- **`Dashboard.tsx`**: Add profile link/button in the header next to the user info
- **`supabase/config.toml`**: Register `delete-account` function

---

### Feature 5: Webhook Transformations

Allow users to define transformation rules per endpoint that reshape/filter webhook data before storage or forwarding.

**Database changes:**
- New `webhook_transforms` table:
  - `id` (uuid, PK)
  - `endpoint_id` (uuid, FK to webhook_endpoints)
  - `user_id` (uuid, not null)
  - `name` (text)
  - `transform_type` (text: 'jq', 'field_map', 'filter')
  - `transform_config` (jsonb) — stores the transformation rules
  - `is_active` (boolean, default true)
  - `execution_order` (integer, default 0)
  - `created_at`, `updated_at` (timestamptz)
- RLS: users manage their own transforms

**Transform types supported:**
1. **Field Map**: Pick/rename fields from the body (e.g., `data.email` -> `email`)
2. **Filter**: Only store webhooks matching a condition (e.g., `body.event == "payment"`)
3. **Template**: Reshape the entire body using a JSON template with `{{field}}` placeholders

**New files:**
- **`src/components/dashboard/WebhookTransforms.tsx`**: UI to create/edit/delete transform rules per endpoint. Visual field mapper, filter condition builder, and template editor.

**Updated files:**
- **`webhook-capture/index.ts`**: After receiving a webhook, fetch active transforms for the endpoint. Apply filter transforms first (skip storage if no match). Apply field map / template transforms to reshape the body before inserting.
- **`Dashboard.tsx`**: Add transforms UI within the endpoint configuration dialog or as a new sub-tab.

---

### Technical Summary

```text
New files:
  src/pages/Profile.tsx
  src/components/dashboard/WebhookTransforms.tsx
  supabase/functions/delete-account/index.ts

Modified files:
  src/App.tsx                              (add /profile route)
  src/pages/Dashboard.tsx                  (profile link, transforms UI)
  src/components/dashboard/WebhookTable.tsx (editable replay fields)
  supabase/functions/webhook-forward/index.ts (custom overrides)
  supabase/functions/webhook-capture/index.ts (apply transforms)
  supabase/config.toml                     (register delete-account)

New migration:
  - webhook_transforms table + RLS policies
  - avatars storage bucket
```

