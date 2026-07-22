import { setAnkiMockScenario, resetAnkiMockScenario } from './anki-mock-server'
/**
 * Mock Data and Service Responses for E2E Tests
 *
 * This file provides mock data and helper functions for mocking external services:
 * - OpenAI API (flashcard generation)
 * - Azure Speech API (audio generation)
 * - Pexels API (image search)
 * - AnkiConnect (Anki desktop integration)
 * - Notion API (database operations)
 */

import type { Page } from '@playwright/test'

// ============================================================================
// Mock Response Data
// ============================================================================

/**
 * Mock OpenAI flashcard response for a single word
 */
export const mockFlashcardResponse = {
    word: 'apple',
    pos: 'noun',
    ipa: '/ˈæpəl/',
    vietnamese: 'quả táo',
    example: 'I eat an apple every day for breakfast.',
    image_url: 'https://images.pexels.com/photos/102104/pexels-photo-102104.jpeg',
    audio_word: '/path/to/audio/apple.mp3'
}

/**
 * Generate mock flashcard data for a given word
 */
export function generateMockFlashcard(word: string) {
    return {
        word: word,
        pos: 'noun',
        ipa: `/ˈ${word}/`,
        vietnamese: `từ tiếng Việt cho ${word}`,
        example: `This is an example sentence using the word ${word}.`,
        image_url: `https://images.pexels.com/photos/mock-${word}.jpeg`,
        audio_word: `/path/to/audio/${word}.mp3`
    }
}

/**
 * Mock Pexels image search response
 */
export const mockPexelsResponse = {
    photos: [
        {
            id: 102104,
            url: 'https://images.pexels.com/photos/102104/pexels-photo-102104.jpeg',
            src: {
                original: 'https://images.pexels.com/photos/102104/pexels-photo-102104.jpeg',
                large: 'https://images.pexels.com/photos/102104/pexels-photo-102104.jpeg'
            }
        }
    ]
}

/**
 * Mock Azure Speech audio buffer
 */
export const mockAudioBuffer = Buffer.from('mock-audio-data')

/**
 * Mock AnkiConnect version check response
 */
export const mockAnkiConnectVersion = {
    result: 6,
    error: null
}

/**
 * Mock AnkiConnect findNotes response (empty - no existing words)
 */
export const mockAnkiFindNotesEmpty = {
    result: [],
    error: null
}

/**
 * Mock AnkiConnect addNotes success response
 */
export function mockAnkiAddNotesSuccess(count: number) {
    return {
        result: Array(count).fill(1234567890), // Note IDs
        error: null
    }
}

/**
 * Mock Notion database query response
 */
export const mockNotionDatabaseQuery = {
    results: [
        {
            id: 'page-id-1',
            properties: {
                Word: {
                    title: [{ plain_text: 'apple' }]
                },
                Status: {
                    status: { name: 'Not Started' }
                }
            }
        },
        {
            id: 'page-id-2',
            properties: {
                Word: {
                    title: [{ plain_text: 'banana' }]
                },
                Status: {
                    status: { name: 'Not Started' }
                }
            }
        }
    ],
    has_more: false
}

/**
 * Mock Notion page update response
 */
export const mockNotionPageUpdate = {
    id: 'page-id-1',
    properties: {
        Status: {
            status: { name: 'Done' }
        }
    }
}

// ============================================================================
// Mock Service Functions
// ============================================================================
/**
 * Set AnkiConnect mock server scenario
 * Note: This only controls the HTTP mock server (port 8765), not renderer requests.
 * AnkiConnect calls happen in the main process, so page.route() interception doesn't work.
 */
export async function mockAnkiConnect(_page: Page, scenario: 'success' | 'failure' = 'success') {
    await setAnkiMockScenario(scenario)
}

/**
 * Reset AnkiConnect mock server to success scenario
 */
export async function resetAnkiMock() {
    await resetAnkiMockScenario()
}

/**
 * Mock OpenAI API via HTTP Interception
 * Intercepts calls to api.openai.com
 */
export async function mockOpenAI(
    page: Page,
    words: string[],
    scenario: 'success' | 'failure' = 'success'
) {
    await page.route('**/api.openai.com/v1/chat/completions', async (route) => {
        if (scenario === 'failure') {
            return route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ error: { message: 'Mock OpenAI Server Error' } })
            })
        }

        // Parse request to see if we're analyzing a specific word
        try {
            const postData = JSON.parse(route.request().postData() || '{}')
            const prompt = postData.messages?.[0]?.content || ''

            // Find which word we're querying
            let targetWord = words[0] || 'mock'
            for (const w of words) {
                if (prompt.includes(w)) {
                    targetWord = w
                    break
                }
            }

            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    choices: [
                        {
                            message: {
                                content: JSON.stringify(generateMockFlashcard(targetWord))
                            }
                        }
                    ]
                })
            })
        } catch (e) {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    choices: [{ message: { content: JSON.stringify(mockFlashcardResponse) } }]
                })
            })
        }
    })
}

/**
 * Mock Azure Speech API via HTTP Interception
 */
export async function mockAzureSpeech(page: Page, scenario: 'success' | 'failure' = 'success') {
    await page.route('**/cognitiveservices.azure.com/tts/cognitiveservices/v1', async (route) => {
        if (scenario === 'failure') {
            return route.fulfill({ status: 500 })
        }

        return route.fulfill({
            status: 200,
            contentType: 'audio/mpeg',
            body: mockAudioBuffer
        })
    })
}

/**
 * Mock Pexels API via HTTP Interception
 */
export async function mockPexels(page: Page, scenario: 'success' | 'failure' = 'success') {
    await page.route('**/api.pexels.com/v1/search*', async (route) => {
        if (scenario === 'failure') {
            return route.fulfill({ status: 403 })
        }

        return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockPexelsResponse)
        })
    })
}

/**
 * Mock Notion API via HTTP Interception
 */
export async function mockNotion(
    page: Page,
    words: string[],
    scenario: 'success' | 'failure' = 'success'
) {
    // Mock database query
    await page.route('**/api.notion.com/v1/databases/*/query', async (route) => {
        if (scenario === 'failure') {
            return route.fulfill({ status: 401, body: '{"message": "Unauthorized"}' })
        }

        // Generate dynamic results based on provided words
        const dynamicResponse = {
            ...mockNotionDatabaseQuery,
            results: words.map((word, index) => ({
                id: `page-id-${index}`,
                properties: {
                    Word: { title: [{ plain_text: word }] },
                    Status: { status: { name: 'Not Started' } }
                }
            }))
        }

        return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(dynamicResponse)
        })
    })

    // Mock page update (status changes)
    await page.route('**/api.notion.com/v1/pages/*', async (route) => {
        return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockNotionPageUpdate)
        })
    })
}

/**
 * Restore original API functions (cleanup after tests)
 */
export async function restoreOriginalAPIs(page: Page) {
    await page.unroute('http://127.0.0.1:8765')
    await page.unroute('**/api.openai.com/v1/chat/completions')
    await page.unroute('**/cognitiveservices.azure.com/tts/cognitiveservices/v1')
    await page.unroute('**/api.pexels.com/v1/search*')
    await page.unroute('**/api.notion.com/v1/databases/*/query')
    await page.unroute('**/api.notion.com/v1/pages/*')
}

/**
 * Setup API keys in settings before running tests
 * This is required for import operations to work
 */
export async function setupApiKeys(
    page: Page,
    keys = {
        openai: 'sk-test-openai-key-12345',
        azure: 'test-azure-speech-key-67890',
        pexels: 'test-pexels-api-token-abcdef'
    }
) {
    // Navigate to Settings tab
    await page.click('#tab-settings-btn')
    await page.waitForSelector('#section-settings', { state: 'visible' })

    // Fill in API keys
    await page.fill('#openai-key-global', keys.openai)
    await page.fill('#azure-key-global', keys.azure)
    await page.fill('#pexels-token-global', keys.pexels)
    await page.click('#btn-save-settings')

    // Wait for save to complete
    await page.waitForTimeout(500)

    // Navigate back to Import tab
    await page.click('#tab-import-btn')
    await page.waitForSelector('#section-import', { state: 'visible' })
}
