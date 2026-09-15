import * as fs from 'fs'
import path from 'path'
import * as sdk from 'microsoft-cognitiveservices-speech-sdk'
import { sanitizeFilename } from './helper/sanitize-filename'
import { getRuntimeSetting } from './state/runtime'

const SERVICE_REGION = 'southeastasia'
const MAX_RETRIES = 3

export class SpeechService {
    private static instance: SpeechService | null = null
    private static currentKey: string | null = null
    private speechConfig: sdk.SpeechConfig

    private constructor(apiKey: string) {
        this.speechConfig = sdk.SpeechConfig.fromSubscription(apiKey, SERVICE_REGION)
        this.speechConfig.speechSynthesisOutputFormat =
            sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3
        this.speechConfig.speechSynthesisVoiceName = 'en-US-JennyNeural'
    }

    private static getInstance(): SpeechService {
        const apiKey = getRuntimeSetting('azureApiKey')
        if (!apiKey) {
            throw new Error('Azure Speech key is not configured')
        }
        if (!SpeechService.instance || SpeechService.currentKey !== apiKey) {
            SpeechService.instance = new SpeechService(apiKey)
            SpeechService.currentKey = apiKey
        }
        return SpeechService.instance
    }

    private synthesize(text: string, filePath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const synthesizer = new sdk.SpeechSynthesizer(
                this.speechConfig,
                sdk.AudioConfig.fromAudioFileOutput(filePath)
            )
            synthesizer.speakTextAsync(
                text,
                (result) => {
                    synthesizer.close()
                    if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                        resolve()
                    } else {
                        reject(
                            new Error(
                                result.errorDetails || `Azure Speech failed: ${result.reason}`
                            )
                        )
                    }
                },
                (error) => {
                    synthesizer.close()
                    reject(error)
                }
            )
        })
    }

    public static async createSpeechFile(word: string, outputDir: string): Promise<string> {
        const filename = `${sanitizeFilename(word)}.mp3`
        const filePath = path.join(outputDir, filename)
        fs.mkdirSync(outputDir, { recursive: true })
        if (fs.existsSync(filePath)) {
            return filePath
        }

        const service = SpeechService.getInstance()
        let lastError: unknown
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                await service.synthesize(word, filePath)
                return filePath
            } catch (error) {
                lastError = error
                if (attempt < MAX_RETRIES) {
                    await new Promise((resolve) => setTimeout(resolve, attempt * 2000))
                }
            }
        }
        const message =
            lastError instanceof Error ? lastError.message : 'Azure Speech synthesis failed'
        throw new Error(`Azure Speech failed for "${word}": ${message}`)
    }
}
