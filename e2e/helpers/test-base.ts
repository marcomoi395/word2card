import { test as base } from '@playwright/test'
import { launchElectronApp, closeElectronApp, ElectronAppContext, resetAppState } from './electron'

/**
 * Extended test with worker-scoped shared app and auto state reset.
 */
export const test = base.extend<{ resetState: void }, { sharedApp: ElectronAppContext }>({
    sharedApp: [
        async ({}, use) => {
            const context = await launchElectronApp()
            await use(context)
            await closeElectronApp(context.app)
        },
        { scope: 'worker', auto: true }
    ],
    resetState: [
        async ({ sharedApp }, use) => {
            await resetAppState(sharedApp.window)
            await use()
        },
        { scope: 'test', auto: true }
    ]
})

export { expect } from '@playwright/test'
