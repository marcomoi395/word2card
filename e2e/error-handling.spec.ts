import { test, expect } from '@playwright/test'
import { launchElectronApp, closeElectronApp, ElectronAppContext } from './helpers/electron'
import { testApiKeys, testDeckNames, getTestWordsPath } from './helpers/fixtures'
import { mockAnkiConnect, setupApiKeys, mockOpenAI } from './helpers/mocks'
import { expectAlertWithMessage, expectAlertContaining } from './helpers/dialogs'
import { waitForButtonEnabled, waitForButtonLoadingComplete } from './helpers/waits'

test.describe('Error Handling - External Service Failures', () => {
  let context: ElectronAppContext

  test.beforeEach(async () => {
    context = await launchElectronApp()
    await setupApiKeys(context.window)
    await mockOpenAI(context.window, ['apple', 'banana', 'cherry', 'orange', 'grape'])
  })

  test.afterEach(async () => {
    await closeElectronApp(context.app)
  })

  test('should show error when AnkiConnect is not available', async () => {
    const { window } = context

    await mockAnkiConnect(window, 'failure')

    await window.fill('#source-file', getTestWordsPath())
    await window.fill('input[name="deck"]', testDeckNames.fileImport)
    await window.check('#chk-flashcard-import')

    // Verify error dialog is shown
    const alertPromise = expectAlertContaining(
      window,
      'AnkiConnect is not running'
    )
    await window.click('#form-import button[type="submit"]')
    await alertPromise

    // Verify button is re-enabled after error
    await waitForButtonEnabled(window, '#form-import button[type="submit"]')
  })

  test('should handle AnkiConnect failure on Notion sync', async () => {
    const { window } = context

    await mockAnkiConnect(window, 'failure')

    await window.click('#tab-notion-btn')
    await window.waitForSelector('#section-notion', { state: 'visible' })

    await window.fill('#notion-token', testApiKeys.notionToken)
    await window.fill('#notion-database-id', testApiKeys.notionDatabaseId)
    await window.fill('#form-notion input[name="deck"]', testDeckNames.notionSync)
    await window.check('#chk-flashcard-notion')

    // Verify error dialog is shown
    const alertPromise = expectAlertContaining(
      window,
      'AnkiConnect is not running'
    )
    await window.click('#form-notion button[type="submit"]')
    await alertPromise

    // Verify button is re-enabled after error
    await waitForButtonEnabled(window, '#form-notion button[type="submit"]')
  })

  test('should allow retry after AnkiConnect failure', async () => {
    const { window } = context

    await mockAnkiConnect(window, 'failure')

    await window.fill('#source-file', getTestWordsPath())
    await window.fill('input[name="deck"]', testDeckNames.fileImport)
    await window.check('#chk-flashcard-import')

    // First attempt should fail with error dialog
    const alertPromise = expectAlertContaining(window, 'AnkiConnect')
    await window.click('#form-import button[type="submit"]')
    await alertPromise

    await mockAnkiConnect(window, 'success')

    // Click submit again - should work now that AnkiConnect is back
    await window.click('#form-import button[type="submit"]')

    // Wait for import to complete successfully
    await waitForButtonLoadingComplete(window, '#form-import button[type="submit"]', undefined, 15000)
  })

  test('should not crash app when service fails', async () => {
    const { window } = context

    await mockAnkiConnect(window, 'failure')

    await window.fill('#source-file', getTestWordsPath())
    await window.fill('input[name="deck"]', testDeckNames.fileImport)
    await window.check('#chk-flashcard-import')

    const alertPromise = expectAlertContaining(window, 'AnkiConnect')
    await window.click('#form-import button[type="submit"]')
    await alertPromise

    // Verify app is still responsive - can navigate to other tabs
    await window.click('#tab-notion-btn')
    await window.waitForSelector('#section-notion', { state: 'visible' })

    const notionSection = window.locator('#section-notion')
    const isVisible = await notionSection.isVisible()
    expect(isVisible).toBe(true)
  })

  test('should preserve form data after error', async () => {
    const { window } = context

    await mockAnkiConnect(window, 'failure')

    const testFilePath = getTestWordsPath()
    const testDeckName = testDeckNames.fileImport

    await window.fill('#source-file', testFilePath)
    await window.fill('input[name="deck"]', testDeckName)
    await window.check('#chk-flashcard-import')

    const alertPromise = expectAlertContaining(window, 'AnkiConnect')
    await window.click('#form-import button[type="submit"]')
    await alertPromise

    // Verify form data is preserved after error

    const fileValue = await window.inputValue('#source-file')
    expect(fileValue).toBe(testFilePath)

    const deckValue = await window.inputValue('input[name="deck"]')
    expect(deckValue).toBe(testDeckName)

    const flashcardChecked = await window.isChecked('#chk-flashcard-import')
    expect(flashcardChecked).toBe(true)
  })

  test('should handle multiple consecutive errors gracefully', async () => {
    const { window } = context

    await mockAnkiConnect(window, 'failure')

    await window.fill('#source-file', getTestWordsPath())
    await window.fill('input[name="deck"]', testDeckNames.fileImport)
    await window.check('#chk-flashcard-import')

    // First error
    let alertPromise = expectAlertContaining(window, 'AnkiConnect')
    await window.click('#form-import button[type="submit"]')
    await alertPromise

    // Second error
    alertPromise = expectAlertContaining(window, 'AnkiConnect')
    await window.click('#form-import button[type="submit"]')
    await alertPromise

    // Third error
    alertPromise = expectAlertContaining(window, 'AnkiConnect')
    await window.click('#form-import button[type="submit"]')
    await alertPromise

    // Verify app is still responsive after multiple errors
    const title = await window.title()
    expect(title).toContain('Word2Card')
  })
})
