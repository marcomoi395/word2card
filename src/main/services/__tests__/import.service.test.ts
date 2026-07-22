import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ImportService } from '../import.service'
import * as ankiConnect from '../../anki-connect'
import State from '../../state'
import { DeckService } from '../deck.service'
import { NotionService } from '../../notion'
import { SpeechService } from '../../speech'
import * as readFile from '../../helper/readFile'
import * as filterExistingWords from '../../helper/filter-existing-words'
import * as createFlashcards from '../../handle'

import * as fs from 'fs'
vi.mock('../../anki-connect')
vi.mock('../../state')
vi.mock('../deck.service')
vi.mock('../../notion')
vi.mock('../../speech')
vi.mock('../../helper/readFile')
vi.mock('../../helper/filter-existing-words')
vi.mock('../../handle')
vi.mock('../../store', () => ({
    default: {
        saveSecret: vi.fn()
    }
}))
vi.mock('electron', () => ({
    app: {
        getPath: vi.fn(() => '/mock/userdata')
    }
}))
vi.mock('fs', () => ({
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn()
}))

import SecretManager from '../../store'

describe('ImportService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('handleImportRequest - FILE_IMPORT', () => {
        it('successfully imports words from file', async () => {
            vi.mocked(State.getMissingTokens).mockReturnValue([])
            vi.mocked(State.getToken).mockReturnValue(undefined)
            vi.mocked(ankiConnect.checkAnkiConnect).mockResolvedValue(true)
            vi.mocked(readFile.readFileContent).mockResolvedValue(['word1', 'word2'])
            vi.mocked(filterExistingWords.filterExistingWords).mockResolvedValue(['word1', 'word2'])
            vi.mocked(DeckService.createDecksIfNotExist).mockResolvedValue({
                status: 'success',
                message: 'Decks created'
            })
            vi.mocked(createFlashcards.createFlashcards).mockResolvedValue([
                {
                    deckName: 'TestDeck',
                    modelName: 'Word2Card',
                    fields: { id: '1', word: 'word1', vietnamese: 'từ 1' },
                    options: { allowDuplicate: false }
                }
            ])
            vi.mocked(DeckService.addNotesToAnki).mockResolvedValue({
                status: 'success',
                message: 'Notes added'
            })

            const result = await ImportService.handleImportRequest({
                type: 'FILE_IMPORT',
                payload: {
                    filePath: '/path/to/file.txt',
                    deck: 'TestDeck',
                    options: { flashcard: true, quiz: false }
                }
            })

            expect(result.status).toBe('success')
            expect(readFile.readFileContent).toHaveBeenCalledWith('/path/to/file.txt')
            expect(DeckService.addNotesToAnki).toHaveBeenCalled()
        })

        it('returns failure when OpenAI key is missing', async () => {
            vi.mocked(State.getMissingTokens).mockReturnValue(['openaiApiKey'])

            const result = await ImportService.handleImportRequest({
                type: 'FILE_IMPORT',
                payload: {
                    filePath: '/path/to/file.txt',
                    deck: 'TestDeck',
                    options: { flashcard: true, quiz: false }
                }
            })

            expect(result.status).toBe('error')
            expect(result.message).toContain('OpenAI API key is missing')
        })

        it('returns failure when AnkiConnect is not running', async () => {
            vi.mocked(State.getMissingTokens).mockReturnValue([])
            vi.mocked(ankiConnect.checkAnkiConnect).mockResolvedValue(false)

            const result = await ImportService.handleImportRequest({
                type: 'FILE_IMPORT',
                payload: {
                    filePath: '/path/to/file.txt',
                    deck: 'TestDeck',
                    options: { flashcard: true, quiz: false }
                }
            })

            expect(result.status).toBe('error')
            expect(result.message).toContain('AnkiConnect is not running')
        })

        it('returns failure when file read fails', async () => {
            vi.mocked(State.getMissingTokens).mockReturnValue([])
            vi.mocked(ankiConnect.checkAnkiConnect).mockResolvedValue(true)
            vi.mocked(readFile.readFileContent).mockResolvedValue(null)

            const result = await ImportService.handleImportRequest({
                type: 'FILE_IMPORT',
                payload: {
                    filePath: '/path/to/file.txt',
                    deck: 'TestDeck',
                    options: { flashcard: true, quiz: false }
                }
            })

            expect(result.status).toBe('error')
            expect(result.message).toContain('Failed to read words')
        })
        it('uses default deck name when deck is empty', async () => {
            vi.mocked(State.getMissingTokens).mockReturnValue([])
            vi.mocked(State.getToken).mockReturnValue(undefined)
            vi.mocked(ankiConnect.checkAnkiConnect).mockResolvedValue(true)
            vi.mocked(readFile.readFileContent).mockResolvedValue(['word1'])
            vi.mocked(filterExistingWords.filterExistingWords).mockResolvedValue(['word1'])
            vi.mocked(DeckService.createDecksIfNotExist).mockResolvedValue({ status: 'success' })
            vi.mocked(createFlashcards.createFlashcards).mockResolvedValue([
                {
                    deckName: 'Default',
                    modelName: 'Word2Card',
                    fields: { id: '1', word: 'word1', vietnamese: 'từ 1' },
                    options: { allowDuplicate: false }
                }
            ])
            vi.mocked(DeckService.addNotesToAnki).mockResolvedValue({ status: 'success' })

            await ImportService.handleImportRequest({
                type: 'FILE_IMPORT',
                payload: {
                    filePath: '/file.txt',
                    deck: '   ',
                    options: { flashcard: true, quiz: false }
                }
            })

            expect(DeckService.createDecksIfNotExist).toHaveBeenCalledWith(
                expect.arrayContaining([expect.stringContaining('Vocabulary::Imported::')])
            )
        })

        it('returns failure when no notes are created', async () => {
            vi.mocked(State.getMissingTokens).mockReturnValue([])
            vi.mocked(State.getToken).mockReturnValue(undefined)
            vi.mocked(ankiConnect.checkAnkiConnect).mockResolvedValue(true)
            vi.mocked(readFile.readFileContent).mockResolvedValue(['word1'])
            vi.mocked(filterExistingWords.filterExistingWords).mockResolvedValue(['word1'])
            vi.mocked(DeckService.createDecksIfNotExist).mockResolvedValue({
                status: 'success',
                message: 'Decks created'
            })
            vi.mocked(createFlashcards.createFlashcards).mockResolvedValue([])

            const result = await ImportService.handleImportRequest({
                type: 'FILE_IMPORT',
                payload: {
                    filePath: '/path/to/file.txt',
                    deck: 'TestDeck',
                    options: { flashcard: true, quiz: false }
                }
            })

            expect(result.status).toBe('error')
            expect(result.message).toContain('No cards to add')
        })

        it('creates speech files when Azure key is present', async () => {
            vi.mocked(State.getMissingTokens).mockReturnValue([])
            vi.mocked(State.getToken).mockReturnValue('azure-key-123')
            vi.mocked(ankiConnect.checkAnkiConnect).mockResolvedValue(true)
            vi.mocked(readFile.readFileContent).mockResolvedValue(['word1', 'word2'])
            vi.mocked(filterExistingWords.filterExistingWords).mockResolvedValue(['word1', 'word2'])

            vi.mocked(SpeechService.createSpeechFiles).mockResolvedValue(['file1.mp3', 'file2.mp3'])
            vi.mocked(DeckService.createDecksIfNotExist).mockResolvedValue({
                status: 'success',
                message: 'Decks created'
            })
            vi.mocked(createFlashcards.createFlashcards).mockResolvedValue([
                {
                    deckName: 'TestDeck',
                    modelName: 'Word2Card',
                    fields: { id: '1', word: 'word1', vietnamese: 'từ 1' },
                    options: { allowDuplicate: false }
                }
            ])
            vi.mocked(DeckService.addNotesToAnki).mockResolvedValue({
                status: 'success',
                message: 'Notes added'
            })

            const result = await ImportService.handleImportRequest({
                type: 'FILE_IMPORT',
                payload: {
                    filePath: '/path/to/file.txt',
                    deck: 'TestDeck',
                    options: { flashcard: true, quiz: false }
                }
            })

            expect(result.status).toBe('success')
            expect(SpeechService.createSpeechFiles).toHaveBeenCalledWith(
                ['word1', 'word2'],
                '/mock/userdata/audio'
            )
        })

        it('returns failure when audio files fail to create', async () => {
            vi.mocked(State.getMissingTokens).mockReturnValue([])
            vi.mocked(State.getToken).mockReturnValue('azure-key-123')
            vi.mocked(ankiConnect.checkAnkiConnect).mockResolvedValue(true)
            vi.mocked(readFile.readFileContent).mockResolvedValue(['word1', 'word2'])
            vi.mocked(filterExistingWords.filterExistingWords).mockResolvedValue(['word1', 'word2'])
            vi.mocked(SpeechService.createSpeechFiles).mockResolvedValue(['file1.mp3'])

            const result = await ImportService.handleImportRequest({
                type: 'FILE_IMPORT',
                payload: {
                    filePath: '/path/to/file.txt',
                    deck: 'TestDeck',
                    options: { flashcard: true, quiz: false }
                }
            })

            expect(result.status).toBe('error')
            expect(result.message).toContain("Some audio files couldn't be created")
        })
    })

    it('creates audio directory if it does not exist', async () => {
        vi.mocked(State.getMissingTokens).mockReturnValue([])
        vi.mocked(ankiConnect.checkAnkiConnect).mockResolvedValue(true)
        vi.mocked(readFile.readFileContent).mockResolvedValue(['word'])
        vi.mocked(filterExistingWords.filterExistingWords).mockResolvedValue(['word'])
        vi.mocked(DeckService.createDecksIfNotExist).mockResolvedValue({ status: 'success' })
        vi.mocked(DeckService.addNotesToAnki).mockResolvedValue({ status: 'success' })
        vi.mocked(createFlashcards.createFlashcards).mockResolvedValue([
            {
                deckName: 'D',
                modelName: 'M',
                fields: { id: '1', word: 'w', vietnamese: 'v' },
                options: { allowDuplicate: false }
            }
        ])

        vi.mocked(fs.existsSync).mockReturnValueOnce(false)

        await ImportService.handleImportRequest({
            type: 'FILE_IMPORT',
            payload: { filePath: '/file.txt', deck: 'D', options: { flashcard: true, quiz: false } }
        })

        expect(fs.mkdirSync).toHaveBeenCalledWith('/mock/userdata/audio', { recursive: true })
    })

    it('returns failure if initialization fails', async () => {
        vi.mocked(State.getMissingTokens).mockReturnValue([])
        vi.mocked(ankiConnect.checkAnkiConnect).mockResolvedValue(true)

        vi.mocked(fs.existsSync).mockImplementationOnce(() => {
            throw new Error('FS Error')
        })
        const result = await ImportService.handleImportRequest({
            type: 'FILE_IMPORT',
            payload: { filePath: '/file.txt', deck: 'D', options: { flashcard: true, quiz: false } }
        })

        expect(result.status).toBe('error')
        expect(result.message).toBe('FS Error')
    })

    it('returns failure if loadWords returns no data', async () => {
        vi.mocked(State.getMissingTokens).mockReturnValue([])
        vi.mocked(ankiConnect.checkAnkiConnect).mockResolvedValue(true)

        const loadSpy = vi
            .spyOn(ImportService as any, 'loadWords')
            .mockResolvedValueOnce({ status: 'success' })

        const result = await ImportService.handleImportRequest({
            type: 'FILE_IMPORT',
            payload: { filePath: '/file.txt', deck: 'D', options: { flashcard: true, quiz: false } }
        })

        expect(result.status).toBe('error')
        expect(result.message).toContain('Failed to load words')

        loadSpy.mockRestore()
    })

    it('returns failure if createNotes returns no data', async () => {
        vi.mocked(State.getMissingTokens).mockReturnValue([])
        vi.mocked(ankiConnect.checkAnkiConnect).mockResolvedValue(true)

        const loadSpy = vi.spyOn(ImportService as any, 'loadWords').mockResolvedValueOnce({
            status: 'success',
            data: { words: ['w'], notionTargets: [] }
        })
        const createSpy = vi
            .spyOn(ImportService as any, 'createNotes')
            .mockResolvedValueOnce({ status: 'success' })

        const result = await ImportService.handleImportRequest({
            type: 'FILE_IMPORT',
            payload: { filePath: '/file.txt', deck: 'D', options: { flashcard: true, quiz: false } }
        })

        expect(result.status).toBe('error')
        expect(result.message).toContain('Failed to create notes')

        loadSpy.mockRestore()
        createSpy.mockRestore()
    })

    describe('handleImportRequest - NOTION_SYNC', () => {
        it('successfully syncs words from Notion', async () => {
            vi.mocked(State.getMissingTokens).mockReturnValue([])
            vi.mocked(State.getToken).mockReturnValue(undefined)
            vi.mocked(ankiConnect.checkAnkiConnect).mockResolvedValue(true)
            vi.mocked(SecretManager.saveSecret).mockReturnValue(true)
            vi.mocked(State.setToken).mockReturnValue()
            vi.mocked(NotionService.getPages).mockResolvedValue([
                {
                    dataSourceId: 'source1',
                    dataSourceName: 'Source1',
                    pages: [
                        {
                            id: 'page1',
                            properties: {
                                Word: {
                                    id: 'prop1',
                                    type: 'title',
                                    title: [
                                        {
                                            plain_text: 'word1',
                                            href: null,
                                            annotations: {} as unknown as never
                                        }
                                    ] as unknown as never
                                }
                            }
                        } as unknown as never
                    ]
                }
            ])
            vi.mocked(filterExistingWords.filterExistingWords).mockResolvedValue(['word1'])
            vi.mocked(DeckService.createDecksIfNotExist).mockResolvedValue({
                status: 'success',
                message: 'Decks created'
            })
            vi.mocked(createFlashcards.createFlashcards).mockResolvedValue([
                {
                    deckName: 'TestDeck',
                    modelName: 'Word2Card',
                    fields: { id: '1', word: 'word1', vietnamese: 'từ 1' },
                    options: { allowDuplicate: false }
                }
            ])
            vi.mocked(DeckService.addNotesToAnki).mockResolvedValue({
                status: 'success',
                message: 'Notes added'
            })

            const result = await ImportService.handleImportRequest({
                type: 'NOTION_SYNC',
                payload: {
                    token: 'notion-token',
                    notionDatabaseId: 'db-id',
                    deck: 'TestDeck',
                    options: { flashcard: true, quiz: false }
                }
            })

            expect(result.status).toBe('success')
            expect(NotionService.getPages).toHaveBeenCalledWith('db-id')
            expect(SecretManager.saveSecret).toHaveBeenCalledWith('notionToken', 'notion-token')
        })

        it('returns default error message when Notion throws non-Error', async () => {
            vi.mocked(State.getMissingTokens).mockReturnValue([])
            vi.mocked(State.getToken).mockReturnValue(undefined)
            vi.mocked(ankiConnect.checkAnkiConnect).mockResolvedValue(true)
            vi.mocked(SecretManager.saveSecret).mockReturnValue(true)
            vi.mocked(NotionService.getPages).mockRejectedValue('String error')

            const result = await ImportService.handleImportRequest({
                type: 'NOTION_SYNC',
                payload: {
                    token: 'notion-token',
                    notionDatabaseId: 'db-id',
                    deck: 'TestDeck',
                    options: { flashcard: true, quiz: false }
                }
            })

            expect(result.status).toBe('error')
            expect(result.message).toContain('Error retrieving data from Notion')
        })

        it('returns failure when Notion settings save fails', async () => {
            vi.mocked(State.getMissingTokens).mockReturnValue([])
            vi.mocked(ankiConnect.checkAnkiConnect).mockResolvedValue(true)
            vi.mocked(SecretManager.saveSecret).mockReturnValue(false)

            const result = await ImportService.handleImportRequest({
                type: 'NOTION_SYNC',
                payload: {
                    token: '',
                    notionDatabaseId: 'db-id',
                    deck: 'TestDeck',
                    options: { flashcard: true, quiz: false }
                }
            })

            expect(result.status).toBe('error')
            expect(result.message).toContain('Failed to save Notion settings')
        })

        it('returns failure when no Notion pages found', async () => {
            vi.mocked(State.getMissingTokens).mockReturnValue([])
            vi.mocked(ankiConnect.checkAnkiConnect).mockResolvedValue(true)
            vi.mocked(SecretManager.saveSecret).mockReturnValue(true)
            vi.mocked(State.setToken).mockReturnValue()
            vi.mocked(NotionService.getPages).mockResolvedValue([])

            const result = await ImportService.handleImportRequest({
                type: 'NOTION_SYNC',
                payload: {
                    token: 'notion-token',
                    notionDatabaseId: 'db-id',
                    deck: 'TestDeck',
                    options: { flashcard: true, quiz: false }
                }
            })

            expect(result.status).toBe('error')
            expect(result.message).toContain('No pages found')
        })
    })
})
