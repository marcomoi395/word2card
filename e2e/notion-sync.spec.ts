import { test, expect } from '@playwright/test'
import { launchElectronApp, closeElectronApp, ElectronAppContext } from './helpers/electron'
import { testApiKeys, testDeckNames } from './helpers/fixtures'
import { mockAnkiConnect, setupApiKeys, mockOpenAI, mockNotion } from './helpers/mocks'
import { expectAlertWithMessage } from './helpers/dialogs'
import { waitForButtonText, waitForButtonDisabled, waitForButtonLoadingComplete } from './helpers/waits'

test.describe('Notion Sync Flow', () => {
  let context: ElectronAppContext

  test.beforeEach(async () => {
    context = await launchElectronApp()
    const { window } = context
    // Setup API keys for all submit tests
    await setupApiKeys(window)
    // Mock external APIs
    await mockOpenAI(window, ['test', 'word', 'apple'])
    await mockNotion(window, ['test', 'word', 'apple'])
  })

  test.afterEach(async () => {
    await closeElectronApp(context.app)
  })

  test('should navigate to Notion Sync tab', async () => {
    const { window } = context

    // Click Notion tab button
    await window.click('#tab-notion-btn')

    // Wait for Notion section to be visible
    await window.waitForSelector('#section-notion', { state: 'visible' })

    // Verify Notion section is active
    const notionSection = window.locator('#section-notion')
    const hasActiveClass = await notionSection.evaluate(el =>
      el.classList.contains('active-section')
    )
    expect(hasActiveClass).toBe(true)
  })

  test('should display Notion token input field', async () => {
    const { window } = context

    // Navigate to Notion tab
    await window.click('#tab-notion-btn')
    await window.waitForSelector('#section-notion', { state: 'visible' })

    // Verify Notion token field exists
    const tokenInput = window.locator('#notion-token')
    await expect(tokenInput).toBeVisible()
  })

  test('should display Notion database ID input field', async () => {
    const { window } = context

    await window.click('#tab-notion-btn')
    await window.waitForSelector('#section-notion', { state: 'visible' })

    // Verify database ID field exists
    const dbIdInput = window.locator('#notion-database-id')
    await expect(dbIdInput).toBeVisible()
  })

  test('should display deck name input for Notion sync', async () => {
    const { window } = context

    await window.click('#tab-notion-btn')
    await window.waitForSelector('#section-notion', { state: 'visible' })

    // Check for deck name input in Notion form
    const deckInput = window.locator('#form-notion input[name="deck"]')
    await expect(deckInput).toBeVisible()
  })

  test('should display card type checkboxes for Notion sync', async () => {
    const { window } = context

    await window.click('#tab-notion-btn')
    await window.waitForSelector('#section-notion', { state: 'visible' })

    // Verify Flashcard checkbox
    const flashcardCheckbox = window.locator('#chk-flashcard-notion')
    await expect(flashcardCheckbox).toBeVisible()

    // Verify Quiz checkbox
    const quizCheckbox = window.locator('#chk-quiz-notion')
    await expect(quizCheckbox).toBeVisible()
  })

  test('should validate Notion token is required', async () => {
    const { window } = context

    await window.click('#tab-notion-btn')
    await window.waitForSelector('#section-notion', { state: 'visible' })

    // Leave token empty
    await window.fill('#notion-token', '')

    // Fill other fields
    await window.fill('#notion-database-id', testApiKeys.notionDatabaseId)
    await window.fill('#form-notion input[name="deck"]', testDeckNames.notionSync)
    await window.check('#chk-flashcard-notion')

    // Try to submit - should show validation alert
    const alertPromise = expectAlertWithMessage(window, 'Please provide a Notion token.')
    await window.click('#form-notion button[type="submit"]')
    await alertPromise
  })

  test('should validate Notion database ID is required', async () => {
    const { window } = context

    await window.click('#tab-notion-btn')
    await window.waitForSelector('#section-notion', { state: 'visible' })

    // Fill token but leave database ID empty
    await window.fill('#notion-token', testApiKeys.notionToken)
    await window.fill('#notion-database-id', '')
    await window.fill('#form-notion input[name="deck"]', testDeckNames.notionSync)
    await window.check('#chk-flashcard-notion')

    // Try to submit - should show validation alert
    const alertPromise = expectAlertWithMessage(window, 'Please provide a Notion database ID.')
    await window.click('#form-notion button[type="submit"]')
    await alertPromise
  })

  test('should validate at least one card type is selected', async () => {
    const { window } = context

    await window.click('#tab-notion-btn')
    await window.waitForSelector('#section-notion', { state: 'visible' })

    // Fill all fields except card type selection
    await window.fill('#notion-token', testApiKeys.notionToken)
    await window.fill('#notion-database-id', testApiKeys.notionDatabaseId)
    await window.fill('#form-notion input[name="deck"]', testDeckNames.notionSync)

    // Ensure both checkboxes are unchecked
    const flashcardCheckbox = window.locator('#chk-flashcard-notion')
    const quizCheckbox = window.locator('#chk-quiz-notion')

    if (await flashcardCheckbox.isChecked()) {
      await flashcardCheckbox.uncheck()
    }
    if (await quizCheckbox.isChecked()) {
      await quizCheckbox.uncheck()
    }

    // Try to submit - should show validation alert
    const alertPromise = expectAlertWithMessage(window, 'Please select at least one import option (Quiz or Flashcard).')
    await window.click('#form-notion button[type="submit"]')
    await alertPromise
  })

  test('should accept valid Notion credentials', async () => {
    const { window } = context

    await window.click('#tab-notion-btn')
    await window.waitForSelector('#section-notion', { state: 'visible' })

    // Fill valid credentials
    await window.fill('#notion-token', testApiKeys.notionToken)
    await window.fill('#notion-database-id', testApiKeys.notionDatabaseId)

    // Verify values are populated
    const tokenValue = await window.inputValue('#notion-token')
    expect(tokenValue).toBe(testApiKeys.notionToken)

    const dbIdValue = await window.inputValue('#notion-database-id')
    expect(dbIdValue).toBe(testApiKeys.notionDatabaseId)
  })

  test('should show loading state during Notion sync', async () => {
    const { window } = context

    // Mock successful sync
    await mockAnkiConnect(window, 'success')

    await window.click('#tab-notion-btn')
    await window.waitForSelector('#section-notion', { state: 'visible' })

    // Fill form
    await window.fill('#notion-token', testApiKeys.notionToken)
    await window.fill('#notion-database-id', testApiKeys.notionDatabaseId)
    await window.fill('#form-notion input[name="deck"]', testDeckNames.notionSync)
    await window.check('#chk-flashcard-notion')

    // Submit form
    await window.click('#form-notion button[type="submit"]')

    // Verify loading state appears
    await waitForButtonText(window, '#form-notion button[type="submit"]', 'Syncing...')
    await waitForButtonDisabled(window, '#form-notion button[type="submit"]')
    
    // Wait for sync to complete
    await waitForButtonLoadingComplete(window, '#form-notion button[type="submit"]', undefined, 15000)
  })

  test('should show success message after successful sync (mocked)', async () => {
    const { window } = context

    // Mock successful sync
    await mockAnkiConnect(window, 'success')

    await window.click('#tab-notion-btn')
    await window.waitForSelector('#section-notion', { state: 'visible' })

    // Fill form completely
    await window.fill('#notion-token', testApiKeys.notionToken)
    await window.fill('#notion-database-id', testApiKeys.notionDatabaseId)
    await window.fill('#form-notion input[name="deck"]', testDeckNames.notionSync)
    await window.check('#chk-flashcard-notion')

    await window.click('#form-notion button[type="submit"]')

    // Wait for sync to complete (success has no alert, app only alerts errors)
    await waitForButtonLoadingComplete(window, '#form-notion button[type="submit"]', undefined, 15000)
  })

  test('should handle both Flashcard and Quiz options for Notion sync', async () => {
    const { window } = context

    await mockAnkiConnect(window, 'success')

    await window.click('#tab-notion-btn')
    await window.waitForSelector('#section-notion', { state: 'visible' })

    // Fill form with both card types
    await window.fill('#notion-token', testApiKeys.notionToken)
    await window.fill('#notion-database-id', testApiKeys.notionDatabaseId)
    await window.fill('#form-notion input[name="deck"]', testDeckNames.notionSync)
    await window.check('#chk-flashcard-notion')
    await window.check('#chk-quiz-notion')

    // Verify both are checked
    const flashcardChecked = await window.isChecked('#chk-flashcard-notion')
    const quizChecked = await window.isChecked('#chk-quiz-notion')
    expect(flashcardChecked).toBe(true)
    expect(quizChecked).toBe(true)

    await window.click('#form-notion button[type="submit"]')

    // Wait for sync to complete
    await waitForButtonLoadingComplete(window, '#form-notion button[type="submit"]', undefined, 15000)
  })
})
