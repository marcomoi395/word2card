import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AnkiService } from '../anki.service'
import { DeckService } from '../deck.service'
import type { DatabaseRepositories, VocabularyRecord } from '../../database'

vi.mock('../deck.service', () => ({ DeckService: { addNotesToAnki: vi.fn() } }))
const record = (patch: Partial<VocabularyRecord> = {}): VocabularyRecord => ({
    id: 'id-1',
    word: 'hello',
    source: 'file',
    sourceReference: null,
    partOfSpeech: 'noun',
    cloze: null,
    example: 'hello world',
    vietnamese: 'xin chào',
    ipa: null,
    meaning: null,
    imageUrl: null,
    imageProvider: null,
    audio: null,
    normalizedWord: 'hello',
    generationStatus: 'ready',
    generationError: null,
    ankiStatus: 'not_submitted',
    ankiError: null,
    createdAt: '',
    updatedAt: '',
    ...patch
})
const db = (records: VocabularyRecord[]): DatabaseRepositories =>
    ({
        vocabulary: {
            create: vi.fn(),
            get: vi.fn((id: string) => records.find((r) => r.id === id) ?? null),
            list: vi.fn(() => records),
            update: vi.fn()
        },
        settings: { get: vi.fn(), set: vi.fn() },
        migrate: vi.fn(),
        transaction: vi.fn(),
        close: vi.fn()
    }) as unknown as DatabaseRepositories

describe('AnkiService', () => {
    beforeEach(() => vi.clearAllMocks())
    it('validates required fields and persists failed status without submitting', async () => {
        const repositories = db([record({ vietnamese: null })])
        const result = await AnkiService.submitPersistedCards(repositories)
        expect(result).toEqual({ status: 'error', message: expect.stringContaining('validation') })
        expect(repositories.vocabulary.update).toHaveBeenCalledWith(
            'id-1',
            expect.objectContaining({
                ankiStatus: 'failed',
                ankiError: expect.stringContaining('vietnamese')
            })
        )
        expect(DeckService.addNotesToAnki).not.toHaveBeenCalled()
    })
    it('marks records submitted only after Anki confirms success', async () => {
        vi.mocked(DeckService.addNotesToAnki).mockResolvedValue({ status: 'success' })
        const repositories = db([record()])
        const result = await AnkiService.submitPersistedCards(repositories)
        expect(result).toEqual({
            status: 'success',
            data: { processed: 1, submitted: 1, failed: 0 }
        })
        expect(repositories.vocabulary.update).toHaveBeenCalledWith('id-1', {
            ankiStatus: 'submitted',
            ankiError: null
        })
    })
    it('does not mark cards submitted when Anki fails', async () => {
        vi.mocked(DeckService.addNotesToAnki).mockResolvedValue({
            status: 'error',
            message: 'offline'
        })
        const repositories = db([record()])
        const result = await AnkiService.submitPersistedCards(repositories)
        expect(result).toEqual({ status: 'error', message: 'offline' })
        expect(repositories.vocabulary.update).not.toHaveBeenCalled()
    })
})
