# Architecture

## Scope

- Applies to: `src/**`
- Does not apply to: `out/**`, `dist/**`, `node_modules/**`, `resources/**`

## Rules

- Electron app with strict process separation: main, preload, renderer
- Build tool: `electron-vite` (config: `electron.vite.config.ts`, currently empty/default)
- Packaging: `electron-builder` (config: `electron-builder.yml`)
- CI: Comprehensive CI pipeline (lint, typecheck, unit tests, E2E tests) on PRs and main pushes; tag-triggered builds for Linux + Windows with draft releases (macOS dmg target defined but not in CI matrix)

### Process boundaries

- `src/main/` — main process: app lifecycle, IPC handlers, OS integration, all API calls (OpenAI, Azure Speech, Pexels, Notion, AnkiConnect)
- `src/preload/` — bridge: exposes typed `RendererApi` via `contextBridge`
- `src/renderer/` — UI: vanilla TypeScript + HTML + CSS (no framework)
- `src/shared/` — shared types and IPC channel constants (`ipc.ts`)

### IPC contract

- All IPC channels defined in `src/shared/ipc.ts` as `IPC_CHANNELS` const object
- Renderer-to-main: `ipcRenderer.invoke` for request/response, `ipcRenderer.send` for fire-and-forget (window controls)
- Main validates all IPC payloads with manual type guards before processing
- All IPC responses use `AppResponse<T>` discriminated union (`status: 'success' | 'error'`)

### Security (already enforced)

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- `webSecurity: true`

### Entry points

- Main: `src/main/index.ts` → `out/main/index.js`
- Preload: `src/preload/index.ts`
- Renderer: `src/renderer/index.html` + `src/renderer/src/renderer.ts`

### TypeScript config

- `tsconfig.node.json` — covers `src/main/**`, `src/preload/**`, `src/shared/**`, `electron.vite.config.*`
- `tsconfig.web.json` — covers `src/renderer/**/*.ts`, `src/preload/*.d.ts`, `src/shared/**`
- Root `tsconfig.json` — references both

## Evidence

- `src/main/index.ts` — main process with IPC handlers, window creation, security config
- `src/preload/index.ts` — minimal bridge exposing `RendererApi`
- `src/shared/ipc.ts` — shared IPC channel names and payload types
- `electron-builder.yml` — packaging config
