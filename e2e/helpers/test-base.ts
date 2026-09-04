import { test as base } from '@playwright/test'
import {
    launchElectronApp,
    closeElectronApp,
    ElectronAppContext,
    removeTestUserData,
    resetAppState
} from './electron'

/**
 * Extended test with worker-scoped shared app and auto state reset.
 */
export const test = base.extend<{ resetState: void }, { sharedApp: ElectronAppContext }>({
    sharedApp: [
        async ({}, use) => {
            const context = await launchElectronApp()
            try {
                await use(context)
            } finally {
                await closeElectronApp(context.app)
                await removeTestUserData(context.userDataPath)
            }
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

export const lifecycleTest = base.extend<{ lifecycleApp: ElectronAppContext }>({
    lifecycleApp: async ({}, use) => {
        const context = await launchElectronApp()
        try {
            await use(context)
        } finally {
            await closeElectronApp(context.app)
            await removeTestUserData(context.userDataPath)
        }
    }
})

export { expect } from '@playwright/test'
