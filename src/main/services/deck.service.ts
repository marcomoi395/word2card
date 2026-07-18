import { checkAnkiConnect, sendRequest, type AnkiResponse } from '../anki-connect'
import type { QuizNote } from '../handle'
import type { AppResponse } from '../../shared/ipc'
import { success, failure } from '../utils/response'

const resolveDeckName = (deckName: string): string => {
    return deckName || 'Default'
}

export class DeckService {
    public static async createDeckIfNotExist(deckName: string): Promise<AppResponse> {
        const resolvedName = resolveDeckName(deckName)

        try {
            const isConnected = await checkAnkiConnect()
            if (!isConnected) {
                return failure('Failed to connect to AnkiConnect. Please ensure Anki is running.')
            }

            const response: AnkiResponse<number> = await sendRequest({
                action: 'createDeck',
                version: 6,
                params: {
                    deck: resolvedName
                }
            })

            if (response.error) {
                return failure(`Anki error: ${response.error}`)
            }

            return success(undefined, `Deck "${resolvedName}" ready`)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error creating deck'
            return failure(message)
        }
    }

    public static async createDecksIfNotExist(deckNames: string[]): Promise<AppResponse> {
        for (const deckName of deckNames) {
            const result = await DeckService.createDeckIfNotExist(deckName)
            if (result.status === 'error') {
                return result
            }
        }
        return success()
    }

    public static async addNotesToAnki(notes: QuizNote[]): Promise<AppResponse> {
        try {
            const response: AnkiResponse<unknown> = await sendRequest({
                action: 'addNotes',
                version: 6,
                params: {
                    notes
                }
            })

            if (response.error) {
                return failure(`Anki error: ${response.error}`)
            }

            return success()
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error adding notes'
            return failure(message)
        }
    }
}
