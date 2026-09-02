/**
 * Audio generation is intentionally disabled. The public methods remain as
 * harmless compatibility no-ops so callers can keep their audio placeholders.
 */
export class SpeechService {
    public static getInstance(): SpeechService {
        return new SpeechService()
    }

    public textToSpeech(_text: string, filename: string, _outputDir: string): Promise<string> {
        return Promise.resolve(`Audio disabled: ${filename}`)
    }

    public synthesizeWithRetry(
        _text: string,
        filename: string,
        _outputDir: string,
        _attempt: number = 1
    ): Promise<string | null> {
        return Promise.resolve(`Audio disabled: ${filename}`)
    }

    public static async createSpeechFiles(
        _words: string[],
        _outputDir: string
    ): Promise<string[]> {
        return []
    }
}
