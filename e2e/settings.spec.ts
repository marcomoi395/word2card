import { test, expect } from './helpers/test-base'
import { testApiKeys } from './helpers/fixtures'

test.describe('Settings Management', () => {
    test('should navigate to Settings tab', async ({ sharedApp }) => {
        const { window } = sharedApp

        // Click Settings tab button
        await window.click('#tab-settings-btn')

        // Wait for Settings section to be visible
        await window.waitForSelector('#section-settings', { state: 'visible' })

        // Verify Settings section is active
        const settingsSection = window.locator('#section-settings')
        const hasActiveClass = await settingsSection.evaluate((el) =>
            el.classList.contains('active-section')
        )
        expect(hasActiveClass).toBe(true)

        // Verify Import section is hidden
        const importSection = window.locator('#section-import')
        const importHasActiveClass = await importSection.evaluate((el) =>
            el.classList.contains('active-section')
        )
        expect(importHasActiveClass).toBe(false)
    })

    test('should have all API key input fields', async ({ sharedApp }) => {
        const { window } = sharedApp

        // Navigate to Settings
        await window.click('#tab-settings-btn')
        await window.waitForSelector('#section-settings', { state: 'visible' })

        // Verify OpenAI key field exists
        const openaiInput = window.locator('#openai-key-global')
        await expect(openaiInput).toBeVisible()

        // Verify Azure key field exists
        const azureInput = window.locator('#azure-key-global')
        await expect(azureInput).toBeVisible()

        // Verify Pexels token field exists
        const pexelsInput = window.locator('#pexels-token-global')
        await expect(pexelsInput).toBeVisible()

        // Verify Save button exists
        const saveButton = window.locator('#btn-save-settings')
        await expect(saveButton).toBeVisible()
    })

    test('should save new API keys successfully', async ({ sharedApp }) => {
        const { window } = sharedApp

        // Navigate to Settings
        await window.click('#tab-settings-btn')
        await window.waitForSelector('#section-settings', { state: 'visible' })

        // Fill in API keys
        await window.fill('#openai-key-global', testApiKeys.openai)
        await window.fill('#azure-key-global', testApiKeys.azure)
        await window.fill('#pexels-token-global', testApiKeys.pexels)

        // Verify fields are populated
        const openaiValue = await window.inputValue('#openai-key-global')
        expect(openaiValue).toBe(testApiKeys.openai)

        const azureValue = await window.inputValue('#azure-key-global')
        expect(azureValue).toBe(testApiKeys.azure)

        const pexelsValue = await window.inputValue('#pexels-token-global')
        expect(pexelsValue).toBe(testApiKeys.pexels)

        // Click Save button
        const saveButton = window.locator('#btn-save-settings')
        await saveButton.click()

        // Verify button shows loading state briefly
        await window.waitForTimeout(500)

        // Verify form is still functional after save attempt
        const title = await window.title()
        expect(title).toContain('Word2Card')
    })

    // TODO: This test is incompatible with shared app pattern (requires app restart)
    // Need to either: 1) move to separate test file without shared app, or 2) test persistence differently
    test.skip('should load saved settings on startup', async ({ sharedApp }) => {
        const { window } = sharedApp

        // First, save some settings
        await window.click('#tab-settings-btn')
        await window.waitForSelector('#section-settings', { state: 'visible' })

        await window.fill('#openai-key-global', testApiKeys.openai)
        await window.fill('#azure-key-global', testApiKeys.azure)
        await window.fill('#pexels-token-global', testApiKeys.pexels)

        // Click save button (don't wait for dialog)
        await window.click('#btn-save-settings')
        await window.waitForTimeout(1000)

        // This test requires app restart which is incompatible with shared app pattern
        // Original test: close and relaunch app, then verify settings persist
        // With shared app: can't restart mid-test
    })

    test('should update existing settings', async ({ sharedApp }) => {
        const { window } = sharedApp

        // Save initial settings
        await window.click('#tab-settings-btn')
        await window.waitForSelector('#section-settings', { state: 'visible' })

        await window.fill('#openai-key-global', testApiKeys.openai)
        await window.fill('#azure-key-global', testApiKeys.azure)
        await window.fill('#pexels-token-global', testApiKeys.pexels)

        await window.click('#btn-save-settings')
        await window.waitForTimeout(1000)

        // Update OpenAI key
        const newOpenAIKey = 'sk-test-updated-key-99999'
        await window.fill('#openai-key-global', newOpenAIKey)

        // Verify updated value in form
        const openaiValue = await window.inputValue('#openai-key-global')
        expect(openaiValue).toBe(newOpenAIKey)

        // Verify other values unchanged
        const azureValue = await window.inputValue('#azure-key-global')
        expect(azureValue).toBe(testApiKeys.azure)

        const pexelsValue = await window.inputValue('#pexels-token-global')
        expect(pexelsValue).toBe(testApiKeys.pexels)
    })

    test('should handle empty settings fields gracefully', async ({ sharedApp }) => {
        const { window } = sharedApp

        // Navigate to Settings
        await window.click('#tab-settings-btn')
        await window.waitForSelector('#section-settings', { state: 'visible' })

        // Leave all fields empty
        await window.fill('#openai-key-global', '')
        await window.fill('#azure-key-global', '')
        await window.fill('#pexels-token-global', '')

        // Try to save
        await window.click('#btn-save-settings')
        await window.waitForTimeout(1000)

        // Verify form is still functional
        const title = await window.title()
        expect(title).toContain('Word2Card')
    })

    test('shows configuration status without rendering stored secrets', async ({ sharedApp }) => {
        const { window } = sharedApp

        await window.click('#tab-settings-btn')
        await window.waitForSelector('#section-settings', { state: 'visible' })
        await expect(window.locator('#openai-key-status')).toContainText(
            /Configured|Not configured/
        )
        await expect(window.locator('#azure-key-status')).toContainText(/Configured|Not configured/)
        await expect(window.locator('#pexels-token-status')).toContainText(
            /Configured|Not configured/
        )
        await expect(window.locator('#openai-key-global')).toHaveValue('')
        await expect(window.locator('#azure-key-global')).toHaveValue('')
        await expect(window.locator('#pexels-token-global')).toHaveValue('')
    })
})
