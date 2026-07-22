import type { Page } from '@playwright/test'

/**
 * Wait for button to complete loading cycle (disabled → enabled)
 * Verifies button text returns to original or specified final text
 */
export async function waitForButtonLoadingComplete(
  page: Page,
  buttonSelector: string,
  expectedFinalText?: string,
  timeout = 10000
): Promise<void> {
  try {
    await page.waitForFunction(
      ({ selector, finalText }) => {
        const button = document.querySelector(selector) as HTMLButtonElement | null
        if (!button) return false

        const isEnabled = !button.disabled
        const currentText = button.textContent?.trim() || ''
        const originalText = button.dataset.originalText || ''

        // Button must be enabled
        if (!isEnabled) return false

        // Check text matches expected final state
        if (finalText !== undefined) {
          return currentText === finalText
        }

        // If no expected text specified, check it returned to original or is a known final state
        return currentText === originalText || !currentText.toLowerCase().includes('processing') && !currentText.toLowerCase().includes('loading') && !currentText.toLowerCase().includes('importing') && !currentText.toLowerCase().includes('syncing')
      },
      { selector: buttonSelector, finalText: expectedFinalText },
      { timeout }
    )
  } catch (error) {
    throw new Error(
      `Timeout waiting for button "${buttonSelector}" to complete loading cycle. Expected final text: ${expectedFinalText || 'original text'}`
    )
  }
}

/**
 * Wait for button to show specific text (e.g., "Importing...")
 */
export async function waitForButtonText(
  page: Page,
  buttonSelector: string,
  expectedText: string,
  timeout = 5000
): Promise<void> {
  try {
    await page.waitForFunction(
      ({ selector, text }) => {
        const button = document.querySelector(selector)
        return button?.textContent?.trim() === text
      },
      { selector: buttonSelector, text: expectedText },
      { timeout }
    )
  } catch (error) {
    throw new Error(
      `Timeout waiting for button "${buttonSelector}" to show text "${expectedText}"`
    )
  }
}

/**
 * Wait for button to become disabled
 */
export async function waitForButtonDisabled(
  page: Page,
  buttonSelector: string,
  timeout = 2000
): Promise<void> {
  try {
    await page.waitForFunction(
      (selector) => {
        const button = document.querySelector(selector) as HTMLButtonElement | null
        return button?.disabled === true
      },
      buttonSelector,
      { timeout }
    )
  } catch (error) {
    throw new Error(`Timeout waiting for button "${buttonSelector}" to become disabled`)
  }
}

/**
 * Wait for button to become enabled
 */
export async function waitForButtonEnabled(
  page: Page,
  buttonSelector: string,
  timeout = 5000
): Promise<void> {
  try {
    await page.waitForFunction(
      (selector) => {
        const button = document.querySelector(selector) as HTMLButtonElement | null
        return button?.disabled === false
      },
      buttonSelector,
      { timeout }
    )
  } catch (error) {
    throw new Error(`Timeout waiting for button "${buttonSelector}" to become enabled`)
  }
}
