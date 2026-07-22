# E2E Tests for Word2Card

End-to-end tests for the Word2Card Electron application using Playwright.

## Setup

E2E tests are already configured. Dependencies are installed via:

```bash
npm install
```

## Running Tests

**Run all tests:**

```bash
npm run test:e2e
```

**Run with UI mode (interactive):**

```bash
npm run test:e2e:ui
```

**Run with debug mode (step-through):**

```bash
npm run test:e2e:debug
```

## Test Structure

```
e2e/
├── helpers/
│   ├── electron.ts           # Electron app launch/close utilities
│   ├── anki-mock-server.ts   # Mock AnkiConnect server
│   ├── mocks.ts              # Mock data and helpers
│   └── fixtures.ts           # Test fixtures
├── fixtures/
│   └── test-words.txt        # Sample test data
├── smoke.spec.ts             # Basic app launch tests
├── navigation.spec.ts        # Navigation flow tests
├── drag-drop.spec.ts         # Drag and drop tests
├── window-controls.spec.ts   # Window control tests
├── settings.spec.ts          # Settings page tests
├── file-import.spec.ts       # File import tests
├── notion-sync.spec.ts       # Notion sync tests
├── form-validation.spec.ts   # Form validation tests
├── error-handling.spec.ts    # Error handling tests
├── global-setup.ts           # Global test setup
├── global-teardown.ts        # Global test teardown
└── README.md                 # This file
```

## Writing Tests

### Basic Test Template

```typescript
import { test, expect } from '@playwright/test'
import { launchElectronApp, closeElectronApp, ElectronAppContext } from './helpers/electron'

test.describe('Feature Name', () => {
    let context: ElectronAppContext

    test.beforeEach(async () => {
        context = await launchElectronApp()
    })

    test.afterEach(async () => {
        await closeElectronApp(context.app)
    })

    test('should do something', async () => {
        const { window } = context

        // Your test code here
        await window.click('button#submit')
        expect(await window.textContent('h1')).toBe('Expected Text')
    })
})
```

## Best Practices

1. **Always build before running e2e tests** - tests run against the compiled output in `out/`
2. **Use `test.beforeEach` and `test.afterEach`** - ensures clean app state per test
3. **Keep tests focused** - test one flow per test case
4. **Use meaningful selectors** - prefer data-testid over classes
5. **Wait for elements** - use `waitForSelector` to avoid flakiness

## Debugging

- Use `--debug` flag to step through tests
- Use `--ui` flag for interactive test running
- Screenshots and videos are captured on failure (in `test-results/`)
- Use `await window.pause()` to pause execution and inspect

## CI/CD

### GitHub Actions Workflow

E2E tests run automatically on every PR via `.github/workflows/e2e-tests.yml`:

```yaml
- run: npm run lint # Lint
- run: npm run typecheck # Type check
- run: npm run test # Unit tests
- run: npm run test:e2e # E2E tests
```

Test reports and failure artifacts are uploaded automatically.

## Viewing Test Reports

After running tests, view the HTML report:

```bash
npx playwright show-report
```

Or open `playwright-report/index.html` in your browser.

## Troubleshooting

- **Tests timeout**: Increase timeout in `playwright.config.ts`
- **Element not found**: Add `waitForSelector` before interaction
- **Flaky tests**: Add proper waits, check for race conditions
- **Mock server issues**: Ensure AnkiConnect mock is running on correct port
