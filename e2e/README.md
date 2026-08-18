# E2E Tests for Word2Card

Playwright E2E tests for the Electron UI.

## Scope

E2E chỉ kiểm tra:

- App launch, window lifecycle
- Tab navigation
- Form fields, validation trước khi submit
- Drag-and-drop UI
- Window controls

Không kiểm tra các luồng phụ thuộc API bên thứ ba hoặc ứng dụng ngoài. Các luồng này thuộc unit/integration tests với mock ở `src/**/__tests__`.

## Running Tests

```bash
npm run test:e2e
```

```bash
npm run test:e2e:ui
```

```bash
npm run test:e2e:debug
```

## Test Structure

```text
e2e/
├── helpers/
│   ├── electron.ts
│   ├── dialogs.ts
│   └── fixtures.ts
├── fixtures/
│   └── test-words.txt
├── smoke.spec.ts
├── navigation.spec.ts
├── drag-drop.spec.ts
├── window-controls.spec.ts
├── settings.spec.ts
├── file-import.spec.ts
└── form-validation.spec.ts
```

Always build before E2E runs. `npm run test:e2e` handles this automatically.
