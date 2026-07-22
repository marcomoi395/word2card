import { startAnkiMockServer } from './anki-mock-server'
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
    await startAnkiMockServer()
    // Path to the built Electron main process
    const electronPath = require('electron') as unknown as string
    const appPath = path.join(__dirname, '../../out/main/index.js')

    // Launch Electron app
    // Playwright Electron doesn't support native headless true, so we pass arguments
    // normally used by tools like xvfb or electron's headless mode
    // Always run headless unless explicitly set to false
    const isHeadless = process.env.HEADLESS !== 'false'

    // Playwright Electron args
    const args = [appPath]

    if (isHeadless) {
        // For Electron >= 9, use xvfb or playwright headless mode if supported
        // But Electron requires these args for proper headless mode
        args.push('--headless')
        args.push('--disable-gpu')
        args.push('--no-sandbox')
    }

    const app = await electron.launch({
        args,
        env: {
            ...process.env,
            NODE_ENV: 'test'
        }
    })
    // Wait for the first window to open
    const window = await app.firstWindow()

    // Wait for the app to be ready
    await window.waitForLoadState('domcontentloaded')

    return { app, window }
}

/**
 * Close the Electron application with proper cleanup
 */
export async function closeElectronApp(app: ElectronApplication): Promise<void> {
    try {
        // Close all windows first using BrowserWindow API
        await app.evaluate(({ BrowserWindow }) => {
            const windows = BrowserWindow.getAllWindows()
            windows.forEach((window) => window.close())
        })

        // Wait a bit for windows to close gracefully
        await new Promise((resolve) => setTimeout(resolve, 300))

        // Close the app with timeout protection (reduced to fit within worker timeout)
        // Worker timeout is 10s, mock server takes 1s, so we have ~8s for app close
        await Promise.race([
            app.close(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('App close timeout')), 5000)
            )
        ])
    } catch (error) {
        // If graceful close fails, force close
        console.warn('[Test] Failed to close Electron gracefully, forcing close:', error)
        try {
            // Try one more time with shorter timeout
            await Promise.race([
                app.close(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Force close timeout')), 2000)
                )
            ])
        } catch {
            // Ignore errors on final force close attempt
            console.warn('[Test] Force close also timed out, giving up')
        }
    }
}
