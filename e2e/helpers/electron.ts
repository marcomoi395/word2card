import { _electron as electron, ElectronApplication, Page } from '@playwright/test'
import path from 'path'

export interface ElectronAppContext {
    app: ElectronApplication
    window: Page
}

export async function launchElectronApp(): Promise<ElectronAppContext> {
    const appPath = path.join(__dirname, '../../out/main/index.js')
    const isHeadless = process.env.HEADLESS !== 'false'
    const args = [appPath]

    if (isHeadless) {
        args.push('--headless', '--disable-gpu', '--no-sandbox')
    }

    const app = await electron.launch({
        args,
        env: {
            ...process.env,
            NODE_ENV: 'test'
        }
    })
    const window = await app.firstWindow()
    await window.waitForLoadState('domcontentloaded')

    return { app, window }
}

export async function resetAppState(window: Page): Promise<void> {
    await window.evaluate(() => {
        localStorage.clear()
        sessionStorage.clear()
    })

    await window.click('#tab-import-btn')
    await window.waitForSelector('#section-import', { state: 'visible' })

    const sourceFileInput = window.locator('#source-file')
    if ((await sourceFileInput.count()) > 0) await sourceFileInput.fill('')

    const deckInput = window.locator('#section-import input[name="deck"]')
    if ((await deckInput.count()) > 0) await deckInput.fill('')

    for (const selector of ['#chk-flashcard-import', '#chk-quiz-import']) {
        const checkbox = window.locator(selector)
        if ((await checkbox.count()) > 0 && (await checkbox.isChecked())) {
            await checkbox.uncheck()
        }
    }

    await window.click('#tab-settings-btn')
    await window.waitForSelector('#section-settings', { state: 'visible' })

    for (const selector of ['#openai-key-global', '#azure-key-global', '#pexels-token-global']) {
        const input = window.locator(selector)
        if ((await input.count()) > 0) await input.fill('')
    }

    await window.click('#tab-import-btn')
    await window.waitForSelector('#section-import', { state: 'visible' })
}

export async function closeElectronApp(app: ElectronApplication): Promise<void> {
    try {
        await app.evaluate(({ BrowserWindow }) => {
            const windows = BrowserWindow.getAllWindows()
            windows.forEach((window) => {
                window.removeAllListeners()
                window.webContents.removeAllListeners()
                window.close()
            })
        })

        await new Promise((resolve) => setTimeout(resolve, 300))

        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('App close timeout')), 5000)
        )
        await Promise.race([app.close(), timeoutPromise])
    } catch (error) {
        console.warn('[Test] Graceful close failed, force killing Electron process:', error)
        try {
            const process = await app.process()
            if (process && !process.killed) {
                process.kill('SIGKILL')
                await new Promise((resolve) => setTimeout(resolve, 500))
            }
        } catch (killError) {
            console.warn('[Test] Force kill also failed:', killError)
        }
    }
}
