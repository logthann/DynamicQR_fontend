# Quickstart: Dynamic QR Platform for Agencies and Enterprises

## Goal
Validate key architecture behavior for redirect performance, asynchronous scan logging, and aggregated analytics reads.
Also validate Google Calendar month/year sync workflows and campaign reconciliation status.

## Prerequisites
- Python 3.12
- MySQL
- Redis (for short-code cache)
- Scheduler/worker runtime for queue and aggregation jobs

## Setup Checklist
1. Configure environment variables for database, JWT, OAuth providers, Redis, and queue backend.
2. Apply schema migrations for all 7 required tables.
3. Start API service.
4. Start async scan-log worker (if queue mode enabled).
5. Start aggregation scheduler (5-minute cadence + daily reconciliation).

## Operational Runbook
1. Database migration:
   - `alembic upgrade head`
2. API startup:
   - `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`
3. Queue worker loop (manual trigger pattern):
   - continuously call `process_next_scan_log_message()` from `app/workers/scan_log_worker.py`
4. Aggregation jobs:
   - call `run_incremental_aggregation()` every 5 minutes
   - call `run_daily_reconciliation()` daily for full-day correctness

## Verification Notes
- Ensure `.env` includes tuned values for `DB_POOL_SIZE`, `DB_MAX_OVERFLOW`,
  `REDIS_SHORT_CODE_TTL_SECONDS`, and `QUEUE_MAX_RETRY_ATTEMPTS`.
- Confirm `/q/{short_code}` returns HTTP 302 while scan logs are persisted asynchronously.
- Confirm `daily_analytics_summary` receives upserts from both incremental and reconciliation jobs.
- Confirm OAuth token refresh emits both `token_access` and `token_refresh` audit events.

## Functional Verification
1. Register/login and verify RBAC scope boundaries: `admin` all-tenant,
   `agency` company-scoped, `user` creator-scoped.
2. Create campaign and QR with Base62 short code.
3. Access `/q/{short_code}` and verify HTTP 302 behavior.
4. Confirm redirect returns after durable async enqueue and scan metadata is
   eventually persisted to `scan_logs`.
5. Create `event` QR and verify `google_event_id` persistence.
6. Verify dashboard endpoints read from `daily_analytics_summary`.
7. Verify OAuth tokens are encrypted at rest and token access/refresh events are
   captured in audit logs.
8. Verify standard delete actions for core entities set `deleted_at` (soft delete)
   and do not trigger normal-flow hard delete/cascade behavior.
9. Fetch Google Calendar events by selected `month` and `year` and verify response
   includes sync/icon status for each candidate event.
10. Import a subset of events into campaigns and verify idempotent behavior when
    re-importing the same window.
11. Change one linked campaign locally (or edit remote event) and verify dashboard
    icon/status transitions to `out_of_sync` until sync is triggered.
12. Run remove-from-calendar action and verify remote event deletion plus local
    status update to `removed`.

## Calendar Sync API Smoke Commands

```powershell
# List month events with sync metadata for dashboard icons
Invoke-RestMethod -Method Get -Uri "http://localhost:8000/api/v1/integrations/google-calendar/events?range_type=month&year=2026&month=11" -Headers @{ "x-user-id"="1"; "x-role"="agency" }

# Import selected events into campaigns (idempotent)
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/v1/integrations/google-calendar/import-campaigns" -Headers @{ "Content-Type"="application/json"; "x-user-id"="1"; "x-role"="agency" } -Body '{"range_type":"month","year":2026,"month":11,"event_ids":["evt-123","evt-456"]}'

# Push one campaign to Google Calendar (create/update linked event)
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/v1/campaigns/1/calendar/sync" -Headers @{ "x-user-id"="1"; "x-role"="agency" }

# Remove linked calendar event from campaign
Invoke-RestMethod -Method Delete -Uri "http://localhost:8000/api/v1/campaigns/1/calendar/link" -Headers @{ "x-user-id"="1"; "x-role"="agency" }
```

## Performance Verification
- Run load tests on `/q/{short_code}` and confirm p95 < 200 ms under representative traffic.
- Verify queue lag, retry behavior, dead-letter handling, and scan-write success
  rate under peak simulation.

## Exit Criteria
- All schema constraints and indexes are present.
- Redirect performance and asynchronous logging behavior meet plan targets.
- Aggregation jobs upsert summary data correctly using (`qr_id`, `summary_date`).
- RBAC, OAuth token controls, and soft-delete lifecycle checks pass.

