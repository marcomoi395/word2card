import { createLogger } from '../../shared/logger'
import { checkAnkiConnect, sendRequest, type AnkiResponse } from '../anki-connect'
import type { QuizNote } from '../handle'
import type { AppResponse } from '../../shared/ipc'
import { success, failure } from '../utils/response'
import modelFlashcardData from '../helper/model-flashcard.json'
const logger = createLogger('main.deck')

const resolveDeckName = (deckName: string): string => {
    return deckName || 'Default'
}

export class DeckService {
    public static async createDeckIfNotExist(deckName: string): Promise<AppResponse> {
        const resolvedName = resolveDeckName(deckName)

        try {
            const isConnected = await checkAnkiConnect()
            if (!isConnected) {
                logger.error('deck_connection_failed', {
                    error: new Error('anki_connect_unavailable')
                })
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
                logger.error('deck_create_rejected', { error: new Error(response.error) })
                return failure(`Anki error: ${response.error}`)
            }

            return success(undefined, `Deck "${resolvedName}" ready`)
        } catch (error) {
            /* v8 ignore start */
            logger.error('deck_create_failed', { error })
            const message = error instanceof Error ? error.message : 'Unknown error creating deck'
            return failure(message)
            /* v8 ignore stop */
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

    private static async ensureModelExists(): Promise<AppResponse> {
        try {
            const modelNamesResponse = await sendRequest<string[]>({
                action: 'modelNames',
                version: 6
            })

            if (modelNamesResponse.error) {
                logger.error('model_lookup_failed', { error: new Error(modelNamesResponse.error) })
                return failure(`Anki error: ${modelNamesResponse.error}`)
            }

            const modelExists = modelNamesResponse.result?.includes(modelFlashcardData.modelName)
            if (modelExists) {
                return success()
            }

            const createModelResponse = await sendRequest({
                action: 'createModel',
                version: 6,
                params: {
                    modelName: modelFlashcardData.modelName,
                    inOrderFields: modelFlashcardData.inOrderFields,
                    css: modelFlashcardData.css,
                    isCloze: modelFlashcardData.isCloze,
                    cardTemplates: modelFlashcardData.cardTemplates
                }
            })

            if (createModelResponse.error) {
                logger.error('model_create_rejected', {
                    error: new Error(createModelResponse.error)
                })
                return failure(`Failed to create Anki model: ${createModelResponse.error}`)
            }

            return success(undefined, `Model "${modelFlashcardData.modelName}" created`)
        } catch (error) {
            /* v8 ignore start */
            logger.error('model_ensure_failed', { error })
            const message = error instanceof Error ? error.message : 'Unknown error creating model'
            return failure(message)
            /* v8 ignore stop */
        }
    }

    public static async addNotesToAnki(notes: QuizNote[]): Promise<AppResponse> {
        const modelResult = await DeckService.ensureModelExists()
        if (modelResult.status === 'error') {
            return modelResult
        }

        try {
            const response: AnkiResponse<unknown> = await sendRequest({
                action: 'addNotes',
                version: 6,
                params: {
                    notes
                }
            })

            if (response.error) {
                logger.error('anki_notes_add_rejected', {
                    count: notes.length,
                    error: new Error(response.error)
                })
                return failure(`Anki error: ${response.error}`)
            }

            return success()
        } catch (error) {
            /* v8 ignore start */
            logger.error('anki_notes_add_failed', { count: notes.length, error })
            const message = error instanceof Error ? error.message : 'Unknown error adding notes'
            return failure(message)
            /* v8 ignore stop */
        }
    }
}
