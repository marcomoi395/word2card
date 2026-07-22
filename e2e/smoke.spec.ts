import { test, expect } from '@playwright/test'
import { launchElectronApp, closeElectronApp, ElectronAppContext } from './helpers/electron'

test.describe('Smoke Tests', () => {
    let context: ElectronAppContext

    test.beforeEach(async () => {
        context = await launchElectronApp()
    })

    test.afterEach(async () => {
        await closeElectronApp(context.app)
    })

    test('should launch application successfully', async () => {
        const { app, window } = context

        // Verify app is running
        expect(app).toBeTruthy()
        expect(window).toBeTruthy()

        // Verify window is functional - can get title
        const title = await window.title()
        expect(title).toBeTruthy()
    })

    test('should have correct window title', async () => {
        const { window } = context

        // Get window title
        const title = await window.title()

        // Should contain app name
        expect(title).toContain('Word2Card')
    })

    test('should load main page', async () => {
        const { window } = context

        // Wait for main content to load
        await window.waitForSelector('body', { timeout: 5000 })

        // Verify body exists
        const body = await window.locator('body')
        expect(await body.count()).toBe(1)
    })
})
