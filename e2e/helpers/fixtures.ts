import { join } from 'path'

export function getTestWordsPath(): string {
    return join(__dirname, '../fixtures/test-words.txt')
}

export const testApiKeys = {
    openai: 'sk-test-openai-key-12345',
    pexels: 'test-pexels-api-token-abcdef'
}

export const testDeckNames = {
    fileImport: 'Vocabulary::E2E::FileImport'
}
