import { test, expect } from './helpers/test-base'

test.describe('Form Validation UI', () => {
    test('should handle very long deck names', async ({ sharedApp }) => {
        const deckInput = sharedApp.window.locator('#form-import input[name="deck"]')
        const longDeckName = 'Vocabulary::' + 'A'.repeat(200)
        await deckInput.fill(longDeckName)
        expect(await deckInput.inputValue()).toBe(longDeckName)
    })

    test('should handle deck names with special characters', async ({ sharedApp }) => {
        const deckInput = sharedApp.window.locator('#form-import input[name="deck"]')
        const specialDeckName = 'Vocabulary::Test::Special-Chars_123::éüñ'
        await deckInput.fill(specialDeckName)
        expect(await deckInput.inputValue()).toBe(specialDeckName)
    })
})
