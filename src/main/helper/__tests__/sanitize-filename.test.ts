import { describe, it, expect } from 'vitest'
import { sanitizeFilename } from '../sanitize-filename'

describe('sanitize-filename', () => {
    describe('happy path', () => {
        it('converts "take into account" to "take-into-account"', () => {
            expect(sanitizeFilename('take into account')).toBe('take-into-account')
        })

        it('removes apostrophes: "it\'s raining" to "its-raining"', () => {
            expect(sanitizeFilename("it's raining")).toBe('its-raining')
        })

        it('removes double quotes: \'say "hello"\' to "say-hello"', () => {
            expect(sanitizeFilename('say "hello"')).toBe('say-hello')
        })

        it('preserves valid hyphens: "cost-effective" stays "cost-effective"', () => {
            expect(sanitizeFilename('cost-effective')).toBe('cost-effective')
        })

        it('collapses multiple spaces: "hello   world" to "hello-world"', () => {
            expect(sanitizeFilename('hello   world')).toBe('hello-world')
        })

        it('converts uppercase to lowercase: "Hello World" to "hello-world"', () => {
            expect(sanitizeFilename('Hello World')).toBe('hello-world')
        })
    })

    describe('security and edge cases', () => {
        it('removes path traversal characters: "../../etc/passwd"', () => {
            const result = sanitizeFilename('../../etc/passwd')
            expect(result).not.toContain('..')
            expect(result).not.toContain('/')
            expect(result).toBe('etc-passwd')
        })

        it('handles unicode and emoji: "lưu ý 🌟" does not throw', () => {
            const result = sanitizeFilename('lưu ý 🌟')
            expect(result).toBeTruthy()
            expect(typeof result).toBe('string')
            // Unicode letters should be preserved by \w, emoji replaced
            expect(result).toContain('l')
        })

        it('returns empty string for all special characters: "!@#$%"', () => {
            expect(sanitizeFilename('!@#$%')).toBe('')
        })

        it('returns empty string for empty input', () => {
            expect(sanitizeFilename('')).toBe('')
        })

        it('returns empty string for whitespace-only input: "   "', () => {
            expect(sanitizeFilename('   ')).toBe('')
        })

        it('handles strings longer than 255 characters without throwing', () => {
            const longString = 'a'.repeat(300)
            expect(() => sanitizeFilename(longString)).not.toThrow()
            const result = sanitizeFilename(longString)
            expect(typeof result).toBe('string')
        })

        it('removes leading hyphens after processing', () => {
            expect(sanitizeFilename('---hello')).toBe('hello')
        })

        it('removes trailing hyphens after processing', () => {
            expect(sanitizeFilename('hello---')).toBe('hello')
        })

        it('collapses multiple consecutive hyphens', () => {
            expect(sanitizeFilename('hello---world')).toBe('hello-world')
        })
    })
})
