import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for Electron e2e testing
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
    testDir: './e2e',

    // Maximum time one test can run
    timeout: 30 * 1000,

    // Test execution settings
    fullyParallel: false, // Run tests sequentially for Electron
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1, // Single worker for Electron tests (must be 1 for shared mock server)
    // Reporter configuration
    reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],

    // Shared settings for all projects
    use: {
        // Collect trace on first retry
        trace: 'on-first-retry',

        // Screenshot on failure
        screenshot: 'only-on-failure',

        // Video on failure
        video: 'retain-on-failure'
    },

    // Project configuration
    projects: [
        {
            name: 'electron',
            use: { ...devices['Desktop Chrome'] }
        }
    ]
})
