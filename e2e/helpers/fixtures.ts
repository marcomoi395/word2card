/**
 * Test Fixtures and Test Data
 *
 * Provides helper functions to access test fixtures and generate test data
 */

import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Get path to test words file
 */
export function getTestWordsPath(): string {
    return join(__dirname, '../fixtures/test-words.txt')
}

/**
 * Test API keys for settings
 */
export const testApiKeys = {
    openai: 'sk-test-openai-key-12345',
    azure: 'test-azure-speech-key-67890',
    pexels: 'test-pexels-api-token-abcdef',
    notionToken: 'secret_test_notion_token_xyz',
    notionDatabaseId: 'abc123def456789012345678'
}

/**
 * Test deck names
 */
export const testDeckNames = {
    fileImport: 'Vocabulary::E2E::FileImport',
    notionSync: 'Vocabulary::E2E::NotionSync'
}
