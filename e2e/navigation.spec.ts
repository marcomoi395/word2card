import { test, expect } from './helpers/test-base'

test.describe('Tab Navigation', () => {
    test('should start with Import tab active by default', async ({ sharedApp }) => {
        const { window } = sharedApp
        const importSection = window.locator('#section-import')
        await expect(importSection).toBeVisible()
        expect(await importSection.evaluate((el) => el.classList.contains('active-section'))).toBe(true)
        expect(await window.locator('#tab-import-btn').evaluate((el) => el.classList.contains('active-btn'))).toBe(true)
    })

    test('should switch to Settings tab when clicked', async ({ sharedApp }) => {
        const { window } = sharedApp
        await window.click('#tab-settings-btn')
        await window.waitForSelector('#section-settings', { state: 'visible' })
        await expect(window.locator('#section-settings')).toBeVisible()
        expect(await window.locator('#section-settings').evaluate((el) => el.classList.contains('active-section'))).toBe(true)
        expect(await window.locator('#section-import').evaluate((el) => el.classList.contains('active-section'))).toBe(false)
    })

    test('should switch back to Import tab from Settings', async ({ sharedApp }) => {
        const { window } = sharedApp
        await window.click('#tab-settings-btn')
        await window.waitForSelector('#section-settings', { state: 'visible' })
        await window.click('#tab-import-btn')
        await window.waitForSelector('#section-import', { state: 'visible' })
        expect(await window.locator('#section-import').evaluate((el) => el.classList.contains('active-section'))).toBe(true)
        expect(await window.locator('#section-settings').evaluate((el) => el.classList.contains('active-section'))).toBe(false)
    })

    test('should show active button styling on current tab', async ({ sharedApp }) => {
        const { window } = sharedApp
        expect(await window.locator('#tab-import-btn').evaluate((el) => el.classList.contains('active-btn'))).toBe(true)
        await window.click('#tab-settings-btn')
        await window.waitForSelector('#section-settings', { state: 'visible' })
        expect(await window.locator('#tab-settings-btn').evaluate((el) => el.classList.contains('active-btn'))).toBe(true)
        expect(await window.locator('#tab-import-btn').evaluate((el) => el.classList.contains('active-btn'))).toBe(false)
    })

    test('should change mascot background when switching tabs', async ({ sharedApp }) => {
        const { window } = sharedApp
        const mascot = window.locator('#bg-mascot')
        await expect(mascot).toBeVisible()
        expect(await mascot.evaluate((el) => el.classList.contains('bg-import'))).toBe(true)
        await window.click('#tab-settings-btn')
        await window.waitForSelector('#section-settings', { state: 'visible' })
        expect(await mascot.evaluate((el) => el.classList.contains('bg-settings'))).toBe(true)
    })

    test('should maintain only one active section at a time', async ({ sharedApp }) => {
        const { window } = sharedApp
        const countActiveSections = () => window.locator('.active-section').count()
        expect(await countActiveSections()).toBe(1)
        await window.click('#tab-settings-btn')
        await window.waitForSelector('#section-settings', { state: 'visible' })
        expect(await countActiveSections()).toBe(1)
        await window.click('#tab-import-btn')
        await window.waitForSelector('#section-import', { state: 'visible' })
        expect(await countActiveSections()).toBe(1)
    })

    test('should navigate between Import and Settings tabs', async ({ sharedApp }) => {
        const { window } = sharedApp
        await window.click('#tab-settings-btn')
        await window.waitForSelector('#section-settings', { state: 'visible' })
        expect(await window.locator('#section-settings').evaluate((el) => el.classList.contains('active-section'))).toBe(true)
        await window.click('#tab-import-btn')
        await window.waitForSelector('#section-import', { state: 'visible' })
        expect(await window.locator('#section-import').evaluate((el) => el.classList.contains('active-section'))).toBe(true)
    })
})
