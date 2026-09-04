import { lifecycleTest, test, expect } from './helpers/test-base'

test.describe('Smoke Tests', () => {
    test('should launch application successfully', async ({ sharedApp }) => {
        const { window } = sharedApp

        await expect(window.locator('body')).toBeVisible()
        await expect(window).toHaveTitle(/Word2Card/)
    })

    test('should have correct window title', async ({ sharedApp }) => {
        const { window } = sharedApp

        await expect(window).toHaveTitle(/Word2Card/)
    })

    test('should load main page', async ({ sharedApp }) => {
        const { window } = sharedApp

        await expect(window.locator('body')).toBeVisible()
        await expect(window.locator('#section-import')).toBeVisible()
    })

    test('loads without CSP or security console errors', async ({ sharedApp }) => {
        const errors: string[] = []
        sharedApp.window.on('console', (message) => {
            if (message.type() === 'error') {
                errors.push(message.text())
            }
        })
        await expect(sharedApp.window.locator('body')).toBeVisible()
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
