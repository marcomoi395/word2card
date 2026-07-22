import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFlashcards } from '../handle'
import { OpenAIService } from '../open-ai'
import { NotionService } from '../notion'
import { searchImagePexels } from '../pexels'
import State from '../state'
import * as notionSync from '../helper/notion-sync'

vi.mock('../open-ai')
vi.mock('../notion')
vi.mock('../pexels')
vi.mock('../state')
vi.mock('../helper/notion-sync')

describe('createFlashcards', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('creates flashcards from OpenAI data without audio', async () => {
        vi.mocked(OpenAIService.generateFlashcardData).mockResolvedValue([
            {
                word: 'test',
                pos: 'noun',
                vietnamese: 'thử nghiệm',
                ipa: '/test/'
            }
        ])
        vi.mocked(State.getToken).mockReturnValue(undefined)

        const result = await createFlashcards(['test'], '/audio', 'TestDeck', false)

        expect(result).toHaveLength(1)
        expect(result[0].deckName).toBe('TestDeck')
        expect(result[0].modelName).toBe('AnkiVNModel_Flashcard')
        expect(result[0].fields.word).toBe('test')
        expect(result[0].fields.vietnamese).toBe('thử nghiệm')
        expect(result[0].fields.id).toBeTruthy()
        expect(result[0].fields.cloze).toBe('t__t')
        expect(result[0].audio).toEqual([])
        expect(result[0].options.allowDuplicate).toBe(false)
    })

    it('includes audio paths when audio is enabled', async () => {
        vi.mocked(OpenAIService.generateFlashcardData).mockResolvedValue([
            {
                word: 'hello',
                pos: 'noun',
                vietnamese: 'xin chào',
                ipa: '/heˈloʊ/'
            }
        ])
        vi.mocked(State.getToken).mockReturnValue(undefined)

        const result = await createFlashcards(['hello'], '/mock/audio', 'TestDeck', true)

        expect(result).toHaveLength(1)
        expect(result[0].audio).toHaveLength(1)
        expect(result[0].audio?.[0]).toEqual({
            path: '/mock/audio/hello.mp3',
            filename: 'hello.mp3',
            fields: ['audio_word']
        })
    })

    it('fetches images from Pexels when token is available', async () => {
        vi.mocked(OpenAIService.generateFlashcardData).mockResolvedValue([
            {
                word: 'cat',
                pos: 'noun',
                vietnamese: 'mèo',
                ipa: '/kæt/'
            }
        ])
        vi.mocked(State.getToken).mockReturnValue('pexels-token-123')
        vi.mocked(searchImagePexels).mockResolvedValue('https://example.com/cat.jpg')

        const result = await createFlashcards(['cat'], '/audio', 'TestDeck', false)

        expect(searchImagePexels).toHaveBeenCalledWith('pexels-token-123', 'cat')
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
        const result = await createFlashcards(['test'], '/audio', 'TestDeck', false)

        expect(result[0].fields.image).toBe('')
    })

    it('updates Notion pages when targets are provided', async () => {
        vi.mocked(OpenAIService.generateFlashcardData).mockResolvedValue([
            {
                word: 'word1',
                pos: 'noun',
                vietnamese: 'từ 1',
                ipa: '/wɜrd/'
            }
        ])
        vi.mocked(State.getToken).mockReturnValue(undefined)

        const notionTargets = [{ pageId: 'page-1', word: 'word1', deckName: 'NotionDeck' }]
        const mockQueue = new Map([['word1', [notionTargets[0]]]])
        vi.mocked(notionSync.createNotionTargetQueueMap).mockReturnValue(mockQueue)
        vi.mocked(notionSync.shiftNotionTarget)
            .mockReturnValueOnce(notionTargets[0])
            .mockReturnValueOnce(notionTargets[0])
        vi.mocked(NotionService.update).mockResolvedValue()

        const result = await createFlashcards(
            ['word1'],
            '/audio',
            'DefaultDeck',
            false,
            notionTargets
        )

        expect(NotionService.update).toHaveBeenCalledWith('page-1', {
            word: 'word1',
            pos: 'noun',
            vietnamese: 'từ 1',
            ipa: '/wɜrd/'
        })
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

        const result = await createFlashcards(['word1'], '/audio', 'DefaultDeck', false, [
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

        const result = await createFlashcards(
            ['word1', 'word2'],
            '/audio',
            'DefaultDeck',
            false,
            notionTargets
        )

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

        const result = await createFlashcards(['a'], '/audio', 'TestDeck', false)

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

        const result = await createFlashcards(['go'], '/audio', 'TestDeck', false)

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

        const result = await createFlashcards(['wonderful'], '/audio', 'TestDeck', false)

        expect(result[0].fields.cloze).toBe('w_______l')
    })

    it('handles empty words array', async () => {
        vi.mocked(OpenAIService.generateFlashcardData).mockResolvedValue([])
        vi.mocked(State.getToken).mockReturnValue(undefined)

        const result = await createFlashcards([], '/audio', 'TestDeck', false)

        expect(result).toEqual([])
        expect(OpenAIService.generateFlashcardData).toHaveBeenCalledWith([])
    })

    it('sanitizes filename for audio path', async () => {
        vi.mocked(OpenAIService.generateFlashcardData).mockResolvedValue([
            {
                word: 'test/word',
                pos: 'noun',
                vietnamese: 'từ thử',
                ipa: '/test/'
            }
        ])
        vi.mocked(State.getToken).mockReturnValue(undefined)

        const result = await createFlashcards(['test/word'], '/audio', 'TestDeck', true)

        expect(result[0].audio?.[0].path).toBe('/audio/test-word.mp3')
        expect(result[0].audio?.[0].filename).toBe('test-word.mp3')
    })
})
