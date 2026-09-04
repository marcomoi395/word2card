import { test, expect } from './helpers/test-base'

test.describe('Collection', () => {
    test('shows the collection navigation and empty persisted list state', async ({
        sharedApp
    }) => {
        const { window } = sharedApp

        await window.click('#tab-collection-btn')
        await expect(window.locator('#section-collection')).toHaveClass(/active-section/)
        await expect(window.locator('.collection-grid')).toBeVisible()
        await expect(window.locator('#section-collection [role="status"]')).toHaveText(
            'No words in this import yet.'
        )
    })

    test('exposes collection action controls without inventing records', async ({ sharedApp }) => {
        const { window } = sharedApp

        await window.click('#tab-collection-btn')
        await expect(window.locator('#btn-add-collection-word')).toBeVisible()
        await expect(window.locator('#btn-delete-collection-selected')).toBeVisible()
        await expect(window.locator('.collection-grid .select-all')).toBeVisible()
    })

    test('renders the existing empty import state', async ({ sharedApp }) => {
        const { window } = sharedApp

        await expect(window.locator('#section-import')).toHaveClass(/active-section/)
        await window.locator('#btn-add-import-word').click()
        await window.locator('#section-import .data-grid tbody .row-select').last().check()
        await window.locator('#btn-delete-import-selected').click()
        await expect(window.locator('#section-import [role="status"]')).toHaveText(
            'No words in this import yet.'
        )
    })
})
