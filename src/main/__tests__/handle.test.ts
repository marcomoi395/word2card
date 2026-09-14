import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFlashcards } from '../handle'
import { OpenAIService } from '../open-ai'
import { NotionService } from '../notion'
import { searchImagePexels } from '../pexels'
import { getRuntimeSetting } from '../state/runtime'
import * as notionSync from '../helper/notion-sync'

vi.mock('../open-ai')
vi.mock('../notion')
vi.mock('../pexels')
vi.mock('../state/runtime')
vi.mock('../helper/notion-sync')
const State = { getToken: getRuntimeSetting }

describe('createFlashcards', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('creates flashcards with the Anki TTS note type', async () => {
        vi.mocked(OpenAIService.generateFlashcardData).mockResolvedValue([
            {
                word: 'test',
                pos: 'noun',
                vietnamese: 'thử nghiệm',
                ipa: '/test/'
            }
        ])
        vi.mocked(getRuntimeSetting).mockReturnValue(undefined)

        const result = await createFlashcards(['test'], 'TestDeck')

        expect(result).toHaveLength(1)
        expect(result[0].deckName).toBe('TestDeck')
        expect(result[0].modelName).toBe('AnkiVNModel_Flashcard_TTS')
        expect(result[0].fields.word).toBe('test')
        expect(result[0].fields.vietnamese).toBe('thử nghiệm')
        expect(result[0].fields.id).toBeTruthy()
        expect(result[0].fields.cloze).toBe('t__t')
        expect(result[0].options.allowDuplicate).toBe(false)
    })

    it('fetches images from Pexels when token is available', async () => {
        vi.mocked(OpenAIService.generateFlashcardData).mockResolvedValue([
            {
                word: 'cat',
                pos: 'noun',
                vietnamese: 'mèo',
                ipa: '/kæt/',
                imageQuery: 'sleeping cat indoors'
            }
        ])
        vi.mocked(State.getToken).mockReturnValue('pexels-token-123')
        vi.mocked(searchImagePexels).mockResolvedValue('https://example.com/cat.jpg')

        const result = await createFlashcards(['cat'], 'TestDeck')
        expect(searchImagePexels).toHaveBeenCalledWith('pexels-token-123', [
            'sleeping cat indoors',
            'cat noun',
            'cat'
        ])
        expect(result[0].fields.image).toBe('https://example.com/cat.jpg')
    })

    it('uses empty string for image when Pexels returns null', async () => {
        vi.mocked(OpenAIService.generateFlashcardData).mockResolvedValue([
            {
                word: 'test',
                pos: 'noun',
                vietnamese: 'thử nghiệm',
                ipa: '/test/'
            }
        ])
        vi.mocked(State.getToken).mockReturnValue('pexels-token-123')
        vi.mocked(searchImagePexels).mockResolvedValue(null)
        const result = await createFlashcards(['test'], 'TestDeck')

        expect(result[0].fields.image).toBe('')
    })

    it('does not update Notion pages when targets are provided', async () => {
        vi.mocked(OpenAIService.generateFlashcardData).mockResolvedValue([
            { word: 'word1', pos: 'noun', vietnamese: 'từ 1', ipa: '/wɜrd/' }
        ])
        vi.mocked(State.getToken).mockReturnValue(undefined)

        const notionTargets = [{ pageId: 'page-1', word: 'word1', deckName: 'NotionDeck' }]
        const mockQueue = new Map([['word1', [notionTargets[0]]]])
        vi.mocked(notionSync.createNotionTargetQueueMap).mockReturnValue(mockQueue)
        vi.mocked(notionSync.shiftNotionTarget).mockReturnValueOnce(notionTargets[0])

        const result = await createFlashcards(['word1'], 'DefaultDeck', notionTargets)

        expect(NotionService.update).not.toHaveBeenCalled()
        expect(result[0].deckName).toBe('NotionDeck')
    })

    it('uses default deck name when Notion target not found', async () => {
        vi.mocked(OpenAIService.generateFlashcardData).mockResolvedValue([
            {
                word: 'word1',
                pos: 'noun',
                vietnamese: 'từ 1',
                ipa: '/wɜrd/'
            }
        ])
        vi.mocked(State.getToken).mockReturnValue(undefined)

        const mockQueue = new Map()
        vi.mocked(notionSync.createNotionTargetQueueMap).mockReturnValue(mockQueue)
        vi.mocked(notionSync.shiftNotionTarget).mockReturnValue(undefined)

        const result = await createFlashcards(['word1'], 'DefaultDeck', [
            { pageId: 'page-1', word: 'other', deckName: 'NotionDeck' }
        ])

        expect(result[0].deckName).toBe('DefaultDeck')
    })

    it('handles multiple words with mixed Notion targets', async () => {
        vi.mocked(OpenAIService.generateFlashcardData).mockResolvedValue([
            {
                word: 'word1',
                pos: 'noun',
                vietnamese: 'từ 1',
                ipa: '/wɜrd/'
            },
            {
                word: 'word2',
                pos: 'verb',
                vietnamese: 'từ 2',
                ipa: '/wɜrd/'
            }
        ])
        vi.mocked(State.getToken).mockReturnValue(undefined)

        const notionTargets = [
            { pageId: 'page-1', word: 'word1', deckName: 'Deck1' },
            { pageId: 'page-2', word: 'word2', deckName: 'Deck2' }
        ]
        const mockQueue = new Map([
            ['word1', [notionTargets[0]]],
            ['word2', [notionTargets[1]]]
        ])
        vi.mocked(notionSync.createNotionTargetQueueMap).mockReturnValue(mockQueue)
        vi.mocked(notionSync.shiftNotionTarget)
            .mockReturnValueOnce(notionTargets[0])
            .mockReturnValueOnce(notionTargets[1])
            .mockReturnValueOnce(notionTargets[0])
            .mockReturnValueOnce(notionTargets[1])

        const result = await createFlashcards(['word1', 'word2'], 'DefaultDeck', notionTargets)

        expect(result).toHaveLength(2)
        expect(result[0].deckName).toBe('Deck1')
        expect(result[1].deckName).toBe('Deck2')
    })

    it('generates correct cloze for single character word', async () => {
        vi.mocked(OpenAIService.generateFlashcardData).mockResolvedValue([
            {
                word: 'a',
                pos: 'article',
                vietnamese: 'một',
                ipa: '/eɪ/'
            }
        ])
        vi.mocked(State.getToken).mockReturnValue(undefined)

        const result = await createFlashcards(['a'], 'TestDeck')

        expect(result[0].fields.cloze).toBe('_')
    })

    it('generates correct cloze for two character word', async () => {
        vi.mocked(OpenAIService.generateFlashcardData).mockResolvedValue([
            {
                word: 'go',
                pos: 'verb',
                vietnamese: 'đi',
                ipa: '/ɡoʊ/'
            }
        ])
        vi.mocked(State.getToken).mockReturnValue(undefined)

        const result = await createFlashcards(['go'], 'TestDeck')

        expect(result[0].fields.cloze).toBe('__')
    })

    it('generates correct cloze for long word', async () => {
        vi.mocked(OpenAIService.generateFlashcardData).mockResolvedValue([
            {
                word: 'wonderful',
                pos: 'adjective',
                vietnamese: 'tuyệt vời',
                ipa: '/ˈwʌndərfəl/'
            }
        ])
        vi.mocked(State.getToken).mockReturnValue(undefined)

        const result = await createFlashcards(['wonderful'], 'TestDeck')

        expect(result[0].fields.cloze).toBe('w_______l')
    })

    it('handles empty words array', async () => {
        vi.mocked(OpenAIService.generateFlashcardData).mockResolvedValue([])
        vi.mocked(State.getToken).mockReturnValue(undefined)

        const result = await createFlashcards([], 'TestDeck')

        expect(result).toEqual([])
        expect(OpenAIService.generateFlashcardData).toHaveBeenCalledWith([])
    })
})
