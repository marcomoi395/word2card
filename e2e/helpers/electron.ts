import { _electron as electron, ElectronApplication, Page } from '@playwright/test'
import path from 'path'

export interface ElectronAppContext {
  app: ElectronApplication
  window: Page
}

/**
 * Launch the Electron application for testing
 */
export async function launchElectronApp(): Promise<ElectronAppContext> {
  // Path to the built Electron main process
  const electronPath = require('electron') as unknown as string
  const appPath = path.join(__dirname, '../../out/main/index.js')

  // Launch Electron app
  const app = await electron.launch({
    args: [appPath],
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
  })

  // Wait for the first window to open
  const window = await app.firstWindow()

  // Wait for the app to be ready
  await window.waitForLoadState('domcontentloaded')

  return { app, window }
}

/**
 * Close the Electron application
 */
export async function closeElectronApp(app: ElectronApplication): Promise<void> {
  await app.close()
}

/**
 * Get app version from package.json
 */
export function getAppVersion(): string {
  const packageJson = require('../../package.json')
  return packageJson.version
}
