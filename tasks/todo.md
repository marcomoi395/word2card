# Implementation Checklist

## Phase 1: Foundation

- [x] Implement SQLite bootstrap, schema, migrations, and repositories
- [x] Define shared domain models and typed IPC contracts

## Checkpoint: Foundation

- [x] Temporary SQLite database initializes and migrates twice without error
- [x] Repository CRUD and rollback tests pass
- [x] Typecheck passes
- [x] Human review completed

## Phase 2: Collection and imports

- [x] Implement collection query and bidirectional record edit flow
- [x] Implement duplicate-safe file import and collection refresh
- [x] Implement duplicate-safe Notion import without write-back

## Checkpoint: Collection/import

- [x] Real records persist and reload
- [x] Duplicate words are skipped and counted
- [x] Preview and Collection show identical persisted data
- [x] Focused tests pass

## Phase 3: Generation and integrations

- [x] Implement OpenAI settings with custom base URL and model
- [x] Implement generate-missing-data flow with transactional persistence
- [x] Implement startup provider health checks and accurate statuses
- [x] Implement Anki submission from persisted card records

## Checkpoint: Integrations

- [x] Custom OpenAI endpoint/model are honored
- [x] Generated data survives restart and updates both views
- [x] Provider states reflect real conditions
- [x] Anki statuses reflect confirmed results only

## Phase 4: UI and inactive audio cleanup

- [x] Wire redesigned renderer UI to SQLite-backed IPC flows
- [x] Remove/disable Azure and remote audio behavior

## Checkpoint: Complete

- [x] Full tests pass
- [x] Typecheck passes
- [x] Lint passes
- [x] Build passes
- [x] No Azure or remote speech calls occur
- [x] All SPEC.md success criteria are verified
- [x] Human approval received before implementation
