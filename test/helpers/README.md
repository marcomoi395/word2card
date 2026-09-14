# Test Helpers

Shared utilities for test cleanup and common testing patterns.

## Singleton Reset Helpers

`singleton-reset.ts` resets service singleton caches between tests:

- `SecretManager`
- `NotionService`
- `OpenAIService`

These helpers are test-only. Production state uses the internal state package in `src/main/state/`.

Example:

```typescript
import { resetNotionService } from '../../../test/helpers/singleton-reset'

beforeEach(() => {
    resetNotionService(NotionService)
})
```

Use `verifySingletonsReset` when a test suite needs an explicit cleanup assertion.
