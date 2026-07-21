import { describe, it, expect, vi, beforeEach } from 'vitest'
import { filterExistingWords } from '../filter-existing-words'
import * as ankiConnect from '../../anki-connect'

// Mock anki-connect module
vi.mock('../../anki-connect', () => ({
  sendRequest: vi.fn(),
}))

describe('filter-existing-words', () => {
  const mockSendRequest = vi.mocked(ankiConnect.sendRequest)

  beforeEach(() => {
    mockSendRequest.mockReset()
  })

  describe('happy path', () => {
    it('returns all words when all are new (Anki returns empty arrays)', async () => {
      mockSendRequest.mockResolvedValue({
        result: [[], [], []],
        error: null,
      })

      const result = await filterExistingWords(['bank', 'river', 'effective'])

      expect(result).toEqual(['bank', 'river', 'effective'])
    })

    it('returns empty array when all words exist (Anki returns non-empty arrays)', async () => {
      mockSendRequest.mockResolvedValue({
        result: [[123], [456], [789]],
        error: null,
      })

      const result = await filterExistingWords(['bank', 'river', 'effective'])

      expect(result).toEqual([])
    })

    it('returns only new words in mixed scenario', async () => {
      mockSendRequest.mockResolvedValue({
        result: [[123], [], [789]],
        error: null,
      })

      const result = await filterExistingWords(['bank', 'river', 'effective'])

      expect(result).toEqual(['river'])
    })

    it('returns empty array when input is empty without calling sendRequest', async () => {
      const result = await filterExistingWords([])

      expect(result).toEqual([])
      expect(mockSendRequest).not.toHaveBeenCalled()
    })

    it('calls sendRequest with correct multi action structure', async () => {
      mockSendRequest.mockResolvedValue({
        result: [[], []],
        error: null,
      })

      await filterExistingWords(['bank', 'river'])

      expect(mockSendRequest).toHaveBeenCalledWith({
        action: 'multi',
        version: 6,
        params: {
          actions: [
            { action: 'findNotes', params: { query: 'word:bank' } },
            { action: 'findNotes', params: { query: 'word:river' } },
          ],
        },
      })
    })

    it('uses custom fieldName parameter', async () => {
      mockSendRequest.mockResolvedValue({
        result: [[]],
        error: null,
      })

      await filterExistingWords(['bank'], 'customField')

      expect(mockSendRequest).toHaveBeenCalledWith({
        action: 'multi',
        version: 6,
        params: {
          actions: [
            { action: 'findNotes', params: { query: 'customField:bank' } },
          ],
        },
      })
    })
  })

  describe('error handling - fallback to original array', () => {
    it('returns original array when sendRequest throws error', async () => {
      mockSendRequest.mockRejectedValue(new Error('Network error'))

      const result = await filterExistingWords(['bank', 'river'])

      expect(result).toEqual(['bank', 'river'])
    })

    it('returns original array when response.error has value', async () => {
      mockSendRequest.mockResolvedValue({
        result: null,
        error: 'Anki is not running',
      })

      const result = await filterExistingWords(['bank', 'river'])

      expect(result).toEqual(['bank', 'river'])
    })

    it('returns original array when sendRequest rejects with non-Error object', async () => {
      mockSendRequest.mockRejectedValue('string error')

      const result = await filterExistingWords(['bank', 'river'])

      expect(result).toEqual(['bank', 'river'])
    })
  })
})
