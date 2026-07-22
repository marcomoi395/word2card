import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

/**
 * Wait for and verify alert dialog with expected message (exact match)
 * Automatically accepts the dialog after verification
 */
export async function expectAlertWithMessage(
  page: Page,
  expectedMessage: string
): Promise<void> {
  const dialogPromise = new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout waiting for alert dialog with message: "${expectedMessage}"`))
    }, 5000)

    page.once('dialog', async (dialog) => {
      clearTimeout(timeout)
      try {
        const actualMessage = dialog.message()
        await dialog.accept()
        resolve(actualMessage)
      } catch (error) {
        reject(error)
      }
    })
  })

  const actualMessage = await dialogPromise
  expect(actualMessage).toBe(expectedMessage)
}

/**
 * Wait for and verify alert dialog contains substring
 * Automatically accepts the dialog after verification
 */
export async function expectAlertContaining(
  page: Page,
  substring: string
): Promise<void> {
  const dialogPromise = new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout waiting for alert dialog containing: "${substring}"`))
    }, 5000)

    page.once('dialog', async (dialog) => {
      clearTimeout(timeout)
      try {
        const actualMessage = dialog.message()
        await dialog.accept()
        resolve(actualMessage)
      } catch (error) {
        reject(error)
      }
    })
  })

  const actualMessage = await dialogPromise
  expect(actualMessage).toContain(substring)
}

/**
 * Set up dialog listener that auto-accepts and captures message
 * Returns the captured message after the dialog appears
 * Use when you need the message but don't know exact content upfront
 */
export async function captureNextAlert(page: Page): Promise<string> {
  const dialogPromise = new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout waiting for alert dialog'))
    }, 5000)

    page.once('dialog', async (dialog) => {
      clearTimeout(timeout)
      try {
        const message = dialog.message()
        await dialog.accept()
        resolve(message)
      } catch (error) {
        reject(error)
      }
    })
  })

  return dialogPromise
}
