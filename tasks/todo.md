# E2E Reliability Task List

## Phase 0: Planning Hygiene

- [x] Task 0: Make approved planning artifacts trackable
  - Acceptance: `SPEC.md`, `tasks/plan.md`, and `tasks/todo.md` are not hidden by `.gitignore`; generated outputs remain ignored.
  - Verify: `git check-ignore -v SPEC.md tasks/plan.md tasks/todo.md` returns no matches; `git status --short --untracked-files=all` shows planning artifacts.
  - Files: `.gitignore`, `SPEC.md`, `tasks/plan.md`, `tasks/todo.md`
  - Dependencies: None

## Checkpoint: Planning Hygiene

- [ ] Planning artifacts are visible to Git review.

## Phase 1: Foundation

- [ ] Task 1: Isolate Electron lifecycle and persistence
  - Acceptance: E2E uses isolated Electron user data; shared and restart fixtures are explicit; cleanup is deterministic.
  - Verify: Focused lifecycle test, `bun run build`, repeat focused test twice.
  - Files: `e2e/helpers/electron.ts`, `e2e/helpers/test-base.ts`, `playwright.config.ts`
  - Dependencies: Task 0

- [ ] Task 2: Remove hidden-state reset failures
  - Acceptance: Reset removes the legacy `#azure-key-global` selector from active reset targets, never fills hidden/`aria-hidden` controls, and completes within the normal timeout.
  - Verify: `bun x playwright test e2e/smoke.spec.ts e2e/settings.spec.ts --reporter=list`.
  - Files: `e2e/helpers/electron.ts`, `e2e/helpers/test-base.ts`
  - Dependencies: Task 1

- [ ] Task 3: Standardize selectors and assertion helpers
  - Acceptance: Critical tests use stable selectors, web-first assertions, and no accidental `test.only`/disabled critical tests.
  - Verify: `bun x playwright test --list` plus focused smoke/navigation/settings tests.
  - Files: `e2e/smoke.spec.ts`, `e2e/navigation.spec.ts`, `e2e/window-controls.spec.ts`, `e2e/settings.spec.ts`, `e2e/helpers/`
  - Dependencies: Task 2

- [ ] Task 3A: Lock post-refactor UI and IPC contract
  - Acceptance: A flow matrix covers all actual user-visible flows; missing `#btn-action-sync-source` behavior is classified as a production fix or explicit lower-level rationale; Notion source/legacy section behavior is defined; duplicate IPC declarations are resolved or explicitly blocked; Collection loading/error/recovery claims are limited to states actually rendered by source.
  - Decision: `#btn-action-sync-source` is currently rendered but unwired, so source-switch E2E must not claim a successful sync until a production fix is approved. Legacy `#section-notion` remains a compatibility-risk path with separate IDs and no merged E2E success claim. Duplicate `GenerateMissingDataPayload`/`GenerationSummary` declarations in `src/shared/ipc.ts` are an explicit contract blocker; later tests use the effective renderer/preload shape only after reconciliation.
  - Verify: Review against `src/renderer/src/renderer.ts`, `src/preload/index.ts`, `src/shared/ipc.ts`; run `bun x playwright test --list`.
  - Files: `tasks/plan.md`, `tasks/todo.md`; `src/shared/ipc.ts` or renderer files only for separately approved contract fixes.
  - Dependencies: Task 3

## Checkpoint: Foundation

- [ ] Build succeeds.
- [ ] Smoke, navigation, settings, and window-control tests pass.
- [ ] Persistence is isolated from normal user data.
- [ ] Flow matrix and IPC contract are reviewed.

## Phase 2: Core Flows

- [ ] Task 4: Verify launch and navigation behavior
  - Acceptance: Launch/shutdown, Import/Collection/Settings navigation, Notion source switching, and Linux-supported platform behavior are asserted observably; legacy Notion behavior follows the Task 3A decision.
  - Verify: Focused smoke/navigation/window-control command and `--repeat-each=5` for critical navigation.
  - Files: `e2e/smoke.spec.ts`, `e2e/navigation.spec.ts`, `e2e/window-controls.spec.ts`, `e2e/helpers/`
  - Dependencies: Task 3A

- [ ] Task 5: Verify file import and real drag/drop
  - Acceptance: Validation, local submit, and real drag/drop behavior are covered without test-injected final state; the existing `e2e/fixtures/test-words.txt` remains a tracked/validated deterministic fixture.
  - Verify: Focused file-import/drag-drop/form-validation command and five repetitions of critical cases.
  - Files: `e2e/file-import.spec.ts`, `e2e/drag-drop.spec.ts`, `e2e/form-validation.spec.ts`, `e2e/helpers/dialogs.ts`, `e2e/fixtures/`
  - Dependencies: Task 4

- [ ] Task 6: Verify settings and restart persistence
  - Acceptance: Save/error/redaction/update behavior and real restart persistence pass with isolated synthetic data.
  - Verify: Focused settings command, five repetitions of persistence/error cases, artifact inspection.
  - Files: `e2e/settings.spec.ts`, `e2e/helpers/electron.ts`, `e2e/helpers/test-base.ts`, `e2e/helpers/fixtures.ts`
  - Dependencies: Task 1, Task 4

- [ ] Task 7: Cover collections states and local actions
  - Acceptance: Assert only collection states actually rendered by the current source (initial static sample rows, persisted list results, and the existing empty-import row where applicable); loading/error/recovery coverage is deferred to a production/UI discovery item unless the renderer first exposes deterministic user-visible states.
  - Verify: Focused collections E2E after Task 3A flow-matrix decision, with five repetitions of critical CRUD actions; record any absent state as rationale rather than creating artificial tests.
  - Files: `e2e/collections.spec.ts`, `e2e/helpers/`, `e2e/fixtures/`, `tasks/plan.md`
  - Dependencies: Task 4, Task 3A

- [ ] Task 8: Cover mocked external integrations
  - Acceptance: User-visible OpenAI/Azure/Pexels/Notion/Anki flows use explicit resettable mocks and no live credentials.
  - Verify: Focused mocked integration E2E, five repetitions, inspect network/IPC logs.
  - Files: `e2e/external-integrations.spec.ts`, `e2e/helpers/`, `e2e/fixtures/`, existing boundary files only for proven defects.
  - Dependencies: Task 5, Task 6, Task 7

## Checkpoint: Core Flows

- [ ] Confirmed user-visible local journeys pass.
- [ ] External flows use deterministic mocks.
- [ ] Critical groups pass with `--repeat-each=5`.
- [ ] No hidden-field reset, arbitrary sleep, or test-injected final state remains in critical paths.

## Phase 3: Quality Gate

- [ ] Task 9: Harden CI reliability and artifacts
  - Acceptance: CI builds/install dependencies reproducibly, retains diagnostics, and reports skips/retries clearly.
  - Verify: CI-equivalent local command where available, workflow syntax/artifact path review.
  - Files: `playwright.config.ts`, `.github/workflows/ci.yml`, `package.json`, `e2e/helpers/`
  - Dependencies: Tasks 1-8

- [ ] Task 10: Run full verification and quality review
  - Acceptance: Build, static checks, unit/integration tests, full E2E, repeat runs, and review all pass.
  - Verify: `bun run build`, `bun run lint`, `bun run typecheck`, `bun run test`, `bun run test:e2e`, focused `--repeat-each=5`.
  - Files: Files changed by Tasks 1-9, `SPEC.md` only if an approved decision changes.
  - Dependencies: Task 9

## Checkpoint: Complete

- [ ] Every `SPEC.md` success criterion has evidence.
- [ ] Linux CI gate is green.
- [ ] No unapproved skips or secrets exist.
- [ ] Final code review is complete.
- [ ] Ready for human review/merge.
