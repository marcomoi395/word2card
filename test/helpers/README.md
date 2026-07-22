# Test Helpers

Shared utilities for test setup, cleanup, and common testing patterns.

## Singleton Reset Helpers

**File:** `singleton-reset.ts`

### Purpose

Ensures complete singleton cleanup between test runs to prevent state contamination across test files.

### Why This Matters

The application uses several singleton classes:
- `State` - Global application state management
- `SecretManager` - Secure credential storage
- `NotionService` - Notion API client
- `OpenAIService` - OpenAI API client  
- `SpeechService` - Azure Speech API client

Without proper cleanup, state from one test can leak into another, causing:
- ❌ Flaky tests that pass/fail randomly
- ❌ Tests that pass in isolation but fail in suite
- ❌ Cached API keys persisting across tests
- ❌ Mock interference between test files

### Usage

#### Basic: Reset All Singletons

```typescript
import { resetAllSingletons } from '@test/helpers/singleton-reset'
import { describe, it, beforeEach, vi } from 'vitest'

describe('MyModule', () => {
  beforeEach(() => {
    resetAllSingletons()
    vi.clearAllMocks()
  })

  it('works correctly', () => {
    // Test runs with fresh singleton state
  })
})
```

#### Selective: Reset Specific Singletons

```typescript
import { resetSingleton } from '@test/helpers/singleton-reset'

beforeEach(() => {
  // Only reset what you need
  resetSingleton('State')
  resetSingleton('NotionService')
})
```

#### Safety Check: Verify Cleanup

```typescript
import { verifySingletonsReset } from '@test/helpers/singleton-reset'

afterEach(() => {
  // Throws if any singleton wasn't properly cleaned up
  verifySingletonsReset()
})
```

### When to Use

| Scenario | Use Reset? | Reason |
|----------|-----------|--------|
| Testing the singleton class itself | ✅ Yes | Need fresh instance per test |
| Testing code that calls singleton methods | ✅ Yes | Prevent cached state leakage |
| Singleton is fully mocked with `vi.mock()` | ❌ No | Mock replaces real instance |
| No singletons imported | ❌ No | Nothing to reset |

### Examples from Codebase

#### Good: Direct Singleton Test

```typescript
// src/main/__tests__/state.test.ts
import { resetState } from '@test/helpers/singleton-reset'

describe('State', () => {
  beforeEach(() => {
    resetState() // Fresh State instance per test
  })

  it('returns same instance on multiple calls', () => {
    // Test singleton pattern
  })
})
```

#### Good: Code Using Real Singleton

```typescript
// src/main/__tests__/handle.test.ts (if using real State)
import { resetAllSingletons } from '@test/helpers/singleton-reset'

describe('createFlashcards', () => {
  beforeEach(() => {
    resetAllSingletons() // Clean slate
    vi.clearAllMocks()
  })
})
```

#### Not Needed: Fully Mocked

```typescript
// src/main/__tests__/handle.test.ts (current implementation)
vi.mock('../state') // State is mocked
vi.mock('../notion') // NotionService is mocked

beforeEach(() => {
  vi.clearAllMocks() // Only need to clear mocks
  // No resetAllSingletons() needed - singletons never instantiated
})
```

### Technical Notes

#### Why `as unknown as SingletonClass`?

Singleton instances are private static members. TypeScript doesn't allow accessing them directly for good reason - they're internal implementation details.

However, for testing purposes, we **need** to reset these private members to ensure test isolation. The helper uses:

```typescript
type SingletonClass = Record<string, unknown>
const stateClass = State as unknown as SingletonClass
stateClass['instance'] = undefined
```

This is safer than `as any` because:
- ✅ Still type-checked as an object with string keys
- ✅ Documents intent with explicit type
- ✅ Narrower cast than `any` (only loses class structure)
- ✅ Clear that we're accessing dynamic properties

#### Reset Values

- `State.instance` → `undefined` (matches initial state)
- `SecretManager.instance` → `undefined` (matches initial state)  
- `NotionService.instance` → `null` (matches declaration)
- `NotionService.currentToken` → `null` (cached value)
- `OpenAIService.instance` → `null` (matches declaration)
- `OpenAIService.currentKey` → `null` (cached value)
- `SpeechService.instance` → `null` (matches declaration)
- `SpeechService.currentKey` → `null` (cached value)

### Migration Guide

If you have tests with inline singleton resets:

```typescript
// Before
beforeEach(() => {
  ;(State as any).instance = undefined
  ;(NotionService as any).instance = null
  ;(NotionService as any).currentToken = null
  vi.clearAllMocks()
})

// After  
import { resetAllSingletons } from '@test/helpers/singleton-reset'

beforeEach(() => {
  resetAllSingletons()
  vi.clearAllMocks()
})
```

Benefits:
- ✅ Less code duplication
- ✅ Consistent reset pattern
- ✅ Avoids `as any` in test files
- ✅ Centralized maintenance
- ✅ Type-safe helper

### Future Improvements

Consider these patterns for new singleton classes:

1. **Expose reset method for testing:**
   ```typescript
   class MySingleton {
     private static instance: MySingleton
     
     // Expose only in test builds
     static resetForTesting?(): void {
       MySingleton.instance = undefined
     }
   }
   ```

2. **Dependency injection instead of singleton:**
   ```typescript
   // Instead of singleton, inject instance
   export function createService(deps: { state: State }) {
     return new Service(deps)
   }
   ```

3. **Factory pattern with optional instance:**
   ```typescript
   export function getState(instance?: State): State {
     return instance ?? State.getInstance()
   }
   ```
