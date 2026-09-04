import { lifecycleTest, test, expect } from './helpers/test-base'

test.describe('Smoke Tests', () => {
    test('should launch application successfully', async ({ sharedApp }) => {
        const { app, window } = sharedApp

        // Verify app is running
        expect(app).toBeTruthy()
        expect(window).toBeTruthy()

        // Verify window is functional - can get title
        const title = await window.title()
        expect(title).toBeTruthy()
    })

    test('should have correct window title', async ({ sharedApp }) => {
        const { window } = sharedApp

        // Get window title
        const title = await window.title()

        // Should contain app name
        expect(title).toContain('Word2Card')
    })

    test('should load main page', async ({ sharedApp }) => {
        const { window } = sharedApp

        // Wait for main content to load
        await window.waitForSelector('body', { timeout: 5000 })

        // Verify body exists
        const body = await window.locator('body')
        expect(await body.count()).toBe(1)
    })

    test('loads without CSP or security console errors', async ({ sharedApp }) => {
        const errors: string[] = []
        sharedApp.window.on('console', (message) => {
            if (message.type() === 'error') {
                errors.push(message.text())
            }
        })

        await sharedApp.window.waitForSelector('body', { timeout: 5000 })
        expect(errors.filter((message) => /csp|content security policy/i.test(message))).toEqual([])
    })
})

test('reset state returns to editable Import controls', async ({ sharedApp }) => {
    const { window } = sharedApp

    await expect(window.locator('#section-import')).toHaveClass(/active-section/)
    await expect(window.locator('#source-file')).toHaveValue('')
    await expect(window.locator('#section-import input[name="deck"]')).toHaveValue('')
})

const lifecycleTestCase = lifecycleTest

lifecycleTestCase.describe('Electron lifecycle isolation', () => {
    lifecycleTestCase(
        'uses a dedicated user-data directory for each app launch',
        async ({ lifecycleApp }) => {
            const configuredUserDataPath = await lifecycleApp.app.evaluate(({ app }) =>
                app.getPath('userData')
            )

            expect(configuredUserDataPath).toContain('word2card-e2e-')
            expect(lifecycleApp.userDataPath).toBe(configuredUserDataPath)
        }
    )
})
