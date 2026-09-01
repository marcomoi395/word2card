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

    test('should display card type checkboxes', async ({ sharedApp }) => {
        const { window } = sharedApp
        const flashcardCheckbox = window.locator('#chk-flashcard-import')
        const quizCheckbox = window.locator('#chk-quiz-import')
        await expect(flashcardCheckbox).toBeVisible()
        await expect(quizCheckbox).toBeVisible()
        expect(typeof (await flashcardCheckbox.isChecked())).toBe('boolean')
        expect(typeof (await quizCheckbox.isChecked())).toBe('boolean')
    })

    test('should allow checking Flashcard option', async ({ sharedApp }) => {
        const checkbox = sharedApp.window.locator('#chk-flashcard-import')
        await checkbox.check()
        await expect(checkbox).toBeChecked()
    })

    test('should allow checking Quiz option', async ({ sharedApp }) => {
        const checkbox = sharedApp.window.locator('#chk-quiz-import')
        await checkbox.check()
        await expect(checkbox).toBeChecked()
    })

    test('should allow checking both Flashcard and Quiz options', async ({ sharedApp }) => {
        const { window } = sharedApp
        const flashcardCheckbox = window.locator('#chk-flashcard-import')
        const quizCheckbox = window.locator('#chk-quiz-import')
        await flashcardCheckbox.check()
        await quizCheckbox.check()
        await expect(flashcardCheckbox).toBeChecked()
        await expect(quizCheckbox).toBeChecked()
    })

    test('should show validation error when file is missing', async ({ sharedApp }) => {
        const { window } = sharedApp
        await window.locator('#source-file').fill('')
        await window.locator('#section-import input[name="deck"]').fill(testDeckNames.fileImport)
        await window.locator('#chk-flashcard-import').check()
        await expect(window.locator('#form-import button[type="submit"]')).toBeVisible()
    })

    test('should show validation error when no card type is selected', async ({ sharedApp }) => {
        const { window } = sharedApp
        await window.locator('#source-file').fill(getTestWordsPath())
        await window.locator('#section-import input[name="deck"]').fill(testDeckNames.fileImport)
        const flashcardCheckbox = window.locator('#chk-flashcard-import')
        const quizCheckbox = window.locator('#chk-quiz-import')
        if (await flashcardCheckbox.isChecked()) await flashcardCheckbox.uncheck()
        if (await quizCheckbox.isChecked()) await quizCheckbox.uncheck()
        await expect(window.locator('#form-import button[type="submit"]')).toBeVisible()
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
        await window.locator('#chk-flashcard-import').check()
        await expect(window.locator('#form-import button[type="submit"]')).toBeEnabled()
    })
})
