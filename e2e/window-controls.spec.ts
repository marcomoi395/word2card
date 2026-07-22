import { test, expect } from './helpers/test-base'
import { launchElectronApp, closeElectronApp, ElectronAppContext } from './helpers/electron'

test.describe('Window Controls', () => {
    let context: ElectronAppContext

    test.beforeEach(async () => {
        context = await launchElectronApp()
    })

    test.afterEach(async () => {
        await closeElectronApp(context.app)
    })

    test('should have minimize button visible', async () => {
        const { window } = context

        const minimizeButton = window.locator('#minimize-btn')

        // Check if button exists
        await expect(minimizeButton).toBeDefined()

        // Check visibility based on platform
        const platform = await window.evaluate(() => window.api.platform)

        if (platform === 'linux') {
            // On Linux, minimize button should be hidden
            const isVisible = await minimizeButton.isVisible().catch(() => false)
            expect(isVisible).toBe(false)
        } else {
            // On Windows/macOS, should be visible
            await expect(minimizeButton).toBeVisible()
        }
    })

    test('should have close button visible', async () => {
        const { window } = context

        const closeButton = window.locator('#close-btn')
        await expect(closeButton).toBeVisible()
    })

    test('should trigger minimize action when minimize button clicked (non-Linux)', async () => {
        const { window } = context

        const platform = await window.evaluate(() => window.api.platform)

        // Skip this test on Linux
        if (platform === 'linux') {
            test.skip()
            return
        }

        const minimizeButton = window.locator('#minimize-btn')

        // Set up listener for minimize IPC call
        const minimizeCalled = await window.evaluate(() => {
            let called = false
            const originalMinimize = window.api.minimize

            window.api.minimize = () => {
                called = true
                originalMinimize()
            }

            return new Promise<boolean>((resolve) => {
                setTimeout(() => {
                    // Click minimize button
                    const btn = document.getElementById('minimize-btn')
                    if (btn) {
                        btn.click()
                    }

                    setTimeout(() => {
                        resolve(called)
                    }, 500)
                }, 100)
            })
        })

        expect(minimizeCalled).toBe(true)
    })

    test('should have close button clickable', async () => {
        const { window } = context

        const closeButton = window.locator('#close-btn')

        // Verify button is enabled and clickable
        await expect(closeButton).toBeEnabled()

        // Verify button has the close-btn id
        const buttonId = await closeButton.getAttribute('id')
        expect(buttonId).toBe('close-btn')

        // Verify app is still functional (button exists and is visible)
        const isVisible = await closeButton.isVisible()
        expect(isVisible).toBe(true)
    })

    test('should hide minimize button on Linux platform', async () => {
        const { window } = context

        const platform = await window.evaluate(() => window.api.platform)

        if (platform !== 'linux') {
            test.skip()
            return
        }

        const minimizeButton = window.locator('#minimize-btn')

        // On Linux, minimize button should not be visible
        const display = await minimizeButton.evaluate((el) => {
            return window.getComputedStyle(el).display
        })

        expect(display).toBe('none')
    })

    test('should show minimize button on Windows platform', async () => {
        const { window } = context

        const platform = await window.evaluate(() => window.api.platform)

        if (platform !== 'win32') {
            test.skip()
            return
        }

        const minimizeButton = window.locator('#minimize-btn')
        await expect(minimizeButton).toBeVisible()

        const display = await minimizeButton.evaluate((el) => {
            return window.getComputedStyle(el).display
        })

        expect(display).not.toBe('none')
    })

    test('should show minimize button on macOS platform', async () => {
        const { window } = context

        const platform = await window.evaluate(() => window.api.platform)

        if (platform !== 'darwin') {
            test.skip()
            return
        }

        const minimizeButton = window.locator('#minimize-btn')
        await expect(minimizeButton).toBeVisible()

        const display = await minimizeButton.evaluate((el) => {
            return window.getComputedStyle(el).display
        })

        expect(display).not.toBe('none')
    })

    test('should have correct button layout in window controls', async () => {
        const { window } = context

        // Both buttons should exist
        const minimizeButton = window.locator('#minimize-btn')
        const closeButton = window.locator('#close-btn')

        const minimizeExists = await minimizeButton.count()
        const closeExists = await closeButton.count()

        expect(minimizeExists).toBe(1)
        expect(closeExists).toBe(1)
    })

    test('should detect platform correctly', async () => {
        const { window } = context

        const platform = await window.evaluate(() => window.api.platform)

        // Platform should be one of the valid Node.js platform strings
        const validPlatforms = ['win32', 'darwin', 'linux', 'freebsd', 'openbsd', 'sunos', 'aix']
        expect(validPlatforms).toContain(platform)
    })
})
