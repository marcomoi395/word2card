# E2E Tests for Word2Card

End-to-end tests for the Word2Card Electron application using Playwright.

## Setup

E2E tests are already configured. Dependencies are installed via:

```bash
npm install
```

## Running Tests

**Run all e2e tests:**
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
│   └── electron.ts       # Electron app launch/close utilities
├── smoke.spec.ts         # Basic app launch tests
└── README.md            # This file
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

E2E tests should run in CI after:
- Unit tests pass
- Application builds successfully

Recommended CI workflow:
```yaml
- run: npm run test          # Unit tests
- run: npm run build         # Build app
- run: npm run test:e2e      # E2E tests
```
