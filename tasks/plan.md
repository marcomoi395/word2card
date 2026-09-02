# Implementation Plan: Local Vocabulary Collection and Card Generation

## Overview

Implement the approved local-first vocabulary workflow with SQLite persistence, duplicate-safe file/Notion imports, configurable OpenAI generation, bidirectional Preview/Collection synchronization, startup provider health checks, and Anki submission. Azure Speech/audio remains inactive.

## Architecture Decisions

- SQLite is owned by the main process and stored at `path.join(app.getPath('userData'), 'word2card.db')`.
- Use `better-sqlite3`; initialize and migrate before renderer operations.
- SQLite is the sole durable source of truth; renderer state is ephemeral.
- Preview and Collection use typed IPC methods and reload persisted records after writes.
- Deduplication uses `trim().toLocaleLowerCase()` and a unique normalized-word constraint.
- OpenAI defaults are `https://api.openai.com/v1` and `gpt-4o-mini`; both are user-configurable and persisted.
- Provider health is checked on every app launch and exposed as typed status data.
- No Notion write-back, Anki read-back, Azure calls, or remote speech calls.

## Dependency Graph

```text
Database bootstrap/schema
        |
        +--> Shared domain + IPC contracts
        |          |
        |          +--> Collection query/edit flow
        |          +--> Import flow (file/Notion)
        |          +--> OpenAI generation flow
        |          +--> Provider health flow
        |          +--> Anki export flow
        |
        +--> Renderer wiring and redesigned UI state
                   |
                   +--> End-to-end verification
```

## Task List

### Phase 1: Foundation

- [x] Task 1: Implement SQLite bootstrap, schema, migrations, and repositories
- [ ] Task 2: Define shared domain models and typed IPC contracts

### Checkpoint: Foundation

- [ ] Temporary SQLite database initializes and migrates twice without error
- [ ] Repository CRUD and transaction rollback tests pass
- [ ] Typecheck passes
- [ ] Human review before feature slices

### Phase 2: Collection and import vertical slices

- [ ] Task 3: Implement collection query and bidirectional record edit flow
- [ ] Task 4: Implement duplicate-safe file import and collection refresh
- [ ] Task 5: Implement duplicate-safe Notion import without write-back

### Checkpoint: Collection/import

- [ ] File and Notion imports persist real records
- [ ] Existing normalized words remain unchanged and are counted as skipped
- [ ] Preview and Collection show the same persisted records
- [ ] Focused tests pass

### Phase 3: Generation and integrations

- [ ] Task 6: Implement OpenAI settings with custom base URL and model
- [ ] Task 7: Implement generate-missing-data flow with transactional persistence
- [ ] Task 8: Implement startup provider health checks and accurate status states
- [ ] Task 9: Implement Anki submission from persisted card records

### Checkpoint: Integrations

- [ ] Custom OpenAI endpoint/model are used in requests
- [ ] Generated data survives restart and updates both views
- [ ] Startup statuses reflect configured, invalid, and unreachable providers
- [ ] Anki statuses change only on confirmed results

### Phase 4: UI integration and removal of inactive audio behavior

- [ ] Task 10: Wire the redesigned renderer UI to SQLite-backed IPC flows
- [ ] Task 11: Remove/disable Azure and remote audio behavior while preserving placeholders

### Checkpoint: Complete

- [ ] Full unit/integration/e2e tests pass
- [ ] Typecheck, lint, and build pass
- [ ] No Azure or remote speech network calls are made
- [ ] All success criteria in `SPEC.md` are verified

## Task Details

### Task 1: Implement SQLite bootstrap, schema, migrations, and repositories

**Description:** Add the main-process SQLite layer for vocabulary/card records and settings, including deterministic migrations and transaction helpers.

**Acceptance criteria:**
- DB is created under Electron `userData` as `word2card.db`.
- Schema supports normalized-word uniqueness, card fields, statuses, timestamps, and settings.
- Migrations are rerunnable and repository operations support rollback.

**Verification:** Vitest with temporary DB; run focused database tests and `bun run typecheck:node`.

**Dependencies:** None.

**Estimated complexity:** Medium (3–5 files).

### Task 2: Define shared domain models and typed IPC contracts

**Description:** Replace UI-only assumptions with shared types for records, import summaries, health states, settings, edits, generation, and Anki results.

**Acceptance criteria:**
- Renderer API exposes only explicit typed operations required by the spec.
- IPC payloads include validation-relevant fields and stable result/error codes.
- No secret plaintext is returned in status responses.

**Verification:** Typecheck both node/web projects; contract unit tests for valid/invalid payload shapes.

**Dependencies:** Task 1.

**Estimated complexity:** Medium (3–5 files).

### Task 3: Implement collection query and bidirectional record edit flow

**Description:** Add IPC/service/repository paths to load Collection/Preview records and persist validated edits from either view.

**Acceptance criteria:**
- Both views load from SQLite and support empty/loading/error states.
- Edits to supported fields persist and are visible from the other view after refresh/navigation.
- Invalid edits are rejected without overwriting the previous value.

**Verification:** Integration tests for Preview→DB→Collection and Collection→DB→Preview; focused renderer tests.

**Dependencies:** Tasks 1–2.

**Estimated complexity:** Medium (3–5 files).

### Task 4: Implement duplicate-safe file import and collection refresh

**Description:** Connect existing file parsing to transactional SQLite insertion with normalized-word deduplication and UI summary feedback.

**Acceptance criteria:**
- New words insert once; case/whitespace variants of existing words are skipped.
- Existing records are unchanged.
- UI reports inserted/skipped counts and reloads both views.

**Verification:** Unit/integration import tests plus Playwright file import flow.

**Dependencies:** Tasks 1–3.

**Estimated complexity:** Medium (3–5 files).

### Task 5: Implement duplicate-safe Notion import without write-back

**Description:** Route Notion sync through the same collection insertion path while preserving existing fetch behavior and explicitly disabling sync-back.

**Acceptance criteria:**
- Required Notion inputs are validated.
- Duplicate handling matches file import exactly.
- No Notion update/write-back request occurs.

**Verification:** Mocked Notion integration tests; Playwright validation and import flow.

**Dependencies:** Tasks 1–4.

**Estimated complexity:** Medium (3–5 files).

### Task 6: Implement OpenAI settings with custom base URL and model

**Description:** Persist OpenAI key, base URL, and model in SQLite and expose masked status plus editable settings UI.

**Acceptance criteria:**
- Defaults are applied when unset.
- Custom values persist across restart and are used by the provider client.
- Renderer receives only configured/not-configured state for secrets.

**Verification:** Settings repository/provider tests; e2e persistence test.

**Dependencies:** Tasks 1–2.

**Estimated complexity:** Medium (3–5 files).

### Task 7: Implement generate-missing-data flow with transactional persistence

**Description:** Generate missing fields for pending records, validate results, persist updates, and refresh both views.

**Acceptance criteria:**
- Configured base URL/model are honored.
- Successful records become ready and are reflected in Preview and Collection.
- Failed records preserve previous data and receive an actionable error state.

**Verification:** Mock OpenAI integration tests, rollback/partial failure tests, Playwright loading/success/error flow.

**Dependencies:** Tasks 3 and 6.

**Estimated complexity:** Medium (3–5 files).

### Task 8: Implement startup provider health checks and accurate status states

**Description:** Verify OpenAI, Notion, Pexels, and AnkiConnect configuration/connectivity when the app starts and expose accurate status data to the UI.

**Acceptance criteria:**
- Checks run on every app launch after settings/DB initialization.
- States distinguish connected, not configured, invalid configuration, and unreachable.
- UI status labels are driven by returned health data, not static markup.

**Verification:** Provider health unit/integration tests with configured/missing/failure mocks; e2e startup status test.

**Dependencies:** Tasks 1, 2, and 6.

**Estimated complexity:** Medium (3–5 files).

### Task 9: Implement Anki submission from persisted card records

**Description:** Submit validated persisted records to AnkiConnect and update local submission statuses from confirmed results.

**Acceptance criteria:**
- Required card fields are checked before submission.
- Unavailable AnkiConnect produces a clear error without false success.
- Status changes are persisted only after actual provider results.

**Verification:** Mock Anki integration tests and Playwright success/unavailable flow.

**Dependencies:** Tasks 1–3 and 8.

**Estimated complexity:** Medium (3–5 files).

### Task 10: Wire the redesigned renderer UI to SQLite-backed IPC flows

**Description:** Replace hard-coded collection/preview rows and incomplete handlers with real load, edit, import, generate, health, and submit interactions.

**Acceptance criteria:**
- Navigation, source switcher, tables, counts, loading, errors, and empty states reflect real data.
- Generate and Submit buttons invoke typed IPC operations.
- Inline edits update the persisted record and the other view.

**Verification:** Renderer tests and complete Playwright flow from startup through Anki submission.

**Dependencies:** Tasks 3–9.

**Estimated complexity:** Medium (3–5 files).

### Task 11: Remove/disable inactive Azure and remote audio behavior

**Description:** Ensure audio placeholders remain harmless while all Azure Speech and remote speech invocation paths are inactive.

**Acceptance criteria:**
- No Azure Speech request is made by any user workflow.
- Audio fields are nullable/empty and UI clearly represents unavailable future functionality.
- Existing unrelated integrations remain unaffected.

**Verification:** Unit tests assert speech provider is not invoked; source-level search and e2e interaction check.

**Dependencies:** Tasks 1–2 and 10.

**Estimated complexity:** Small (1–2 files).

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Native SQLite module rebuild mismatch with Electron | High | Add dependency early, use `electron-builder install-app-deps`, test packaged/unpacked build. |
| Existing state/store logic conflicts with DB source of truth | High | Keep compatibility wrappers temporarily; route all durable reads/writes through repositories. |
| OpenAI response shape varies by model/base URL | High | Validate structured output and isolate per-record failures. |
| Startup health checks slow app launch | Medium | Use bounded timeouts and parallel independent checks; render initial UI with explicit checking state. |
| Hard-coded UI IDs conflict between legacy and redesigned Notion flows | Medium | Define one canonical IPC/UI contract and remove duplicate event wiring during renderer task. |
| Secrets leak through IPC or logs | High | Mask responses, avoid logging payload secrets, test status contracts. |

## Parallelization Opportunities

- After Tasks 1–2 establish contracts, Tasks 4, 6, and 8 can be developed in parallel if shared files are coordinated.
- Tasks 3, 5, 7, and 9 depend on shared persistence and should be integrated sequentially at their IPC/service seams.
- Task 10 is intentionally last among feature slices because it consumes all finalized contracts.

## Open Questions

- The approved spec assumes `better-sqlite3`; implementation should pause and request approval if native rebuild constraints require a different driver.
- Exact existing card payload field names for Anki and OpenAI response schema must follow current service behavior unless tests/spec are updated first.
