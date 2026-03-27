# Research: Dynamic QR Platform for Agencies and Enterprises

## Decision 1: Persistence model and schema strictness
- Decision: Implement exactly 7 MySQL tables required by business constraints with SQLAlchemy mappings.
- Rationale: Guarantees business-level data compatibility and avoids drift during implementation.
- Alternatives considered:
  - Merging event data into `qr_codes`: rejected because explicit one-to-one event details are required.
  - Storing analytics only in raw logs: rejected because dashboards must use aggregated summaries.

## Decision 2: Redirect-path latency strategy
- Decision: Use cache-first short-code lookup and return HTTP 302 immediately after durable enqueue to async logging.
- Rationale: Protects `/q/{short_code}` latency target (<200 ms p95) while guaranteeing eventual scan persistence.
- Alternatives considered:
  - Synchronous insert before redirect: rejected due to user-visible latency impact.

## Decision 3: Asynchronous ingestion path
- Decision: Use queue-backed durable async ingestion with retry and dead-letter handling as the default scan-log write path.
- Rationale: Meets clarified durability requirement while maintaining fast redirect latency.
- Alternatives considered:
  - In-process background task only: rejected because it does not provide sufficient durability guarantees.

## Decision 4: Analytics materialization cadence
- Decision: Run aggregation every 5 minutes with daily reconciliation.
- Rationale: Balances fresh dashboard data with stable read performance and lock avoidance.
- Alternatives considered:
  - Daily-only aggregation: rejected because near-real-time reporting is needed.

## Decision 5: Security model
- Decision: JWT auth + bcrypt password hashing + strict RBAC roles (`admin`, `agency`, `user`) with explicit scope boundaries (`admin` all-tenant, `agency` company-scoped, `user` creator-scoped).
- Rationale: Satisfies constitution and clarified authorization boundaries for multi-tenant safety.
- Alternatives considered:
  - Session-only auth: rejected for stateless API scaling constraints.

## Decision 6: OAuth integration storage
- Decision: Store provider credentials in `user_integrations` with unique (`user_id`, `provider_name`), encryption at rest, refresh-token rotation when supported, and audit logs for token access/refresh.
- Rationale: Provides deterministic provider linkage and enforces clarified security controls.
- Alternatives considered:
  - Embedded tokens in user profile: rejected due to security and normalization concerns.

## Decision 7: Soft delete versus FK cascade behavior
- Decision: Standard application workflows use soft deletes; FK cascade behavior is reserved for controlled maintenance hard-delete operations.
- Rationale: Preserves auditability and constitution compliance while allowing exceptional cleanup operations.
- Alternatives considered:
  - Normal-flow hard deletes with cascade: rejected due to data lifecycle and audit risks.

## End-to-End Validation Findings
- Added integration schemas, repository, OAuth service, Google Calendar sync service,
  GA4 helper service, integration endpoints, analytics aggregation jobs, analytics
  repository/service, and dashboard endpoint.
- Verified targeted test suites for US3 and polish tasks pass, including endpoint,
  service, repository, and scheduler-adjacent coverage.
- Confirmed aggregation design uses idempotent UPSERT semantics keyed by
  (`qr_id`, `summary_date`) and is wired for both 5-minute and daily execution paths.
- Confirmed OAuth refresh flow records both token-access and token-refresh audit events.

