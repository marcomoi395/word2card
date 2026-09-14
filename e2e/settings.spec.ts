import { test, expect } from './helpers/test-base'
import { testApiKeys } from './helpers/fixtures'
import { closeElectronApp, launchElectronApp, removeTestUserData } from './helpers/electron'

test.describe('Settings Management', () => {
    test('should navigate to Settings tab', async ({ sharedApp }) => {
        const { window } = sharedApp

        await window.click('#tab-settings-btn')
        await expect(window.locator('#section-settings')).toHaveClass(/active-section/)
        await expect(window.locator('#section-import')).not.toHaveClass(/active-section/)
    })

    test('should expose only visible editable API key controls', async ({ sharedApp }) => {
        const { window } = sharedApp

        await window.click('#tab-settings-btn')
        await expect(window.locator('#openai-key-global')).toBeVisible()
        await expect(window.locator('#pexels-token-global')).toBeVisible()
        await expect(window.locator('#btn-save-settings')).toBeVisible()
    })

    test('should save visible API keys successfully', async ({ sharedApp }) => {
        const { window } = sharedApp

        await window.click('#tab-settings-btn')
        await window.fill('#openai-key-global', testApiKeys.openai)
        await window.fill('#pexels-token-global', testApiKeys.pexels)
        await window.click('#btn-save-settings')
        await expect(window.locator('#btn-save-settings')).toBeEnabled()
    })

    test('should update visible settings without changing other values', async ({ sharedApp }) => {
        const { window } = sharedApp

        await window.click('#tab-settings-btn')
        await window.fill('#openai-key-global', testApiKeys.openai)
        await window.fill('#pexels-token-global', testApiKeys.pexels)
        await window.fill('#openai-key-global', 'sk-test-updated-key-99999')
        await expect(window.locator('#openai-key-global')).toHaveValue('sk-test-updated-key-99999')
        await expect(window.locator('#pexels-token-global')).toHaveValue(testApiKeys.pexels)
    })

    test('should handle empty visible settings fields gracefully', async ({ sharedApp }) => {
        const { window } = sharedApp

        await window.click('#tab-settings-btn')
        await window.fill('#openai-key-global', '')
        await window.fill('#pexels-token-global', '')
        await window.click('#btn-save-settings')
        await expect(window.locator('#btn-save-settings')).toBeEnabled()
    })

    test('shows configuration status without rendering stored secrets', async ({ sharedApp }) => {
        const { window } = sharedApp

        await window.click('#tab-settings-btn')
        await expect(window.locator('#openai-key-status')).toContainText(
            /Configured|Not configured/
        )
        await expect(window.locator('#pexels-token-status')).toContainText(
            /Configured|Not configured/
        )
        await expect(window.locator('#openai-key-global')).toHaveValue('')
        await expect(window.locator('#pexels-token-global')).toHaveValue('')
    })
})

test.describe('Settings restart persistence', () => {
    test('persists visible settings after restarting with the same user data path', async () => {
        const first = await launchElectronApp()
        const userDataPath = first.userDataPath

        try {
            await first.window.click('#tab-settings-btn')
            await first.window.fill('#openai-key-global', testApiKeys.openai)
            await first.window.fill('#pexels-token-global', testApiKeys.pexels)
            await first.window.click('#btn-save-settings')
            await expect(first.window.locator('#btn-save-settings')).toBeEnabled()
            await closeElectronApp(first.app)

            const second = await launchElectronApp({ userDataPath })
            try {
                await second.window.click('#tab-settings-btn')
                await expect(second.window.locator('#openai-key-status')).toContainText(
                    'Configured'
                )
                await expect(second.window.locator('#pexels-token-status')).toContainText(
                    'Configured'
                )
            } finally {
                await closeElectronApp(second.app)
            }
        } finally {
            await removeTestUserData(userDataPath)
        }
    })
})
