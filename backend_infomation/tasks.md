# Tasks: Dynamic QR Platform for Agencies and Enterprises

**Input**: Design documents from `specs/002-dynamic-qr-google-integration/`
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Test tasks are not explicitly requested in the feature specification; this task list focuses on implementation and validation tasks.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize project scaffolding and baseline tooling.

- [x] T001 Create backend package structure in `app/__init__.py`, `app/api/v1/__init__.py`, and `app/workers/__init__.py`
- [x] T002 Initialize dependency manifest for backend services in `requirements.txt`
- [x] T003 [P] Create environment template and settings model in `.env.example` and `app/core/config.py`
- [x] T004 [P] Configure application bootstrap and router registration in `app/main.py`
- [x] T005 [P] Configure baseline test harness files in `pytest.ini` and `tests/conftest.py`
- [x] T006 [P] Configure lint/format/type-check defaults in `pyproject.toml`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build core architecture required before user story implementation.

**CRITICAL**: No user story work begins until this phase is complete.

- [x] T007 Implement async database engine/session lifecycle in `app/db/session.py`
- [x] T008 Implement declarative base and soft-delete/timestamp mixins in `app/db/base.py` and `app/models/mixins.py`
- [x] T009 Initialize Alembic runtime configuration in `app/db/migrations/env.py`
- [x] T010 Implement initial migration for all 7 required tables/constraints in `app/db/migrations/versions/0001_initial_schema.py`
- [x] T011 [P] Implement JWT and bcrypt utilities in `app/core/security.py`
- [x] T012 [P] Implement RBAC scope guards (`admin` all-tenant, `agency` company-scoped, `user` creator-scoped) in `app/core/rbac.py`
- [x] T013 [P] Implement Redis cache client for short-code lookups in `app/core/cache.py`
- [x] T014 [P] Implement durable queue and dead-letter interfaces in `app/workers/queue_client.py`
- [x] T015 Implement repository base with default soft-delete filtering in `app/repositories/base.py`
- [x] T016 Implement OAuth token encryption helpers in `app/core/token_crypto.py`
- [x] T017 Implement audit event logger for token and maintenance operations in `app/core/audit.py`
- [x] T018 Implement scheduler bootstrap for 5-minute and daily aggregation jobs in `app/workers/scheduler.py`

**Checkpoint**: Foundational services are ready; user stories can begin.

---

## Phase 3: User Story 1 - High-Speed Redirect and Scan Capture (Priority: P1) 🎯 MVP

**Goal**: Deliver fast `/q/{short_code}` redirects with durable async scan capture.

**Independent Test**: Scan an active QR short code and verify immediate HTTP 302 plus eventual persisted scan log.

### Implementation for User Story 1

- [x] T019 [P] [US1] Create redirect and scan metadata schemas in `app/schemas/redirect.py`
- [x] T020 [P] [US1] Implement cache-first short-code resolver in `app/repositories/qr_codes.py`
- [x] T021 [US1] Implement redirect URL builder with UTM support in `app/services/redirect_service.py`
- [x] T022 [US1] Implement `GET /q/{short_code}` endpoint in `app/api/v1/redirect.py`
- [x] T023 [US1] Implement scan metadata extraction service in `app/services/scan_metadata_service.py`
- [x] T024 [US1] Implement durable scan enqueue service in `app/services/scan_enqueue_service.py`
- [x] T025 [US1] Implement scan log consumer worker for `scan_logs` writes in `app/workers/scan_log_worker.py`
- [x] T026 [US1] Implement retry and dead-letter handling in `app/workers/scan_log_worker.py`
- [x] T027 [US1] Implement inactive/soft-deleted QR response behavior in `app/api/v1/redirect.py`
- [x] T028 [US1] Add redirect latency and queue lag instrumentation in `app/core/metrics.py` and `app/services/redirect_service.py`

**Checkpoint**: Redirect and scan-capture flow is independently functional.

---

## Phase 4: User Story 2 - Campaign-Driven Dynamic QR Management (Priority: P2)

**Goal**: Deliver campaign and QR lifecycle management with Base62 codes and soft-delete-safe behavior.

**Independent Test**: Create campaign, create URL/event QR, persist design JSON, and manage lifecycle without hard deletes.

### Implementation for User Story 2

- [x] T029 [P] [US2] Create campaign and QR schemas (including `design_config` JSON) in `app/schemas/campaign.py` and `app/schemas/qr_code.py`
- [x] T030 [P] [US2] Implement Base62 short-code generator with collision retry hooks in `app/services/short_code_service.py`
- [x] T031 [P] [US2] Implement campaign repository with soft-delete lifecycle in `app/repositories/campaigns.py`
- [x] T032 [P] [US2] Implement QR repository with status and campaign linkage in `app/repositories/qr_codes.py`
- [x] T033 [US2] Implement campaign service with RBAC ownership checks in `app/services/campaign_service.py`
- [x] T034 [US2] Implement QR service for URL/event types and `design_config` persistence in `app/services/qr_service.py`
- [x] T035 [US2] Implement campaign CRUD endpoints in `app/api/v1/campaigns.py`
- [x] T036 [US2] Implement QR CRUD/status endpoints in `app/api/v1/qr_codes.py`
- [x] T037 [US2] Implement maintenance-only hard-delete guarded workflow in `app/services/maintenance_service.py`
- [x] T038 [US2] Apply soft-delete filtering to campaign/QR list and read flows in `app/api/v1/campaigns.py` and `app/api/v1/qr_codes.py`

**Checkpoint**: Campaign and QR management is independently functional.

---

## Phase 5: User Story 3 - Google-Native Attribution and Event Automation (Priority: P3)

**Goal**: Deliver Google OAuth integrations, event sync, and summary-based analytics consumption.

**Independent Test**: Connect Google integrations, create event QR with persisted `google_event_id`, and load dashboard from daily summaries.

### Implementation for User Story 3

- [x] T039 [P] [US3] Create integration and analytics schemas in `app/schemas/integrations.py` and `app/schemas/analytics.py`
- [x] T040 [P] [US3] Implement provider credential repository with unique key handling in `app/repositories/user_integrations.py`
- [x] T041 [US3] Implement OAuth connect/callback/refresh/revoke service with encrypted token storage in `app/services/integration_service.py`
- [x] T042 [US3] Implement Google Calendar event sync and `google_event_id` persistence in `app/services/google_calendar_service.py`
- [x] T043 [US3] Implement GA4 link parameter and measurement payload builder in `app/services/google_analytics_service.py`
- [x] T044 [US3] Implement integration endpoints for Google providers in `app/api/v1/integrations.py`
- [x] T045 [US3] Implement 5-minute incremental and daily reconciliation aggregation jobs in `app/workers/analytics_aggregator.py`
- [x] T046 [US3] Implement analytics summary repository/service reading `daily_analytics_summary` in `app/repositories/daily_analytics_summary.py` and `app/services/analytics_service.py`
- [x] T047 [US3] Implement dashboard analytics endpoint in `app/api/v1/analytics.py`
- [x] T048 [US3] Add OAuth token access/refresh audit event recording in `app/services/integration_service.py` and `app/core/audit.py`

**Checkpoint**: Google integrations and analytics dashboard flow is independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finalize cross-story quality, documentation, and operational tuning.

- [x] T049 [P] Complete OpenAPI metadata for all API modules in `app/api/v1/auth.py`, `app/api/v1/campaigns.py`, `app/api/v1/qr_codes.py`, `app/api/v1/integrations.py`, `app/api/v1/analytics.py`, and `app/api/v1/redirect.py`
- [x] T050 [P] Update operational runbook and verification notes in `specs/002-dynamic-qr-google-integration/quickstart.md`
- [x] T051 Tune queue, Redis, and DB pool settings for target throughput in `app/core/config.py`
- [x] T052 Document end-to-end validation findings in `specs/002-dynamic-qr-google-integration/research.md`
- [x] T053 Review and finalize RBAC and maintenance-delete audit policy notes in `specs/002-dynamic-qr-google-integration/plan.md`

---

## Phase 7: Calendar Campaign Sync Expansion (User Story 4 - P3)

**Goal**: Support month/year Google Calendar event retrieval, selective campaign import,
sync reconciliation, and dashboard icon state.

**Independent Test**: Pull events for a target month/year, import selected events,
simulate local/remote edits, and verify `calendar_sync_status` icon states.

### Implementation for User Story 4

- [x] T054 [US4] Add migration to extend `campaigns` with `google_event_id`, `calendar_sync_status`, `calendar_last_synced_at`, and `calendar_sync_hash` in `app/db/migrations/versions/0002_campaign_calendar_sync_metadata.py`
- [x] T055 [P] [US4] Extend campaign schemas with calendar sync fields and icon-ready status enum in `app/schemas/campaign.py`
- [x] T056 [P] [US4] Implement Google Calendar list-events (month/year window) in `app/services/google_calendar_service.py`
- [x] T057 [US4] Implement idempotent event-to-campaign import service in `app/services/campaign_calendar_sync_service.py`
- [x] T058 [US4] Add repository methods for owner-scoped lookup by `google_event_id` and sync metadata updates in `app/repositories/campaigns.py`
- [x] T059 [US4] Implement reconciliation hash utility for drift detection in `app/services/campaign_calendar_sync_service.py`
- [x] T060 [US4] Add integration endpoint `GET /api/v1/integrations/google-calendar/events` with `month|year` filters in `app/api/v1/integrations.py`
- [x] T061 [US4] Add integration endpoint `POST /api/v1/integrations/google-calendar/import-campaigns` for multi-select imports in `app/api/v1/integrations.py`
- [x] T062 [US4] Add campaign endpoint `POST /api/v1/campaigns/{campaign_id}/calendar/sync` in `app/api/v1/campaigns.py`
- [x] T063 [US4] Add campaign endpoint `DELETE /api/v1/campaigns/{campaign_id}/calendar/link` for remove-from-calendar flow in `app/api/v1/campaigns.py`
- [x] T064 [US4] Project `calendar_sync_status` in dashboard and campaign list responses for icon rendering in `app/api/v1/campaigns.py` and `app/services/campaign_service.py`
- [x] T065 [US4] Add tests for import idempotency, reconciliation states, and sync/remove endpoints in `tests/test_google_calendar_service.py`, `tests/test_campaign_service.py`, and `tests/test_campaign_endpoints.py`
- [x] T066 [US4] Update OpenAPI contract and quickstart guidance for calendar sync UX in `specs/002-dynamic-qr-google-integration/contracts/openapi.yaml` and `specs/002-dynamic-qr-google-integration/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1): starts immediately.
- Foundational (Phase 2): depends on Setup; blocks all user stories.
- User Story phases (Phase 3-5): depend on Foundational completion.
- Polish (Phase 6): depends on selected user stories completion.
- Calendar Sync Expansion (Phase 7): depends on US3 OAuth/calendar baseline.

### User Story Dependencies

- US1 (P1): starts after Foundational; no dependency on US2/US3.
- US2 (P2): starts after Foundational; independent from US1 but shares core modules.
- US3 (P3): starts after Foundational and depends on US2 QR/integration model flows.
- US4 (P3): starts after US3 and depends on campaigns + Google Calendar integration baseline.

### Dependency Graph

- Foundation -> US1
- Foundation -> US2 -> US3
- US3 -> US4
- US1 + US2 + US3 + US4 -> Polish

---

## Parallel Execution Examples

### User Story 1

- Run T019 and T020 in parallel (separate schema and repository files).
- Run T023 and T024 in parallel (metadata extraction and enqueue service).

### User Story 2

- Run T029, T030, T031, and T032 in parallel (different files).
- Run T035 and T036 in parallel after services T033 and T034 are done.

### User Story 3

- Run T039 and T040 in parallel.
- Run T042 and T043 in parallel after integration service baseline in T041.

---

## Implementation Strategy

### MVP First (US1)

1. Complete Setup and Foundational phases.
2. Complete US1 redirect and durable scan-capture flow.
3. Validate redirect latency and eventual scan persistence behavior.
4. Stop for MVP review before expanding scope.

### Incremental Delivery

1. Deliver US1 for core redirect value.
2. Add US2 for campaign and QR lifecycle operations.
3. Add US3 for Google integrations and dashboard analytics.
4. Complete Polish tasks for operations and documentation.

### Parallel Team Strategy

1. Team completes Setup + Foundational together.
2. Developer A: US1 redirect and queue path.
3. Developer B: US2 campaign/QR lifecycle.
4. Developer C: US3 integrations and analytics aggregation.
5. Merge in Polish phase after story-level checkpoints.

## Notes

- `[P]` marks tasks that can run in parallel with minimal file conflict.
- `[US1]`, `[US2]`, `[US3]` labels map implementation work directly to user stories.
- All file paths are explicit so tasks are immediately executable by an implementation agent.
