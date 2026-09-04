import { test, expect } from './helpers/test-base'

test.describe('Tab Navigation', () => {
    test('should start with Import tab active by default', async ({ sharedApp }) => {
        const { window } = sharedApp
        const importSection = window.locator('#section-import')

        await expect(importSection).toBeVisible()
        await expect(importSection).toHaveClass(/active-section/)
        await expect(window.locator('#tab-import-btn')).toHaveClass(/active-btn/)
    })

    test('should switch to Settings tab when clicked', async ({ sharedApp }) => {
        const { window } = sharedApp
        await window.click('#tab-settings-btn')
        await expect(window.locator('#section-settings')).toHaveClass(/active-section/)
        await expect(window.locator('#section-import')).not.toHaveClass(/active-section/)
    })

    test('should switch back to Import tab from Settings', async ({ sharedApp }) => {
        const { window } = sharedApp
        await window.click('#tab-settings-btn')
        await expect(window.locator('#section-settings')).toBeVisible()
        await window.click('#tab-import-btn')
        await expect(window.locator('#section-import')).toHaveClass(/active-section/)
        await expect(window.locator('#section-settings')).not.toHaveClass(/active-section/)
    })

    test('should show active button styling on current tab', async ({ sharedApp }) => {
        const { window } = sharedApp
        await expect(window.locator('#tab-import-btn')).toHaveClass(/active-btn/)
        await window.click('#tab-settings-btn')
        await expect(window.locator('#tab-settings-btn')).toHaveClass(/active-btn/)
        await expect(window.locator('#tab-import-btn')).not.toHaveClass(/active-btn/)
    })

    test('should change mascot background when switching tabs', async ({ sharedApp }) => {
        const { window } = sharedApp
        const mascot = window.locator('#bg-mascot')

        await expect(mascot).toHaveClass(/bg-import/)
        await window.click('#tab-settings-btn')
        await expect(window.locator('#section-settings')).toBeVisible()
        await expect(mascot).toHaveClass(/bg-settings/)
    })

    test('should maintain only one active section at a time', async ({ sharedApp }) => {
        const { window } = sharedApp
        const countActiveSections = () => window.locator('.active-section').count()

        expect(await countActiveSections()).toBe(1)
        await window.click('#tab-settings-btn')
        await expect(window.locator('#section-settings')).toBeVisible()
        expect(await countActiveSections()).toBe(1)
        await window.click('#tab-import-btn')
        await expect(window.locator('#section-import')).toBeVisible()
        expect(await countActiveSections()).toBe(1)
    })

    test('should navigate between Import and Settings tabs', async ({ sharedApp }) => {
        const { window } = sharedApp
        await window.click('#tab-settings-btn')
        await expect(window.locator('#section-settings')).toHaveClass(/active-section/)
        await window.click('#tab-import-btn')
        await expect(window.locator('#section-import')).toHaveClass(/active-section/)
    })
})
