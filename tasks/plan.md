# Implementation Plan: High-Confidence E2E Coverage After Application Refactor

## Overview

This plan turns the approved `SPEC.md` into incremental, verifiable work. The objective is to make the Electron E2E suite trustworthy after the application refactor: isolate app state, test real user-visible behavior through renderer/preload/IPC, mock third-party boundaries deterministically, and enforce a Linux CI quality gate.

Repository discovery confirms the post-refactor UI includes Import, Collection, and Settings navigation. Notion is a source switch inside Import and also has a legacy section/state path, so it must be handled as an explicit compatibility-risk slice rather than assumed to be a standalone tab. Collection CRUD, generation, Anki submission, provider health, and Notion sync are user-visible flows exposed through the renderer and preload IPC.

Implementation remains blocked on unresolved discovery questions where the exact post-refactor UI contract or safest mock boundary is not yet confirmed.

## Architecture Decisions

1. **Keep the existing stack.** Use Electron, TypeScript, Bun, Playwright Test, and Vitest. Do not add a new framework unless explicitly approved.
2. **Isolate persistence at launch.** Every E2E app instance must use a test-specific Electron user-data root so Electron Store, SQLite, and audio files cannot leak across runs.
3. **Use two lifecycle modes.** Retain a shared app fixture only for tests that can be safely reset; provide a dedicated launch/restart fixture for persistence and lifecycle scenarios.
4. **Use existing narrow boundaries.** Renderer calls a minimal preload API, which maps to explicit IPC channels in `src/shared/ipc.ts`; tests should observe or mock at those existing channels/adapters rather than inventing a broad test API.
5. **Test behavior at the claimed boundary.** UI E2E must use the real renderer and preload bridge. Third-party services are mocked at an explicit adapter/network/IPC boundary and never require live credentials.
6. **Prefer web-first assertions.** Replace arbitrary sleeps, `toBeDefined()`, and manual final-state injection with deterministic locators, assertions, and observable signals.
7. **Preserve Electron security defaults.** No Node integration, context-isolation, IPC, or preload weakening to make tests easier.
8. **Vertical slices.** Each core flow task leaves a runnable subset and includes focused verification before the next slice.

## Dependency Graph

```text
test-foundation
  → ui-navigation
  → contract-discovery
       ├── file-import
       ├── settings
       └── collections
              └── external-integrations
                    └── quality-gate
```
Relevant runtime boundaries discovered during planning:

- Persistence: `app.getPath('userData')/word2card.db`, Electron Store `secrets.json`, and `userData/audio`.
- Preload/IPC: window controls, file dialog, import, collection CRUD, generation, Anki, settings, and provider-health channels.
- Adapters: OpenAI, Notion, Pexels, Azure Speech, and Anki Connect (`localhost:8765`).
- Existing lower-level mocks: IPC handler mocks, in-memory SQLite service tests, mocked SDK/fetch clients, and mocked orchestration adapters.
- Compatibility risks: Notion source switch and legacy section share state; `src/shared/ipc.ts` contains duplicate generation-related type declarations that must not be silently papered over in E2E.

## Current Flow Matrix (Contract-Locked)

| User-visible flow | Renderer surface | Preload API / IPC channel | Contract decision |
|---|---|---|---|
| Import tab and file source | `#tab-import-btn`, `#source-file-btn`, `#source-file`, `#deck`, `#btn-action-import` | `openFileDialog` / `open-file-dialog`; `sendImport` / `send-import` with `FileImportRequest` | E2E: validation, picker, local submit, and drag/drop. |
| Notion source switch | `#tab-notion-btn` toggles `#source-notion-fields`; `#btn-action-sync-source` is rendered | `sendImport` / `send-import` with `NotionSyncRequest` | E2E source-switch and validation are in scope. The rendered source-switch button has no listener in `initWindowControls`; production wiring is a blocker, not a false-positive test. |
| Legacy Notion section | `#section-notion`, `#form-notion`, `#btn-action-sync` | Same `sendImport` / `send-import` boundary, but separate legacy field IDs | Compatibility risk. Lower-level/source inspection documents the dual state; no E2E claims success until the production ownership of legacy navigation is decided. |
| Collection navigation/list | `#tab-collection-btn`, `#section-collection`, `.collection-grid` | `listVocabulary` / `list-vocabulary` | E2E: navigation, initial sample rows, and async persisted list replacement. |
| Collection CRUD/edit | `.collection-grid`, `.btn-add-word`, `.btn-delete-selected`, `[data-editable]` | `createVocabulary`, `updateVocabulary`, `deleteVocabulary` | E2E with isolated seeded records and visible outcomes. |
| Generation | `#btn-action-generate`, import review table | `generateMissingData` / `generate-missing-data` with `GenerateMissingDataPayload` | E2E only where deterministic adapter mocking is available; response updates import draft rows. |
| Anki submission/health | `#btn-action-submit`, `.connection-item[data-provider="anki"]` | `submitToAnki` / `submit-to-anki`; `getAnkiHealth` / `get-anki-health` | Boundary-mocked E2E; no live Anki Connect dependency. |
| Provider health | `.connection-item[data-provider]` | `getProviderHealth` / `get-provider-health` | Boundary-mocked E2E for rendered provider states. |
| Settings save/status | `#form-settings`, `#btn-save-settings`, `#openai-key-status`, `#azure-key-status`, `#pexels-token-status` | `saveSettings` / `save-settings`; `getSettingsStatus` / `get-settings-status` | E2E save/status/redaction. Azure controls are inside `aria-hidden="true"` legacy markup and are excluded from active editable/reset claims. |
| Empty state | Existing empty-import row after successful empty result | `sendImport` response | Assert only the rendered empty row; loading/error/recovery UI is not present in current source. |

The matrix is a discovery baseline plus explicit contract decisions. It does not authorize tests for absent UI or unwired controls.

### Collections implementation note

The isolated E2E store starts with no persisted vocabulary rows, so the current renderer exposes the collection navigation, action controls, and empty status row but no deterministic seeded records. CRUD/edit assertions are deferred until a supported seed boundary is added; loading/error/recovery states remain deferred because the renderer has no user-visible states for them.

## Task List

### Phase 0: Planning Hygiene

#### Task 0: Make approved planning artifacts trackable

**Description:** Resolve the repository conflict where `.gitignore` ignores both `SPEC.md` and `tasks/`, despite the spec and planning workflow requiring these documents to be versioned. Preserve ignore behavior for generated/local task output only if that is the intended project policy.

**Acceptance criteria:**
- [ ] The approved `SPEC.md`, `tasks/plan.md`, and `tasks/todo.md` can be tracked by Git.
- [ ] `.gitignore` no longer silently hides required project planning artifacts.
- [ ] Any remaining ignored task artifacts have an explicit rationale and do not hide implementation plans.

**Verification:**
- [ ] `git check-ignore -v SPEC.md tasks/plan.md tasks/todo.md` no longer reports the required files as ignored.
- [ ] `git status --short --untracked-files=all` shows the planning artifacts for review.
- [ ] No generated build/test output is unignored accidentally.

**Dependencies:** None

**Files likely touched:**
- `.gitignore`
- `SPEC.md`
- `tasks/plan.md`
- `tasks/todo.md`

**Estimated scope:** Small


### Phase 1: Foundation
#### Task 1: Isolate Electron lifecycle and persistence

**Description:** Add deterministic launch/close behavior and redirect Electron user data to a per-run or per-worker test directory. Define cleanup ownership and a dedicated restart-capable fixture without changing end-user persistence behavior.

**Acceptance criteria:**
- [ ] E2E runs do not read or write the developer's normal Electron Store or SQLite data.
- [ ] Shared-app tests and restart tests have explicit, non-overlapping lifecycle semantics.
- [ ] Temporary test data is cleaned up after successful and failed runs where possible.

**Verification:**
- [ ] Focused fixture/lifecycle E2E test passes.
- [ ] `bun run build` succeeds.
- [ ] Run the focused test twice and confirm no state carries between runs.

**Dependencies:** Task 0

**Files likely touched:**
- `e2e/helpers/electron.ts`
- `e2e/helpers/test-base.ts`
- `playwright.config.ts`
- `e2e/fixtures/`

**Estimated scope:** Medium
#### Task 2: Remove hidden-state reset failures

**Description:** Make test reset logic reset only relevant visible/editable UI state and stop targeting hidden legacy fields. Ensure reset waits for observable section state rather than assuming element presence implies editability.

**Acceptance criteria:**
- [ ] `resetAppState()` removes legacy `#azure-key-global` from active reset targets and never fills hidden/`aria-hidden` controls.
- [ ] The reset fixture completes within the normal test timeout.
- [ ] Existing tests start from the intended Import state.

**Verification:**
- [ ] Run `bun x playwright test e2e/smoke.spec.ts --reporter=list`.
- [ ] Run `bun x playwright test e2e/settings.spec.ts --reporter=list`.
- [ ] No fixture timeout occurs on hidden settings controls.

**Dependencies:** Task 1

**Files likely touched:**
- `e2e/helpers/electron.ts`
- `e2e/helpers/test-base.ts`

**Estimated scope:** Small

#### Task 3: Standardize selectors and assertion helpers

**Description:** Establish stable locator conventions and small shared helpers only where repetition exists. Replace weak existence checks and manual class evaluations in the highest-risk tests.

**Acceptance criteria:**
- [ ] Critical controls are asserted with semantic or explicit stable selectors.
- [ ] No critical test uses `toBeDefined()` for DOM existence.
- [ ] Synchronization uses observable state instead of arbitrary sleeps.

**Verification:**
- [ ] `bun x playwright test --list` succeeds.
- [ ] Focused navigation, smoke, and settings tests pass.
- [ ] Search confirms no accidental `test.only` or unapproved disabled critical test.

**Dependencies:** Task 2

**Files likely touched:**
- `e2e/smoke.spec.ts`
- `e2e/navigation.spec.ts`
- `e2e/window-controls.spec.ts`
- `e2e/settings.spec.ts`
- `e2e/helpers/`

**Estimated scope:** Medium

#### Task 3A: Lock post-refactor UI and IPC contract

**Description:** Reconcile the approved E2E scope with the actual renderer surface and IPC contracts before adding new specs. Confirm Collection navigation and actions, Notion source-switch/legacy state behavior, provider-health UI, generation, and Anki submission. Resolve or explicitly defer duplicate type declarations in `src/shared/ipc.ts` when they affect test contracts.

**Acceptance criteria:**
- [ ] A flow matrix maps every user-visible tab, source switch, action, loading state, error state, and recovery state to an E2E or lower-level test.
- [ ] Collection, Notion, generation, Anki, and provider-health flows are classified as user-visible E2E scope or have a documented lower-level rationale.
- [ ] Each selected flow names its existing preload/IPC channel and payload/response contract.
- [ ] The legacy Notion section/source-switch dual state and duplicate IPC declarations are either covered by a compatibility test or recorded as explicit implementation blockers.

**Verification:**
- [ ] Review the flow matrix against `src/renderer/src/renderer.ts`, `src/preload/index.ts`, and `src/shared/ipc.ts`.
- [ ] `bun x playwright test --list` remains valid before implementation.
- [ ] No production code is changed during this discovery task unless a proven contract defect is separately approved.

**Dependencies:** Task 3

**Files likely touched:**
- `tasks/plan.md`
- `tasks/todo.md`
- `src/shared/ipc.ts` only if an approved contract correction is required later

**Estimated scope:** Small


### Checkpoint: Foundation

- [ ] Build succeeds.
- [ ] Smoke, navigation, settings, and window-control focused tests pass.
- [ ] Test data is isolated from normal user data.
- [ ] Human review confirms fixture architecture before expanding coverage.

### Phase 2: Core Flows

#### Task 4: Verify launch and navigation behavior

**Acceptance criteria:**
- [ ] Launch and shutdown are verified without relying only on object truthiness or title survival.
- [ ] Import, Collection, Settings, and Notion source-switch navigation and active state are covered.
- [ ] Legacy Notion section behavior is asserted as compatibility behavior or explicitly excluded with rationale.
- [ ] Platform-specific behavior is annotated with explicit skip reasons where Linux cannot exercise it.

**Verification:**
- [ ] `bun x playwright test e2e/smoke.spec.ts e2e/navigation.spec.ts e2e/window-controls.spec.ts --reporter=list`.
- [ ] Repeat critical navigation tests with `--repeat-each=5`.

**Dependencies:** Task 3A

**Files likely touched:**
- `e2e/smoke.spec.ts`
- `e2e/navigation.spec.ts`
- `e2e/window-controls.spec.ts`
- `e2e/helpers/`

**Estimated scope:** Medium

#### Task 5: Verify file import and real drag/drop

**Description:** Cover source selection, missing/invalid input validation, successful local submission, and drag/drop using actual file events without pre-populating the resulting input value.

**Acceptance criteria:**
- [ ] Missing and invalid form inputs produce the expected user-visible validation.
- [ ] Valid local import reaches the intended renderer/preload/IPC behavior with deterministic local data.
- [ ] Drag/drop tests fail if production drop handling is removed or broken.
- [ ] No test manually writes the final input state it claims to verify.

**Verification:**
- [ ] `bun x playwright test e2e/file-import.spec.ts e2e/drag-drop.spec.ts e2e/form-validation.spec.ts --reporter=list`.
- [ ] Repeat the critical drag/drop and submit tests five times.

**Dependencies:** Task 4

**Files likely touched:**
- `e2e/file-import.spec.ts`
- `e2e/drag-drop.spec.ts`
- `e2e/form-validation.spec.ts`
- `e2e/helpers/dialogs.ts`
- `e2e/fixtures/`

**Estimated scope:** Medium

#### Task 6: Verify settings and restart persistence

**Description:** Test settings display, synthetic key entry, save success/failure, empty values, update behavior, secret redaction, and persistence after a real app restart with isolated storage.

**Acceptance criteria:**
- [ ] Save tests assert the actual user-visible success or failure signal and the relevant payload/boundary behavior.
- [ ] Stored secrets are never rendered in status text, logs, or artifacts.
- [ ] A dedicated restart flow proves persisted settings survive app restart in isolated storage.
- [ ] No arbitrary waits are required for save synchronization.

**Verification:**
- [ ] `bun x playwright test e2e/settings.spec.ts --reporter=list`.
- [ ] Repeat persistence and save-error tests five times.
- [ ] Inspect failure artifacts to ensure synthetic values only.

**Dependencies:** Task 1, Task 4

**Files likely touched:**
- `e2e/settings.spec.ts`
- `e2e/helpers/electron.ts`
- `e2e/helpers/test-base.ts`
- `e2e/helpers/fixtures.ts`
- `src/main/` or `src/preload/` only if an existing boundary must be corrected

**Estimated scope:** Medium
#### Task 7: Cover collections states and local actions

**Description:** After confirming the post-refactor collection UI, add E2E scenarios only for states and actions genuinely rendered by the current source. The current renderer starts with static sample rows, replaces them after `listVocabulary()`, and has an empty-import row; it does not currently expose deterministic loading/error/recovery UI.

**Acceptance criteria:**
- [ ] The test file maps to the actual collection UI and asserts initial sample rows, persisted list results, and the existing empty-import state where applicable.
- [ ] Collection CRUD, generation, and local actions assert visible outcomes using isolated seeded records.
- [ ] Loading/error/recovery coverage is deferred with explicit rationale unless the renderer first exposes deterministic user-visible states.
- [ ] Any production defect discovered while trying to cover absent states is recorded separately; tests do not invent nonexistent UI.

**Verification:**
- [ ] Focused collections E2E passes after Task 3A flow-matrix decision.
- [ ] Repeat critical collection actions five times.
- [ ] Confirm the test does not depend on static sample rows after asynchronous list loading unless that behavior is explicitly under test.

**Dependencies:** Task 3A, Task 4

**Files likely touched:**
- `e2e/collections.spec.ts`
- `e2e/helpers/`
- `e2e/fixtures/`
- `tasks/plan.md`

**Estimated scope:** Medium
#### Task 8: Cover mocked external integrations

**Description:** Add user-visible E2E flows for OpenAI, Azure Speech, Pexels, Notion, and Anki Connect only where the application exposes those flows. Define and implement deterministic mocks at each approved boundary.

**Acceptance criteria:**
- [ ] Each covered integration has an explicit mock boundary and reset behavior.
- [ ] Success, failure, loading, and recovery outcomes are asserted through the UI where applicable.
- [ ] No live credential or external application is required by the primary Linux gate.
- [ ] Integrations without a user-visible flow receive lower-level coverage rationale instead of artificial E2E.

**Verification:**
- [ ] Focused integration E2E command passes with mocks enabled.
- [ ] Repeat critical mocked flows five times.
- [ ] Confirm network/IPC logs contain no live external requests or secrets.

**Dependencies:** Task 5, Task 6, Task 7

**Files likely touched:**
- `e2e/external-integrations.spec.ts`
- `e2e/helpers/`
- `e2e/fixtures/`
- `src/main/` or `src/preload/` only for an existing boundary defect
- `src/shared/ipc.ts` only if a contract is already inconsistent

**Estimated scope:** Large; split per integration during implementation if it exceeds one focused session.

### Checkpoint: Core Flows

- [ ] All confirmed user-visible local journeys pass.
- [ ] All external flows use deterministic mocks.
- [ ] Critical groups pass with `--repeat-each=5`.
- [ ] No hidden-field reset, arbitrary sleep, or test-injected final state remains in critical paths.

### Phase 3: Quality Gate

#### Task 9: Harden CI reliability and artifacts

**Description:** Align Playwright configuration and GitHub Actions with the strict Linux gate: deterministic retries policy, explicit artifact retention, clear skip accounting, and failure diagnostics.

**Acceptance criteria:**
- [ ] CI builds before E2E and installs browser dependencies reproducibly.
- [ ] Failure artifacts include trace, screenshot, video, and relevant logs.
- [ ] Retries do not silently mask repeated failures.
- [ ] CI reports intentional platform skips separately from unexpected skips.

**Verification:**
- [ ] Run the CI-equivalent command locally where available.
- [ ] Validate workflow syntax and artifact paths.
- [ ] Run a deliberate failing focused test in a safe branch/path and confirm artifacts are uploaded, if practical.

**Dependencies:** Tasks 1-8

**Files likely touched:**
- `playwright.config.ts`
- `.github/workflows/ci.yml`
- `package.json`
- `e2e/helpers/`

**Estimated scope:** Medium

#### Task 10: Run full verification and quality review

**Description:** Execute the complete verification loop, review the final suite for correctness/readability/security/performance, and update the living specification if approved decisions changed.

**Acceptance criteria:**
- [ ] `bun run build`, static checks, unit/integration tests, and full E2E pass.
- [ ] `bun x playwright test --list` matches the intended suite.
- [ ] Critical tests pass repeatedly without intermittent failures.
- [ ] Review findings are resolved or explicitly documented.


**Verification:**
- [ ] `bun run build`
- [ ] `bun run lint`
- [ ] `bun run typecheck`
- [ ] `bun run test`
- [ ] `bun run test:e2e`
- [ ] Focused critical groups with `--repeat-each=5`

**Dependencies:** Task 9

**Files likely touched:**
- Files changed by Tasks 1-9
- `SPEC.md` only if a decision changed

**Estimated scope:** Medium

### Checkpoint: Complete

- [ ] Every success criterion in `SPEC.md` is evidenced.
- [ ] Linux CI gate is green.
- [ ] No unapproved skips or secrets exist.
- [ ] Final code review is complete.
- [ ] Ready for human review/merge.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Production persistence is initialized before test redirection | High | Set test user-data path before importing/launching the built main entrypoint; verify with isolated artifacts. |
| Shared app state leaks across tests | High | Prefer test-scoped reset; use dedicated lifecycle fixture for restart tests; prove repeatability. |
| Hidden legacy controls remain in DOM | Medium | Reset only visible/editable controls and remove legacy selectors from active test flows. |
| Drag/drop tests pass while production handler is broken | High | Never set final input state in the test; assert the event's actual outcome. |
| External mocks intercept the wrong layer | High | Define the mock boundary per integration before implementation and verify requests/responses. |
| CI retries hide flaky tests | Medium | Preserve retry artifacts, repeat critical groups locally, and treat repeated failure as a gate failure. |
| Scope expands to non-user-visible modules | Medium | Require a user-visible journey or lower-level testing rationale before adding E2E. |
| Linux-only validation misses platform regressions | Medium | Keep platform-specific tests explicit and plan later matrix expansion separately. |

## Open Questions

These questions come from the approved SPEC.md and must be answered during discovery before the affected task is implemented:

1. Which exact collection, Notion, Anki, and newly introduced UI modules are user-visible after the refactor?
2. What mock boundary is technically available and least coupled for each external integration?
3. Which persistence APIs can be redirected to an isolated test directory without changing user behavior?
4. Which accessibility assertion library is already approved, if any?
5. What evidence is required to claim Linux-only gate completion while Windows/macOS remain outside the mandatory matrix?

## Planning Verification

- Every task has acceptance criteria, verification steps, dependencies, likely files, and a scope estimate.
- High-risk fixture and persistence work is ordered before broad flow coverage.
- Contract discovery now precedes all core-flow implementation and captures actual renderer/preload/IPC surfaces.
- Checkpoints exist after Planning Hygiene, Foundation, Core Flows, and final Quality Gate.
- `SPEC.md`, `tasks/plan.md`, and `tasks/todo.md` are not hidden by `.gitignore`; generated outputs remain ignored.
- No implementation was performed while creating this plan.
## Additional Risks Confirmed by Source Audit

| Risk | Impact | Mitigation |
|---|---|---|
| Notion source switch and legacy section share tab/state concepts | High | Add contract-discovery coverage before writing Notion E2E; assert the intended active section and source state explicitly. |
| Provider-health and Anki-health calls can reach live network boundaries | High | Mock health adapters or preload/IPC responses; assert no external request escapes the test process. |
| Collection and generation flows share persisted SQLite records | High | Seed isolated database state per scenario and verify cleanup/reset between tests. |
| Duplicate generation-related declarations in `src/shared/ipc.ts` | Medium | Resolve the type contract only as a separately approved production change; do not hide it with casts in E2E. |
| Existing README inventory does not exactly match the repository tree | Low | Update documentation only in the quality-gate/documentation task after implementation scope is confirmed. |

## Source Audit Notes

- The current renderer exposes Collection navigation and actions in addition to Import and Settings.
- Notion is implemented as an Import source switch and also has a legacy section path; it is not a standalone navigation tab in the current UI.
- Preload exposes channels for collection CRUD, generation, Anki submission, settings, provider health, and file selection.
- Main persistence is initialized from Electron `userData`, so test isolation must happen before the built main entrypoint initializes the database/store singletons.
- Existing unit/integration tests already provide mocks for IPC handlers, in-memory SQLite, SDK clients, fetch, and orchestration; the plan should reuse those contracts rather than inventing parallel behavior.

## Confirmed Discovery Blockers

- `#btn-action-sync-source` exists in `src/renderer/index.html`, but no listener was found in `src/renderer/src/renderer.ts`. Task 3A must decide whether this is a production defect requiring a fix or a deliberately unsupported path covered only at a lower level; Task 8 must not add a passing E2E around a button with no behavior.
- `selectImportSource('notion')` toggles `#source-notion-fields` and also adds `active-section` to legacy `#section-notion`. Task 3A must define whether this dual state is compatibility behavior or a production defect, then Task 4 tests that decision.
- `e2e/fixtures/test-words.txt` exists and is referenced by `e2e/helpers/fixtures.ts`; this is not a current missing-fixture blocker. Task 5 should retain an existence check to prevent future drift.
- `SPEC.md` exists in the working tree but is untracked unless Task 0 is completed; until then, the approved specification and plan are not safely reviewable through Git history.
- Task 7 no longer promises absent loading/error/recovery UI. The current renderer exposes static sample rows, asynchronous persisted list replacement, and an existing empty-import row; absent states require production/UI discovery before E2E coverage.
