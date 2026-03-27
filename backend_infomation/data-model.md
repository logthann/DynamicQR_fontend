# Data Model: Dynamic QR Platform for Agencies and Enterprises

## Table 1: users
- Columns:
  - `id` (PK)
  - `email` (UNIQUE)
  - `password_hash`
  - `company_name`
  - `role` (CHECK: `admin`, `agency`, `user`)
  - `subscription_plan`
  - `created_at`
  - `updated_at`
  - `deleted_at`
- Notes:
  - Soft delete enabled through `deleted_at`.
  - Ownership model supports RBAC scope: `admin` all-tenant, `agency`
    company-scoped, `user` creator-scoped.

## Table 2: user_integrations
- Columns:
  - `id` (PK)
  - `user_id` (FK -> users.id)
  - `provider_name` (CHECK: `google_calendar`, `google_analytics`)
  - `access_token`
  - `refresh_token`
  - `expires_at`
- Constraints:
  - UNIQUE (`user_id`, `provider_name`)
- Security notes:
  - `access_token` and `refresh_token` are stored encrypted at rest.
  - Refresh-token rotation is applied when provider capabilities support rotation.
  - Token access and refresh actions are audit logged.

## Table 3: campaigns
- Columns:
  - `id` (PK)
  - `user_id` (FK -> users.id)
  - `name`
  - `description`
  - `start_date`
  - `end_date`
  - `status`
  - `google_event_id` (nullable, remote Google Calendar id)
  - `calendar_sync_status` (enum-like string: `not_linked`, `synced`, `out_of_sync`, `removed`)
  - `calendar_last_synced_at` (nullable datetime)
  - `calendar_sync_hash` (nullable deterministic hash for drift detection)
  - `created_at`
  - `updated_at`
  - `deleted_at`
- Constraints:
  - `user_id` ON DELETE CASCADE
- Notes:
  - Soft delete enabled through `deleted_at`.
  - ON DELETE CASCADE is reserved for controlled maintenance hard-delete flows,
    not normal application workflows.
  - Index recommendation: (`user_id`, `google_event_id`) for idempotent import checks.
  - `calendar_sync_status` is used by dashboard UI icon rendering.

## Table 4: qr_codes
- Columns:
  - `id` (PK)
  - `user_id` (FK -> users.id)
  - `campaign_id` (FK -> campaigns.id)
  - `name`
  - `short_code` (UNIQUE)
  - `destination_url`
  - `qr_type`
  - `design_config` (JSON)
  - `ga_measurement_id`
  - `utm_source`
  - `utm_medium`
  - `utm_campaign`
  - `status`
  - `created_at`
  - `updated_at`
  - `deleted_at`
- Constraints:
  - `campaign_id` ON DELETE SET NULL
- Notes:
  - Soft delete enabled through `deleted_at`.

## Table 5: qr_event_details
- Columns:
  - `id` (PK)
  - `qr_id` (FK -> qr_codes.id, UNIQUE for 1-to-1)
  - `event_title`
  - `start_datetime`
  - `end_datetime`
  - `location`
  - `description`
  - `google_event_id`
  - `updated_at`

## Table 6: scan_logs
- Columns:
  - `id` (BIGINT PK)
  - `qr_id` (FK -> qr_codes.id)
  - `scanned_at`
  - `ip_address`
  - `user_agent`
  - `device_type`
  - `os`
  - `browser`
  - `country`
  - `city`
  - `referer`
- Required Indexes:
  - INDEX (`qr_id`, `scanned_at`)
- Ingestion notes:
  - Redirect path writes to this table via durable async queue processing with
    retry and dead-letter handling.

## Table 7: daily_analytics_summary
- Columns:
  - `id` (PK)
  - `qr_id` (FK -> qr_codes.id)
  - `summary_date`
  - `total_scans`
  - `unique_visitors`
- Constraints:
  - UNIQUE (`qr_id`, `summary_date`) for UPSERT

## Aggregation Semantics
- Source: `scan_logs`
- Target: `daily_analytics_summary`
- Frequency: every 5 minutes plus daily reconciliation
- Behavior: idempotent UPSERT keyed by (`qr_id`, `summary_date`)

## Deletion Policy
- Standard application operations use soft delete for `users`, `campaigns`, and
  `qr_codes`.
- Physical delete operations are restricted to audited maintenance procedures.

## Calendar Reconciliation Semantics
- Event import window supports month and year modes.
- Import is idempotent by owner + `google_event_id`; repeated sync does not create
  duplicate campaigns.
- Reconciliation compares remote mapped fields against `calendar_sync_hash`:
  - unchanged -> `synced`
  - mismatch -> `out_of_sync`
  - no link -> `not_linked`
  - remote removed by user action -> `removed`

