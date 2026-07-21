import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DeckService } from '../deck.service'
import * as ankiConnect from '../../anki-connect'

vi.mock('../../anki-connect', () => ({
  checkAnkiConnect: vi.fn(),
  sendRequest: vi.fn(),
}))

describe('DeckService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createDeckIfNotExist', () => {
    it('returns failure when AnkiConnect is not connected', async () => {
      vi.mocked(ankiConnect.checkAnkiConnect).mockResolvedValue(false)

      const result = await DeckService.createDeckIfNotExist('TestDeck')

      expect(result.status).toBe('error')
      expect(result.message).toContain('Failed to connect to AnkiConnect')
      expect(ankiConnect.sendRequest).not.toHaveBeenCalled()
    })

    it('creates deck successfully when connected', async () => {
      vi.mocked(ankiConnect.checkAnkiConnect).mockResolvedValue(true)
      vi.mocked(ankiConnect.sendRequest).mockResolvedValue({
        result: 123,
        error: null,
      })

      const result = await DeckService.createDeckIfNotExist('TestDeck')

      expect(result.status).toBe('success')
      expect(result.message).toContain('TestDeck')
      expect(ankiConnect.sendRequest).toHaveBeenCalledWith({
        action: 'createDeck',
        version: 6,
        params: { deck: 'TestDeck' },
      })
    })

    it('uses Default when deck name is empty', async () => {
      vi.mocked(ankiConnect.checkAnkiConnect).mockResolvedValue(true)
      vi.mocked(ankiConnect.sendRequest).mockResolvedValue({
        result: 123,
        error: null,
      })

      const result = await DeckService.createDeckIfNotExist('')

      expect(result.status).toBe('success')
      expect(result.message).toContain('Default')
      expect(ankiConnect.sendRequest).toHaveBeenCalledWith({
        action: 'createDeck',
        version: 6,
        params: { deck: 'Default' },
      })
    })

    it('returns failure when Anki returns error', async () => {
      vi.mocked(ankiConnect.checkAnkiConnect).mockResolvedValue(true)
      vi.mocked(ankiConnect.sendRequest).mockResolvedValue({
        result: null,
        error: 'Deck creation failed',
      })

      const result = await DeckService.createDeckIfNotExist('TestDeck')

      expect(result.status).toBe('error')
      expect(result.message).toContain('Anki error: Deck creation failed')
    })

    it('returns failure when sendRequest throws error', async () => {
      vi.mocked(ankiConnect.checkAnkiConnect).mockResolvedValue(true)
      vi.mocked(ankiConnect.sendRequest).mockRejectedValue(new Error('Network error'))

      const result = await DeckService.createDeckIfNotExist('TestDeck')

      expect(result.status).toBe('error')
      expect(result.message).toBe('Network error')
    })
  })

  describe('createDecksIfNotExist', () => {
    it('creates multiple decks successfully', async () => {
      vi.mocked(ankiConnect.checkAnkiConnect).mockResolvedValue(true)
      vi.mocked(ankiConnect.sendRequest).mockResolvedValue({
        result: 123,
        error: null,
      })

      const result = await DeckService.createDecksIfNotExist(['Deck1', 'Deck2', 'Deck3'])

      expect(result.status).toBe('success')
      expect(ankiConnect.sendRequest).toHaveBeenCalledTimes(3)
    })

    it('stops and returns error on first failure', async () => {
      vi.mocked(ankiConnect.checkAnkiConnect).mockResolvedValue(true)
      vi.mocked(ankiConnect.sendRequest)
        .mockResolvedValueOnce({ result: 123, error: null })
        .mockResolvedValueOnce({ result: null, error: 'Deck creation failed' })

      const result = await DeckService.createDecksIfNotExist(['Deck1', 'Deck2', 'Deck3'])

      expect(result.status).toBe('error')
      expect(ankiConnect.sendRequest).toHaveBeenCalledTimes(2)
    })

    it('returns success for empty array', async () => {
      const result = await DeckService.createDecksIfNotExist([])

      expect(result.status).toBe('success')
      expect(ankiConnect.sendRequest).not.toHaveBeenCalled()
    })
  })

  describe('addNotesToAnki', () => {
    it('ensures model exists before adding notes', async () => {
      vi.mocked(ankiConnect.sendRequest)
        .mockResolvedValueOnce({
          result: ['Basic', 'Cloze'],
          error: null,
        })
        .mockResolvedValueOnce({
          result: null,
          error: null,
        })

      const notes = [
        {
          deckName: 'TestDeck',
          modelName: 'Word2Card',
          fields: { Word: 'test', Definition: 'test def' },
          tags: [],
        },
      ]

      const result = await DeckService.addNotesToAnki(notes)

      expect(result.status).toBe('success')
      expect(ankiConnect.sendRequest).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'modelNames' })
      )
      expect(ankiConnect.sendRequest).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'createModel' })
      )
      expect(ankiConnect.sendRequest).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'addNotes' })
      )
    })

    it('skips model creation if model already exists', async () => {
      vi.mocked(ankiConnect.sendRequest)
        .mockResolvedValueOnce({
          result: ['Basic', 'AnkiVNModel_Flashcard', 'Cloze'],
        })
        .mockResolvedValueOnce({
          result: null,
          error: null,
        })

      const notes = [
        {
          deckName: 'TestDeck',
          modelName: 'Word2Card',
          fields: { Word: 'test', Definition: 'test def' },
          tags: [],
        },
      ]

      const result = await DeckService.addNotesToAnki(notes)

      expect(result.status).toBe('success')
      expect(ankiConnect.sendRequest).toHaveBeenCalledTimes(2)
      expect(ankiConnect.sendRequest).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'modelNames' })
      )
      expect(ankiConnect.sendRequest).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'addNotes' })
      )
    })

    it('returns failure when model check fails', async () => {
      vi.mocked(ankiConnect.sendRequest).mockResolvedValueOnce({
        result: null,
        error: 'Model check failed',
      })

      const notes = [
        {
          deckName: 'TestDeck',
          modelName: 'Word2Card',
          fields: { Word: 'test', Definition: 'test def' },
          tags: [],
        },
      ]

      const result = await DeckService.addNotesToAnki(notes)

      expect(result.status).toBe('error')
      expect(result.message).toContain('Anki error: Model check failed')
    })

    it('returns failure when model creation fails', async () => {
      vi.mocked(ankiConnect.sendRequest)
        .mockResolvedValueOnce({
          result: ['Basic'],
          error: null,
        })
        .mockResolvedValueOnce({
          result: null,
          error: 'Model creation failed',
        })

      const notes = [
        {
          deckName: 'TestDeck',
          modelName: 'Word2Card',
          fields: { Word: 'test', Definition: 'test def' },
          tags: [],
        },
      ]

      const result = await DeckService.addNotesToAnki(notes)

      expect(result.status).toBe('error')
      expect(result.message).toContain('Failed to create Anki model')
    })

    it('returns failure when addNotes fails', async () => {
      vi.mocked(ankiConnect.sendRequest)
        .mockResolvedValueOnce({
          result: ['AnkiVNModel_Flashcard'],
          error: null,
        })
        .mockResolvedValueOnce({
          result: null,
          error: 'Failed to add notes',
        })

      const notes = [
        {
          deckName: 'TestDeck',
          modelName: 'Word2Card',
          fields: { Word: 'test', Definition: 'test def' },
          tags: [],
        },
      ]

      const result = await DeckService.addNotesToAnki(notes)

      expect(result.status).toBe('error')
      expect(result.message).toContain('Anki error: Failed to add notes')
    })

    it('handles thrown errors during note addition', async () => {
      vi.mocked(ankiConnect.sendRequest)
        .mockResolvedValueOnce({
          result: ['Word2Card'],
          error: null,
        })
        .mockRejectedValueOnce(new Error('Network error'))

      const notes = [
        {
          deckName: 'TestDeck',
          modelName: 'Word2Card',
          fields: { Word: 'test', Definition: 'test def' },
          tags: [],
        },
      ]

      const result = await DeckService.addNotesToAnki(notes)


      expect(result.status).toBe('error')
      expect(result.message).toBe('Network error')
    })

    it('handles non-Error objects thrown during note addition', async () => {
      vi.mocked(ankiConnect.sendRequest)
        .mockResolvedValueOnce({
          result: ['AnkiVNModel_Flashcard'],
          error: null,
        })
        .mockRejectedValueOnce('String error')

      const notes = [
        {
          deckName: 'TestDeck',
          modelName: 'Word2Card',
          fields: { Word: 'test', Definition: 'test def' },
          tags: [],
        },
      ]

      const result = await DeckService.addNotesToAnki(notes)

      expect(result.status).toBe('error')
      expect(result.message).toBe('Unknown error adding notes')
    })
  })
})
