import { test, expect } from '@playwright/test'
import { launchElectronApp, closeElectronApp, ElectronAppContext } from './helpers/electron'

test.describe('Tab Navigation', () => {
  let context: ElectronAppContext

  test.beforeEach(async () => {
    context = await launchElectronApp()
  })

  test.afterEach(async () => {
    await closeElectronApp(context.app)
  })

  test('should start with Import tab active by default', async () => {
    const { window } = context

    // Verify Import section is visible and active
    const importSection = window.locator('#section-import')
    await expect(importSection).toBeVisible()

    const hasActiveClass = await importSection.evaluate(el =>
      el.classList.contains('active-section')
    )
    expect(hasActiveClass).toBe(true)

    // Verify Import button has active styling
    const importButton = window.locator('#tab-import-btn')
    const buttonHasActiveClass = await importButton.evaluate(el =>
      el.classList.contains('active-btn')
    )
    expect(buttonHasActiveClass).toBe(true)
  })

  test('should switch to Notion tab when clicked', async () => {
    const { window } = context

    // Click Notion tab button
    await window.click('#tab-notion-btn')

    // Wait for Notion section to become visible
    await window.waitForSelector('#section-notion', { state: 'visible' })

    // Verify Notion section is active
    const notionSection = window.locator('#section-notion')
    const hasActiveClass = await notionSection.evaluate(el =>
      el.classList.contains('active-section')
    )
    expect(hasActiveClass).toBe(true)

    // Verify Import section is no longer active
    const importSection = window.locator('#section-import')
    const importHasActiveClass = await importSection.evaluate(el =>
      el.classList.contains('active-section')
    )
    expect(importHasActiveClass).toBe(false)
  })

  test('should switch to Settings tab when clicked', async () => {
    const { window } = context

    // Click Settings tab button
    await window.click('#tab-settings-btn')

    // Wait for Settings section to become visible
    await window.waitForSelector('#section-settings', { state: 'visible' })

    // Verify Settings section is active
    const settingsSection = window.locator('#section-settings')
    const hasActiveClass = await settingsSection.evaluate(el =>
      el.classList.contains('active-section')
    )
    expect(hasActiveClass).toBe(true)

    // Verify Import section is no longer active
    const importSection = window.locator('#section-import')
    const importHasActiveClass = await importSection.evaluate(el =>
      el.classList.contains('active-section')
    )
    expect(importHasActiveClass).toBe(false)
  })

  test('should switch back to Import tab from Notion', async () => {
    const { window } = context

    // Go to Notion tab first
    await window.click('#tab-notion-btn')
    await window.waitForSelector('#section-notion', { state: 'visible' })

    // Now switch back to Import
    await window.click('#tab-import-btn')
    await window.waitForSelector('#section-import', { state: 'visible' })

    // Verify Import section is active again
    const importSection = window.locator('#section-import')
    const hasActiveClass = await importSection.evaluate(el =>
      el.classList.contains('active-section')
    )
    expect(hasActiveClass).toBe(true)

    // Verify Notion section is no longer active
    const notionSection = window.locator('#section-notion')
    const notionHasActiveClass = await notionSection.evaluate(el =>
      el.classList.contains('active-section')
    )
    expect(notionHasActiveClass).toBe(false)
  })

  test('should show active button styling on current tab', async () => {
    const { window } = context

    // Import button should be active initially
    let importButton = window.locator('#tab-import-btn')
    let hasActiveClass = await importButton.evaluate(el =>
      el.classList.contains('active-btn')
    )
    expect(hasActiveClass).toBe(true)

    // Switch to Notion
    await window.click('#tab-notion-btn')
    await window.waitForSelector('#section-notion', { state: 'visible' })

    // Notion button should now have active class
    const notionButton = window.locator('#tab-notion-btn')
    const notionHasActiveClass = await notionButton.evaluate(el =>
      el.classList.contains('active-btn')
    )
    expect(notionHasActiveClass).toBe(true)

    // Import button should no longer have active class
    importButton = window.locator('#tab-import-btn')
    hasActiveClass = await importButton.evaluate(el =>
      el.classList.contains('active-btn')
    )
    expect(hasActiveClass).toBe(false)
  })

  test('should change mascot background when switching tabs', async () => {
    const { window } = context

    // Check mascot element exists
    const mascot = window.locator('#bg-mascot')
    await expect(mascot).toBeVisible()

    // Initially should have bg-import class
    let hasBgImport = await mascot.evaluate(el =>
      el.classList.contains('bg-import')
    )
    expect(hasBgImport).toBe(true)

    // Switch to Notion
    await window.click('#tab-notion-btn')
    await window.waitForSelector('#section-notion', { state: 'visible' })

    // Should now have bg-notion class
    const hasBgNotion = await mascot.evaluate(el =>
      el.classList.contains('bg-notion')
    )
    expect(hasBgNotion).toBe(true)

    // Should not have bg-import anymore
    hasBgImport = await mascot.evaluate(el =>
      el.classList.contains('bg-import')
    )
    expect(hasBgImport).toBe(false)

    // Switch to Settings
    await window.click('#tab-settings-btn')
    await window.waitForSelector('#section-settings', { state: 'visible' })

    // Should now have bg-settings class
    const hasBgSettings = await mascot.evaluate(el =>
      el.classList.contains('bg-settings')
    )
    expect(hasBgSettings).toBe(true)
  })

  test('should maintain only one active section at a time', async () => {
    const { window } = context

    // Function to count active sections
    const countActiveSections = async () => {
      return await window.evaluate(() => {
        const sections = document.querySelectorAll('.active-section')
        return sections.length
      })
    }

    // Initially should have exactly 1 active section
    let activeCount = await countActiveSections()
    expect(activeCount).toBe(1)

    // Switch to Notion
    await window.click('#tab-notion-btn')
    await window.waitForSelector('#section-notion', { state: 'visible' })

    activeCount = await countActiveSections()
    expect(activeCount).toBe(1)

    // Switch to Settings
    await window.click('#tab-settings-btn')
    await window.waitForSelector('#section-settings', { state: 'visible' })

    activeCount = await countActiveSections()
    expect(activeCount).toBe(1)
  })

  test('should navigate through all three tabs sequentially', async () => {
    const { window } = context

    // Start at Import (default)
    let importActive = await window.locator('#section-import').evaluate(el =>
      el.classList.contains('active-section')
    )
    expect(importActive).toBe(true)

    // Go to Notion
    await window.click('#tab-notion-btn')
    await window.waitForSelector('#section-notion', { state: 'visible' })

    let notionActive = await window.locator('#section-notion').evaluate(el =>
      el.classList.contains('active-section')
    )
    expect(notionActive).toBe(true)

    // Go to Settings
    await window.click('#tab-settings-btn')
    await window.waitForSelector('#section-settings', { state: 'visible' })

    let settingsActive = await window.locator('#section-settings').evaluate(el =>
      el.classList.contains('active-section')
    )
    expect(settingsActive).toBe(true)

    // Go back to Import
    await window.click('#tab-import-btn')
    await window.waitForSelector('#section-import', { state: 'visible' })

    importActive = await window.locator('#section-import').evaluate(el =>
      el.classList.contains('active-section')
    )
    expect(importActive).toBe(true)
  })
})
