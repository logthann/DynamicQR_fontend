# Feature Specification: Dynamic QR Platform for Agencies and Enterprises

**Feature Branch**: `002-dynamic-qr-google-integration`  
**Created**: 2026-03-23  
**Status**: Draft  
**Input**: User description: "Generate a software specification aligned to the constitution for a scalable Dynamic QR platform with campaign grouping, Base62 short codes, URL/event QR types, Google Analytics and Google Calendar integrations, pre-redirect tracking, and daily aggregated analytics dashboards."

## Product Overview

The product is a scalable Dynamic QR Code platform for marketing agencies and
enterprise teams. It enables teams to create editable QR codes, organize them by
campaign, track scan analytics, and integrate with Google services for attribution
and event workflows.

Core product value:
- Printed or distributed QR visuals remain reusable while destinations and metadata
  can evolve over time.
- Scan activity is captured for attribution and optimization.
- Dashboard reporting remains fast through daily aggregated analytics.

## Clarifications

### Session 2026-03-23

- Q: How should RBAC scope be enforced across tenants and owned resources? -> A: `admin` can manage all tenants; `agency` can manage only its own company users/campaigns/QRs; `user` can manage only resources they personally created.
- Q: What should the analytics aggregation cadence be for `daily_analytics_summary`? -> A: Every 5 minutes incremental aggregation plus one daily reconciliation run.
- Q: What OAuth token security level should be mandatory for Google integrations? -> A: Encrypt tokens at rest, rotate refresh tokens on use when provider supports it, and audit token access/refresh events.
- Q: How should soft-delete policy interact with FK cascade behavior? -> A: Normal app flows use soft delete only; DB cascades are reserved for exceptional admin/maintenance hard-delete operations outside normal product flows.
- Q: What durability guarantee should apply to redirect-path scan logging? -> A: Return HTTP 302 immediately after enqueueing a durable async log task, with eventual persistence guaranteed through retries and dead-letter handling.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - High-Speed Redirect and Scan Capture (Priority: P1)

As an end user, I scan a QR code and get redirected quickly while my scan telemetry is
captured before the redirect response is finalized.

**Why this priority**: Fast redirect is the core user promise and primary business
reliability requirement.

**Independent Test**: Can be tested by scanning an active QR code and verifying
redirect behavior plus creation of a scan record with required telemetry fields.

**Acceptance Scenarios**:

1. **Given** an active short code, **When** a scan request hits `/q/{short_code}`,
   **Then** the system records scan telemetry (`ip_address`, `user_agent`, device,
   OS, location) and responds with HTTP 302 to the resolved destination.
2. **Given** normal operating conditions, **When** a scan is processed,
   **Then** redirect response time remains under the defined performance target.
3. **Given** an inactive or soft-deleted QR code, **When** scanned,
   **Then** the system returns a controlled unavailable response and no final
   destination redirect.

---

### User Story 2 - Campaign-Driven Dynamic QR Management (Priority: P2)

As an agency or enterprise marketer, I organize QR codes by campaign, generate QR
codes with Base62 short codes, and manage QR content for URL and event use cases.

**Why this priority**: Campaign and QR lifecycle management enables the primary
marketer workflow and directly drives platform adoption.

**Independent Test**: Can be tested by creating a campaign, generating URL/event QR
codes, storing design configuration JSON, and updating QR settings without replacing
distributed assets.

**Acceptance Scenarios**:

1. **Given** an authenticated marketer, **When** they create a campaign (for example
   "Black Friday 2026"), **Then** QR codes can be grouped and managed within that
   campaign context.
2. **Given** a campaign, **When** a marketer creates a QR code,
   **Then** the platform generates a unique Base62 short code and links it to QR type
   `url` or `event` with destination payload.
3. **Given** a QR code, **When** the marketer saves visual preferences,
   **Then** color/logo UI design configuration is stored as flexible JSON metadata.

---

### User Story 3 - Google-Native Attribution and Event Automation (Priority: P3)

As an organizer or marketing analyst, I connect Google services so scan traffic is
attributed in GA4 and event QR creation can sync with Google Calendar.

**Why this priority**: Integrations provide high-value attribution and automation,
but rely on core QR and redirect capabilities.

**Independent Test**: Can be tested by enabling OAuth integration, creating event QR
codes, verifying stored `google_event_id`, and validating GA4-ready parameters.

**Acceptance Scenarios**:

1. **Given** Google Analytics settings are configured, **When** a QR link is created,
   **Then** the link includes `ga_measurement_id` and UTM parameters
   (`utm_source`, `utm_medium`, `utm_campaign`) for post-scan attribution.
2. **Given** an organizer has completed OAuth 2.0 authorization,
   **When** an `event` QR code is created, **Then** the platform creates the calendar
   event in Google Calendar and stores the resulting `google_event_id`.
3. **Given** dashboard users request analytics, **When** data is loaded,
   **Then** daily aggregated analytics are used instead of full raw scan-log queries.

---

### User Story 4 - Calendar-to-Campaign Sync and Reconciliation (Priority: P3)

As a marketer, I can load Google Calendar events for a selected month or year,
choose events to import as campaigns, and see whether each campaign is synced,
out-of-sync, or not linked.

**Why this priority**: Teams need two-way visibility between campaigns and calendar
entries to avoid duplicate work and stale campaign timelines.

**Independent Test**: Can be tested by fetching event lists by period, importing a
subset into campaigns, editing either side, and verifying sync status icon changes.

**Acceptance Scenarios**:

1. **Given** a connected Google Calendar integration, **When** the user requests
   events for a month or year, **Then** the system returns event list data with
   import/sync status for each candidate.
2. **Given** selected Google events, **When** user confirms import,
   **Then** campaigns are created or updated without duplicates and linked to
   their Google event identifiers.
3. **Given** a linked campaign, **When** Google event or campaign content changes,
   **Then** the dashboard shows an out-of-sync icon state until user syncs again.
4. **Given** a linked campaign, **When** user chooses remove-from-calendar,
   **Then** the remote Google event is deleted and local link status updates.

---

### Edge Cases

- Short code collision occurs during Base62 generation.
- A scan arrives while QR status changes from active to paused.
- Google Calendar API call succeeds after local timeout, risking duplicate events on
  retry.
- OAuth refresh token becomes invalid or revoked by user.
- Location metadata cannot be resolved due to privacy controls.
- Analytics aggregation job is delayed; dashboard should show last successful summary
  time with graceful fallback behavior.
- Imported Google event is deleted externally after campaign creation.
- Same Google event appears in repeated month/year sync windows and must not create
  duplicate campaigns.
- Campaign was edited locally while remote Google event was edited by organizer,
  requiring explicit conflict/out-of-sync status.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support campaign-based grouping of QR codes for agencies and
  enterprise users.
- **FR-002**: System MUST allow campaign creation, update, archive, and retrieval
  using soft-delete-safe lifecycle behavior.
- **FR-003**: System MUST generate unique Base62 short codes for each QR code.
- **FR-004**: System MUST support QR types `url` and `event`.
- **FR-005**: System MUST allow QR design configuration (including colors and logos)
  to be stored as JSON metadata.
- **FR-006**: System MUST resolve `/q/{short_code}` and return HTTP 302 redirect for
  active QR codes.
- **FR-007**: System MUST capture `ip_address`, `user_agent`, device type, OS, and
  location for scans before redirect completion.
- **FR-008**: System MUST store raw scan events in `scan_logs` as immutable records.
- **FR-009**: System MUST maintain daily aggregated analytics in
  `daily_analytics_summary` using scheduled background aggregation jobs.
- **FR-018**: Analytics aggregation MUST run every 5 minutes for incremental updates
  and run a daily reconciliation job to correct drift and support safe backfill.
- **FR-010**: Dashboard analytics queries MUST read from aggregated daily summaries by
  default and MUST NOT depend on direct full-table raw scan log queries.
- **FR-011**: System MUST support GA4 integration by attaching
  `ga_measurement_id`, `utm_source`, `utm_medium`, and `utm_campaign` to QR tracking
  links and/or equivalent Measurement Protocol payload mapping.
- **FR-012**: System MUST support OAuth 2.0 authorization for Google integrations,
  including secure storage of access and refresh tokens.
- **FR-013**: When an `event` QR is created, system MUST create a corresponding Google
  Calendar event and persist the resulting `google_event_id`.
- **FR-014**: Authentication MUST use JWT and password storage MUST use bcrypt.
- **FR-015**: Authorization MUST enforce RBAC roles `admin`, `agency`, and `user`
  across campaign, QR, and integration resources.
- **FR-017**: RBAC scope MUST enforce tenant ownership boundaries: `admin` manages
  all tenants, `agency` manages only resources within its own company boundary,
  and `user` manages only resources they created.
- **FR-016**: Core entities (`users`, `campaigns`, `qr_codes`) MUST use soft deletes
  (`deleted_at`) instead of physical deletion in standard workflows.
- **FR-019**: OAuth integration credentials MUST store access and refresh tokens with
  encryption at rest, apply refresh-token rotation when provider capabilities allow,
  and keep auditable records of token access and refresh operations.
- **FR-020**: Standard application workflows MUST use soft deletes for core entities;
  FK cascade behavior is permitted only for controlled administrative maintenance
  hard-delete operations and MUST be audited.
- **FR-021**: Redirect handling MUST return HTTP 302 immediately after placing scan
  metadata into a durable asynchronous logging pipeline; the pipeline MUST guarantee
  eventual persistence with retry logic and dead-letter handling for failures.
- **FR-022**: System MUST provide Google Calendar event listing endpoints with
  period filters for at least month and year windows.
- **FR-023**: System MUST allow users to select one or multiple Google Calendar
  events and import them into campaigns.
- **FR-024**: Event-to-campaign import MUST be idempotent for a given user and
  Google event identifier to prevent duplicate campaign creation.
- **FR-025**: System MUST persist calendar-link metadata per campaign, including
  `google_event_id`, sync status, and last sync timestamp.
- **FR-026**: System MUST detect campaign/calendar drift and expose status values
  for dashboard icon rendering (`not_linked`, `synced`, `out_of_sync`, `removed`).
- **FR-027**: System MUST support user-triggered sync actions to push campaign
  changes to Google Calendar and refresh local sync status.
- **FR-028**: System MUST support user-triggered remove-from-calendar action that
  deletes linked Google event and updates local campaign sync metadata.

### Constitution Alignment Requirements *(mandatory for backend/API features)*

- **CA-001**: Implementation MUST stay within approved stack constraints (Python,
  FastAPI, MySQL, SQLAlchemy ORM) unless explicit maintainer approval is recorded.
- **CA-002**: API design MUST follow RESTful conventions and layered boundaries
  (routing, service, repository/data access).
- **CA-003**: Core tables (`users`, `campaigns`, `qr_codes`) MUST use soft deletes
  (`deleted_at`) in application workflows.
- **CA-004**: Authentication MUST use JWT, password handling MUST use bcrypt, and
  authorization MUST enforce RBAC roles (`admin`, `agency`, `user`).
- **CA-005**: Third-party OAuth 2.0 integrations MUST define secure access/refresh
  token storage and rotation behavior.
- **CA-006**: Redirect-heavy paths MUST define sub-200ms target strategy including
  async processing, Redis lookup caching, and async queue ingestion for scan logs.
- **CA-007**: Analytics design MUST separate raw scan ingestion from cron-driven
  daily materialized summaries (`daily_analytics_summary`).
- **CA-008**: Endpoint definitions MUST include complete OpenAPI metadata (summary,
  description, request/response models, and error responses) in the same delivery
  scope as implementation.

### Assumptions

- Agencies and enterprises may manage multiple campaigns concurrently.
- Event QR creation requires prior Google OAuth consent by organizer accounts.
- Scan location is approximate and may be unavailable in some regions or privacy
  contexts.
- Daily analytics summary refresh cadence is sufficient for dashboard decision-making.

### Dependencies

- Google Analytics 4 property and credential configuration.
- Google Calendar API access and OAuth 2.0 client configuration.
- Reliable scheduling mechanism for daily aggregation jobs.

### Scope Boundaries

- In scope: campaign/QR workflows, redirect tracking, GA4 parameter integration,
  Google Calendar event sync, and daily analytics summary consumption.
- Out of scope: non-Google third-party integrations, full BI report designer,
  frontend design tooling implementation details.

### Key Entities *(include if feature involves data)*

- **User**: platform actor with role (`admin`, `agency`, `user`), identity, and
  integration permissions.
- **Campaign**: marketing container for QR assets, with lifecycle state and
  soft-delete metadata.
- **CampaignCalendarSyncState**: calendar synchronization metadata for campaigns,
  including link state, remote event id, and last reconciliation timestamps.
- **QRCode**: dynamic QR definition with Base62 short code, type (`url` or `event`),
  destination payload, design configuration JSON, and lifecycle state.
- **ScanLog**: immutable raw scan event capturing network/device/location attributes.
- **DailyAnalyticsSummary**: pre-aggregated per-day metrics used by dashboards.
- **OAuthIntegrationCredential**: securely stored OAuth access/refresh token context
  for Google services.
- **GoogleCalendarEventLink**: mapping between QR event payloads and stored
  `google_event_id`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 95% of valid `/q/{short_code}` redirects complete in under
  200 ms during normal operating load.
- **SC-002**: Platform supports up to 1,000,000 scan events per day without critical
  data loss in scan logging.
- **SC-003**: At least 99% of successful scans contain complete required telemetry
  fields except where source data is unavailable.
- **SC-004**: Daily dashboard queries for campaign scan trends return in under
  2 seconds for 95% of requests when using aggregated data.
- **SC-005**: At least 98% of OAuth-authorized `event` QR creations result in a
  stored `google_event_id` within one processing cycle.
- **SC-006**: At least 95% of new QR tracking links include GA4 measurement and UTM
  attribution parameters when integration is enabled.
- **SC-007**: At least 99% of repeated month/year imports avoid duplicate campaign
  creation for the same Google event id and owner.
- **SC-008**: At least 95% of linked campaigns show correct sync icon state within
  one reconciliation cycle after local or remote edits.
