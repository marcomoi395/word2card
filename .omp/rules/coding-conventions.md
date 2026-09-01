# Coding Conventions

## Scope

- Applies to: `src/**`
- Does not apply to: generated files in `out/**`

## Rules

### Style

- Prettier: single quotes, no semicolons, print width 100, trailing comma none, tab width 4, LF line endings
- ESLint: `@electron-toolkit/eslint-config-ts` + `eslint-config-prettier` + `eslint-plugin-unused-imports`
- Indent: 4 spaces
- File naming: kebab-case (e.g. `anki-connect.ts`, `notion-sync.ts`, `filter-existing-words.ts`)
- Interface naming: PascalCase (e.g. `FlashcardResponse`, `QuizNote`, `NotionSyncTarget`)
- Export style: named exports preferred; default exports used only for singletons (`State`, `SecretManager`)

### Patterns

- Singleton pattern: `State` and `SecretManager` use static `getInstance()` + default export of instance
- Service classes: static methods, no instantiation (e.g. `OpenAIService.generateFlashcardData()`, `NotionService.getPages()`, `SpeechService.createSpeechFiles()`)
- Type guards: manual `isRecord` + narrowing functions for runtime IPC validation (no zod/class-validator)
- Error handling: try/catch returning `AppResponse` failure, `error instanceof Error` guard for message extraction
- Concurrency: `p-limit` for throttling parallel API calls
- IDs: `uuid` v4 for flashcard IDs

### Renderer

- Vanilla TypeScript — no React/Vue/Svelte
- DOM manipulation via `document.getElementById` / `querySelector`
- Single-file renderer: `src/renderer/src/renderer.ts`
- Single HTML file: `src/renderer/index.html` (inline structure, all UI in one page with tab switching)
- CSS: `src/renderer/styles.css` + asset CSS files, no CSS-in-JS

### Testing

- `node:test` + `node:assert/strict` for unit tests (not Jest)
- Test files co-located with source: `*.test.ts` next to implementation
- No test runner script in package.json — run manually with `node --test`

## Evidence

- `.prettierrc.yaml` — formatter config
- `eslint.config.mjs` — linter config
- `src/main/state.ts`, `src/main/store.ts` — singleton pattern
- `src/main/open-ai.ts`, `src/main/notion.ts`, `src/main/speech.ts` — static service classes
- `src/main/helper/notion-sync.test.ts` — test file using `node:test`
