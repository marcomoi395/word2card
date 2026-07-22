import { test as base } from '@playwright/test'
import { stopAnkiMockServer } from './anki-mock-server'

/**
 * Extended test with worker-scoped cleanup
 * Ensures mock server is properly stopped when worker exits
 */
export const test = base.extend({
    workerCleanup: [
        async ({}, use) => {
            // No setup needed - mock server starts lazily in launchElectronApp
            await use()
            // Cleanup: stop mock server when worker is done
            await stopAnkiMockServer()
        },
        { scope: 'worker', auto: true }
    ]
})

export { expect } from '@playwright/test'
