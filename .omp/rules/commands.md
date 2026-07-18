# Commands

## Scope
- Applies to: all project work
- Does not apply to: N/A

## Rules
- Node version: `22.22.2` (from `.nvmrc`)
- Package manager: `npm` (lockfile: `package-lock.json`; `yarn.lock` also present but `npm` used in CI and README)
- Install: `npm install` (also runs `postinstall` → `electron-builder install-app-deps`)
- Dev: `npm run dev` (runs `electron-vite dev`)
- Build: `npm run build` (runs `npm run typecheck && electron-vite build`)
- Typecheck: `npm run typecheck` (runs both `typecheck:node` and `typecheck:web`)
  - `npm run typecheck:node` → `tsc --noEmit -p tsconfig.node.json --composite false`
  - `npm run typecheck:web` → `tsc --noEmit -p tsconfig.web.json --composite false`
- Lint: `npm run lint` → `eslint --cache .`
- Format: `npm run format` → `prettier --write .`
- Build platform installers:
  - `npm run build:win` → electron-builder `--win`
  - `npm run build:mac` → electron-builder `--mac`
  - `npm run build:linux` → electron-builder `--linux`
- No test runner configured (only `node:test` used in `src/main/helper/notion-sync.test.ts`; run with `node --test src/main/helper/notion-sync.test.ts`)

## Verification
- Run `npm run typecheck` after any TypeScript change
- Run `npm run lint` after any code change
- Run `npm run format` after any code change
