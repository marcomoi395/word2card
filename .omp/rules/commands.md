# Commands

## Scope

- Applies to: all project work
- Does not apply to: N/A

## Rules

 - Node version: 22.22.2 (from `.nvmrc`)
 - Package manager: Bun (lockfile: `bun.lock`; `npm`/`yarn`/`pnpm` lockfiles removed)
 - Install: `bun install` (also runs `postinstall` → `electron-builder install-app-deps`)
 - Dev: `bun run dev` (runs `electron-vite dev`)
 - Build: `bun run build` (runs `bun run typecheck && electron-vite build`)
 - Typecheck: `bun run typecheck` (runs both `typecheck:node` and `typecheck:web`)
 - Lint: `bun run lint` → `eslint --cache .`
 - Format: `bun run format` → `prettier --write .`
 - Build platform installers:
    - `bun run build:win` → electron-builder `--win`
    - `bun run build:mac` → electron-builder `--mac`
    - `bun run build:linux` → electron-builder `--linux`
 - Test (unit): `bun run test` (runs Vitest)
    - Watch mode: `bun run test:watch`
    - Coverage: `bun run test:coverage`
 - Test (E2E): `bun run test:e2e` (builds app, runs Playwright tests)
    - Alternative: `bun run test:e2e:local`
    - UI mode: `bun run test:e2e:ui`
    - Debug mode: `bun run test:e2e:debug`
- Legacy: Manual test with `node --test src/main/helper/notion-sync.test.ts`

## Verification

 - Run `bun run typecheck` after any TypeScript change
 - Run `bun run lint` after any code change
 - Run `bun run format` after any code change
