import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for Electron e2e testing
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
    testDir: './e2e',

    // Maximum time one test can run
    // CI needs more time for Electron app launch in headless mode
    timeout: process.env.CI ? 60 * 1000 : 30 * 1000,

    // Global timeout for entire test run
    globalTimeout: 10 * 60 * 1000, // 10 minutes

    // Increase worker teardown timeout to allow proper cleanup
    expect: {
        timeout: 5000
    },

    // Test execution settings
    fullyParallel: false, // Run tests sequentially for Electron
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1, // Single worker for Electron tests (must be 1 for shared mock server)

    // Increase worker teardown timeout to prevent cleanup timeouts
    // This allows enough time for Electron app and mock server to close gracefully
    maxFailures: process.env.CI ? 5 : undefined,
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
