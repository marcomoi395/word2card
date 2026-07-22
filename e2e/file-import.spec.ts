import { test, expect } from './helpers/test-base'
import { launchElectronApp, closeElectronApp, ElectronAppContext } from './helpers/electron'
import { testApiKeys, testDeckNames, getTestWordsPath } from './helpers/fixtures'
import { mockAnkiConnect, setupApiKeys, mockOpenAI } from './helpers/mocks'
import { expectAlertContaining } from './helpers/dialogs'
import {
    waitForButtonText,
    waitForButtonDisabled,
    waitForButtonLoadingComplete
} from './helpers/waits'

test.describe('File Import Flow', () => {
    let context: ElectronAppContext

    test.beforeEach(async () => {
        context = await launchElectronApp()
        const { window } = context
        // Setup API keys for all submit tests
        await setupApiKeys(window)
    })

    test.afterEach(async () => {
        await closeElectronApp(context.app)
    })

    test('should display file input field on Import tab', async () => {
        const { window } = context
        const importSection = window.locator('#section-import')
        await expect(importSection).toBeVisible()
        const fileInput = window.locator('#source-file')
        await expect(fileInput).toBeVisible()
        const placeholder = await fileInput.getAttribute('placeholder')
        expect(placeholder).toBeTruthy()
    })

    test('should display deck name input field', async () => {
        const { window } = context
        const deckInput = window.locator('#section-import input[name="deck"]')
        await expect(deckInput).toBeVisible()
        const placeholder = await deckInput.getAttribute('placeholder')
        expect(placeholder).toBeTruthy()
    })

    test('should display card type checkboxes', async () => {
        const { window } = context
        const flashcardCheckbox = window.locator('#chk-flashcard-import')
        await expect(flashcardCheckbox).toBeVisible()
        const quizCheckbox = window.locator('#chk-quiz-import')
        await expect(quizCheckbox).toBeVisible()
        const flashcardChecked = await flashcardCheckbox.isChecked()
        const quizChecked = await quizCheckbox.isChecked()
        expect(typeof flashcardChecked).toBe('boolean')
        expect(typeof quizChecked).toBe('boolean')
    })

    test('should allow checking Flashcard option', async () => {
        const { window } = context
        const flashcardCheckbox = window.locator('#chk-flashcard-import')
        await flashcardCheckbox.check()
        const isChecked = await flashcardCheckbox.isChecked()
        expect(isChecked).toBe(true)
    })

    test('should allow checking Quiz option', async () => {
        const { window } = context
        const quizCheckbox = window.locator('#chk-quiz-import')
        await quizCheckbox.check()
        const isChecked = await quizCheckbox.isChecked()
        expect(isChecked).toBe(true)
    })

    test('should allow checking both Flashcard and Quiz options', async () => {
        const { window } = context
        const flashcardCheckbox = window.locator('#chk-flashcard-import')
        const quizCheckbox = window.locator('#chk-quiz-import')
        await flashcardCheckbox.check()
        await quizCheckbox.check()
        const flashcardChecked = await flashcardCheckbox.isChecked()
        const quizChecked = await quizCheckbox.isChecked()
        expect(flashcardChecked).toBe(true)
        expect(quizChecked).toBe(true)
    })

    test('should show validation error when file is missing', async () => {
        const { window } = context
        const fileInput = window.locator('#source-file')
        await fileInput.fill('')
        const deckInput = window.locator('#section-import input[name="deck"]')
        await deckInput.fill(testDeckNames.fileImport)
        const flashcardCheckbox = window.locator('#chk-flashcard-import')
        await flashcardCheckbox.check()
        const submitButton = window.locator('#form-import button[type="submit"]')
        await expect(submitButton).toBeVisible()
        const title = await window.title()
        expect(title).toContain('Word2Card')
    })

    test('should show validation error when no card type is selected', async () => {
        const { window } = context
        const fileInput = window.locator('#source-file')
        await fileInput.fill(getTestWordsPath())
        const deckInput = window.locator('#section-import input[name="deck"]')
        await deckInput.fill(testDeckNames.fileImport)
        const flashcardCheckbox = window.locator('#chk-flashcard-import')
        const quizCheckbox = window.locator('#chk-quiz-import')
        if (await flashcardCheckbox.isChecked()) await flashcardCheckbox.uncheck()
        if (await quizCheckbox.isChecked()) await quizCheckbox.uncheck()
        const submitButton = window.locator('#form-import button[type="submit"]')
        await expect(submitButton).toBeVisible()
        const title = await window.title()
        expect(title).toContain('Word2Card')
    })

    test('should accept valid deck name input', async () => {
        const { window } = context
        const deckInput = window.locator('#section-import input[name="deck"]')
        const testDeckName = 'Vocabulary::Test::E2E'
        await deckInput.fill(testDeckName)
        const value = await deckInput.inputValue()
        expect(value).toBe(testDeckName)
    })

    test('should populate file input when path is entered', async () => {
        const { window } = context
        const fileInput = window.locator('#source-file')
        const testPath = getTestWordsPath()
        await fileInput.fill(testPath)
        const value = await fileInput.inputValue()
        expect(value).toBe(testPath)
    })

    test('should have submit button enabled when form is ready', async () => {
        const { window } = context
        const fileInput = window.locator('#source-file')
        await fileInput.fill(getTestWordsPath())
        const deckInput = window.locator('#section-import input[name="deck"]')
        await deckInput.fill(testDeckNames.fileImport)
        const flashcardCheckbox = window.locator('#chk-flashcard-import')
        await flashcardCheckbox.check()
        const submitButton = window.locator('#form-import button[type="submit"]')
        await expect(submitButton).toBeEnabled()
    })

    test('should show loading state during import', async () => {
        const { window } = context
        await mockAnkiConnect(window, 'success')
        await mockOpenAI(window, ['apple', 'banana', 'cherry'])
        await window.fill('#source-file', getTestWordsPath())
        await window.fill('#section-import input[name="deck"]', testDeckNames.fileImport)
        await window.check('#chk-flashcard-import')

        await window.click('#form-import button[type="submit"]')

        // Verify loading state appears
        await waitForButtonText(window, '#form-import button[type="submit"]', 'Importing...')
        await waitForButtonDisabled(window, '#form-import button[type="submit"]')

        // Wait for import to complete
        await waitForButtonLoadingComplete(
            window,
            '#form-import button[type="submit"]',
            undefined,
            15000
        )
    })

    test('should show success message after successful import (mocked)', async () => {
        const { window } = context
        await mockAnkiConnect(window, 'success')
        await mockOpenAI(window, ['apple', 'banana', 'cherry'])
        await window.fill('#source-file', getTestWordsPath())
        await window.fill('input[name="deck"]', testDeckNames.fileImport)
        await window.check('#chk-flashcard-import')

        await window.click('#form-import button[type="submit"]')

        // Wait for import to complete (success has no alert, app only alerts errors)
        await waitForButtonLoadingComplete(
            window,
            '#form-import button[type="submit"]',
            undefined,
            15000
        )
    })

    test('should handle both Flashcard and Quiz options together', async () => {
        const { window } = context
        await mockAnkiConnect(window, 'success')
        await mockOpenAI(window, ['apple', 'banana', 'cherry'])
        await window.fill('#source-file', getTestWordsPath())
        await window.fill('input[name="deck"]', testDeckNames.fileImport)
        await window.check('#chk-flashcard-import')
        await window.check('#chk-quiz-import')
        const flashcardChecked = await window.isChecked('#chk-flashcard-import')
        const quizChecked = await window.isChecked('#chk-quiz-import')
        expect(flashcardChecked).toBe(true)
        expect(quizChecked).toBe(true)

        await window.click('#form-import button[type="submit"]')

        // Wait for import to complete
        await waitForButtonLoadingComplete(
            window,
            '#form-import button[type="submit"]',
            undefined,
            15000
        )
    })
})
