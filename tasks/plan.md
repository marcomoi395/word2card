# Implementation Plan: High-Confidence E2E Coverage After Application Refactor

## Overview

This plan turns the approved `SPEC.md` into incremental, verifiable work. The objective is to make the Electron E2E suite trustworthy after the application refactor: isolate app state, test real user-visible behavior through renderer/preload/IPC, mock third-party boundaries deterministically, and enforce a Linux CI quality gate.

## Contract and implementation notes

- Renderer/preload/IPC contracts are documented in the flow matrix below.
- E2E uses isolated Electron user-data directories.
- Hidden legacy Azure controls are excluded from reset/editable-flow assertions.
- The Notion source-sync button is rendered but currently unwired; no E2E success claim is made for it.
- The current isolated collection store starts empty; E2E covers the rendered empty state and controls, while CRUD seeding is deferred until a supported seed boundary exists.
- External integration E2E is deferred: the preload bridge is not a writable mock seam from the renderer, and reloading restores production implementations. Provider health, generation, Anki, and adapter behavior remain covered by lower-level tests until a main-process mock boundary is introduced.

## Current Flow Matrix (Contract-Locked)

| User-visible flow | Renderer surface | Preload API / IPC channel | Contract decision |
|---|---|---|---|
| Import tab and file source | `#tab-import-btn`, `#source-file-btn`, `#source-file`, `#deck`, `#btn-action-import` | `openFileDialog` / `open-file-dialog`; `sendImport` / `send-import` | E2E: validation, picker, local submit, and drag/drop. |
| Notion source switch | `#tab-notion-btn` toggles `#source-notion-fields`; `#btn-action-sync-source` is rendered | `sendImport` / `send-import` with `NotionSyncRequest` | Source-switch visibility is E2E-covered. Sync success is blocked because the rendered button has no listener. |
| Legacy Notion section | `#section-notion`, `#form-notion`, `#btn-action-sync` | `sendImport` / `send-import` | Compatibility-risk path; no merged E2E success claim until ownership is decided. |
| Collection navigation/list | `#tab-collection-btn`, `#section-collection`, `.collection-grid` | `listVocabulary` / `list-vocabulary` | E2E covers navigation, empty persisted state, and controls. |
| Collection CRUD/edit | `.collection-grid`, `#btn-add-collection-word`, `#btn-delete-collection-selected` | `createVocabulary`, `updateVocabulary`, `deleteVocabulary` | Deferred until a supported deterministic seed boundary exists. |
| Generation | `#btn-generate-data` | `generateMissingData` / `generate-missing-data` | Lower-level tests cover handler/service behavior; E2E mock seam deferred. |
| Anki submission/health | `#btn-submit-anki`, `.connection-item[data-provider="anki"]` | `submitToAnki` / `submit-to-anki`; `getAnkiHealth` / `get-anki-health` | Lower-level tests cover behavior; no live Anki dependency. |
| Provider health | `.connection-item[data-provider]` | `getProviderHealth` / `get-provider-health` | Lower-level handler/adapter tests; renderer mock seam deferred. |
| Settings save/status | `#form-settings`, `#btn-save-settings`, status elements | `saveSettings`, `getSettingsStatus` | E2E covers visible settings and isolated restart persistence. |
| Empty state | Existing empty-import row | `sendImport` response | E2E asserts the rendered empty row only. |

## Task 8 decision

Do not add artificial integration E2E tests until the main process exposes an explicit deterministic adapter/mock boundary. The attempted renderer-side `window.api` replacement was rejected because the preload bridge is not writable and page reload reinstates the real bridge. This preserves the security boundary and avoids tests that pass without exercising production IPC.
