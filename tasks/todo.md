# Word2Card Hardening and State Package Tasks

## Phase 0: State foundation

- [x] Task 1 — Define State package model and redacted snapshot
  - Depends on: none
  - Verify: focused state tests, `npm run typecheck:node`
- [x] Task 2 — Add typed persistence adapter and atomic state commit
  - Depends on: Task 1
  - Verify: persistence failure/success tests, focused store tests, typecheck

### Checkpoint: State foundation

- [ ] State tests pass
- [ ] Store tests pass
- [ ] Typecheck passes
- [ ] No raw state/snapshot contract crosses boundaries

## Phase 1: Secret flow migration

- [x] Task 3 — Migrate main bootstrap and services to State package
  - Depends on: Task 2
  - Verify: import/state tests, `npm test`, node typecheck
- [x] Task 4 — Replace secret-returning IPC with redacted settings status
  - Depends on: Task 3
  - Verify: settings handler tests, no-secret response assertions, node typecheck
- [x] Task 5 — Migrate preload and renderer settings UI to status-only state
  - Depends on: Task 4
  - Verify: renderer tests, web typecheck, build

### Checkpoint: Secret boundary

- [ ] Renderer receives no raw secrets
- [ ] Main services still access secrets
- [ ] Settings save/clear behavior preserved
- [ ] Unit tests and build pass

## Phase 2: Trust boundaries

- [x] Task 6 — Validate file import paths in main
  - Depends on: Task 1
  - Verify: path rejection/acceptance tests, import tests, node typecheck
- [x] Task 7 — Allowlist external URL schemes
  - Depends on: none
  - Verify: window URL tests, node typecheck
- [x] Task 8 — Make IPC registration lifecycle-safe
  - Depends on: none
  - Verify: registration/window handler tests, node typecheck

### Checkpoint: Main trust boundaries

- [ ] File path validation passes
- [ ] URL allowlist passes
- [ ] Window recreation does not duplicate IPC handlers
- [ ] Import/window E2E smoke paths remain green

## Phase 3: Renderer security surface

- [ ] Task 9 — Remove preload fallback and inline renderer handlers
  - Depends on: Task 5
  - Verify: renderer/preload tests, full typecheck, build
- [ ] Task 10 — Add strict CSP and remove renderer CDN dependency
  - Depends on: Task 9
  - Verify: build, Playwright console check, no CSP violations

## Phase 4: Quality gates

- [ ] Task 11 — Close coverage gap and update regression tests
  - Depends on: Tasks 1–10
  - Verify: `npm run test:coverage`, `npm test`, lint, typecheck
- [ ] Task 12 — Full end-to-end verification and documentation alignment
  - Depends on: Task 11
  - Verify: `npm run test:e2e`, build, coverage, lint, typecheck, diff review

### Final checkpoint

- [ ] All acceptance criteria pass
- [ ] No raw secrets in renderer/artifacts/logs
- [ ] No unapproved dependencies
- [ ] Security review complete
- [ ] SPEC.md and implementation remain aligned
- [ ] Human approves release readiness
