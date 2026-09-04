import { test, expect } from './helpers/test-base'
import { testDeckNames, getTestWordsPath } from './helpers/fixtures'

test.describe('File Import UI', () => {
    test('should display file input field on Import tab', async ({ sharedApp }) => {
        const { window } = sharedApp
        const importSection = window.locator('#section-import')
        await expect(importSection).toBeVisible()
        const fileInput = window.locator('#source-file')
        await expect(fileInput).toBeVisible()
        expect(await fileInput.getAttribute('placeholder')).toBeTruthy()
    })

    test('should display deck name input field', async ({ sharedApp }) => {
        const deckInput = sharedApp.window.locator('#section-import input[name="deck"]')
        await expect(deckInput).toBeVisible()
        expect(await deckInput.getAttribute('placeholder')).toBeTruthy()
    })

    test('should use flashcards by default', async ({ sharedApp }) => {
        const { window } = sharedApp
        await expect(window.locator('#source-file-fields #chk-flashcard-import')).toHaveCount(0)
        await expect(window.locator('#source-file-fields #chk-quiz-import')).toHaveCount(0)
    })

    test('should show validation error when file is missing', async ({ sharedApp }) => {
        const { window } = sharedApp
        await window.locator('#source-file').fill('')
        await window.locator('#section-import input[name="deck"]').fill(testDeckNames.fileImport)
        await window.locator('#form-import button[type="submit"]').click()
        await expect(window.locator('#app-toast')).toHaveText('Please provide a source file path.')
    })

    test('should import the deterministic local fixture', async ({ sharedApp }) => {
        const { window } = sharedApp
        await window.locator('#source-file').fill(getTestWordsPath())
        await window.locator('#section-import input[name="deck"]').fill(testDeckNames.fileImport)
        await window.locator('#form-import button[type="submit"]').click()
        await expect(window.locator('#section-import .data-grid tbody tr')).not.toHaveCount(0)
    })

    test('should accept valid deck name input', async ({ sharedApp }) => {
        const deckInput = sharedApp.window.locator('#section-import input[name="deck"]')
        const testDeckName = 'Vocabulary::Test::E2E'
        await deckInput.fill(testDeckName)
        expect(await deckInput.inputValue()).toBe(testDeckName)
    })

    test('should populate file input when path is entered', async ({ sharedApp }) => {
        const fileInput = sharedApp.window.locator('#source-file')
        const testPath = getTestWordsPath()
        await fileInput.fill(testPath)
        expect(await fileInput.inputValue()).toBe(testPath)
    })

    test('should have submit button enabled when form is ready', async ({ sharedApp }) => {
        const { window } = sharedApp
        await window.locator('#source-file').fill(getTestWordsPath())
        await window.locator('#section-import input[name="deck"]').fill(testDeckNames.fileImport)
        await expect(window.locator('#form-import button[type="submit"]')).toBeEnabled()
    })
})
