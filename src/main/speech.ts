import * as sdk from 'microsoft-cognitiveservices-speech-sdk'
import * as fs from 'fs'
import path from 'path'
import State from './state'

const SERVICE_REGION = 'southeastasia'
const MAX_CONCURRENT_REQUESTS = 5
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

    public static getInstance(): SpeechService {
        const newKey = State.getToken('azureApiKey') // tên key do ní đặt

        if (!newKey) {
            throw new Error('Missing Azure API key in state')
        }

        if (!SpeechService.instance || SpeechService.currentKey !== newKey) {
            SpeechService.instance = new SpeechService(newKey)

            SpeechService.currentKey = newKey
        }
        return SpeechService.instance
    }

    public textToSpeech(text: string, filename: string, outputDir: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const filePath = path.join(outputDir, filename)
            const audioConfig = sdk.AudioConfig.fromAudioFileOutput(filePath)

            let synthesizer: sdk.SpeechSynthesizer | null = new sdk.SpeechSynthesizer(
                this.speechConfig,
                audioConfig
            )

            synthesizer.speakTextAsync(
                text,
                (result) => {
                    if (synthesizer) {
                        synthesizer.close()
                        synthesizer = null
                    }

                    if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                        resolve(`Done: ${filename}`)
                    } else {
                        reject(
                            new Error(
                                `Error synthesizing ${filename}. Reason: ${result.reason}. ErrorDetails: ${result.errorDetails}`
                            )
                        )
                    }
                },
                (error) => {
                    if (synthesizer) {
                        synthesizer.close()
                        synthesizer = null
                    }
                    reject(error)
                }
            )
        })
    }
    // RETRY LOGIC (Helper)
    public async synthesizeWithRetry(
        text: string,
        filename: string,
        outputDir: string,
        attempt: number = 1
    ): Promise<string | null> {
        try {
            const service = SpeechService.getInstance()
            const result = await service.textToSpeech(text, filename, outputDir)
            return result
        } catch (error: any) {
            if (attempt <= MAX_RETRIES) {
                const delay = 2000 * attempt // Exponential backoff
                console.warn(
                    `Retrying file ${filename} (Attempt ${attempt} of ${MAX_RETRIES}) after ${delay}ms...`
                )

                const errorMessage = error instanceof Error ? error.message : String(error)
                console.warn(`Reason: ${errorMessage}`)

                await new Promise((r) => setTimeout(r, delay))
                return this.synthesizeWithRetry(text, filename, outputDir, attempt + 1)
            } else {
                console.error(`Failed to synthesize ${filename} after ${MAX_RETRIES} attempts.`)
                return null
            }
        }
    }

    public static async createSpeechFiles(words: string[], outputDir: string) {
        const speechService = SpeechService.getInstance()

        const results: Promise<string | null>[] = []
        const executing: Promise<any>[] = []

        for (const item of words) {
            const filename = `${item}.mp3`
            const fullPath = path.join(outputDir, filename)

            if (fs.existsSync(fullPath)) {
                results.push(Promise.resolve(fullPath))
                continue
            }
            const p = speechService.synthesizeWithRetry(item, filename, outputDir)
            results.push(p)

            const e = p.then(() => executing.splice(executing.indexOf(e), 1))
            executing.push(e)

            if (executing.length >= MAX_CONCURRENT_REQUESTS) {
                await Promise.race(executing)
            }
        }

        const allResults = await Promise.all(results)
        return allResults.filter((p): p is string => p !== null)
    }
}
