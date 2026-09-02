import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { SpeechService } from '../speech'

describe('SpeechService', () => {
    it('keeps compatibility methods local and does not require Azure credentials', async () => {
        const service = SpeechService.getInstance()

        await expect(service.textToSpeech('hello', 'hello.mp3', '/audio')).resolves.toBe(
            'Audio disabled: hello.mp3'
        )
        await expect(service.synthesizeWithRetry('hello', 'hello.mp3', '/audio')).resolves.toBe(
            'Audio disabled: hello.mp3'
        )
    })

    it('does not create files or make remote SDK calls', async () => {
        const result = await SpeechService.createSpeechFiles(['hello', 'world'], '/audio')

        expect(result).toEqual([])
    })

    it('contains no Azure SDK or remote speech implementation', () => {
        const source = readFileSync(resolve(__dirname, '../speech.ts'), 'utf8')

        expect(source).not.toContain('microsoft-cognitiveservices-speech-sdk')
        expect(source).not.toContain('fromSubscription')
        expect(source).not.toContain('speakTextAsync')
        expect(source).not.toContain('fetch(')
    })
})
