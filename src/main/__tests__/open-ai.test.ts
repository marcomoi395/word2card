import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OpenAIService, FlashcardResponse } from '../open-ai'
import { resetOpenAIService } from '../../../test/helpers/singleton-reset'

// Mock OpenAI with prototype pattern
vi.mock('openai', () => {
  const OpenAI = vi.fn()
  OpenAI.prototype.chat = {
    completions: {
      create: vi.fn(),
    },
  }
  return { default: OpenAI }
})

// Mock State
vi.mock('../state', () => ({
  default: { getToken: vi.fn() },
}))

import OpenAI from 'openai'
import State from '../state'

describe('OpenAIService', () => {
  beforeEach(() => {
    // Reset singleton to prevent test contamination
    resetOpenAIService(OpenAIService)

    // Reset mocks
    vi.clearAllMocks()
    vi.mocked(State.getToken).mockReturnValue('test-api-key')
  })

  describe('getInstance', () => {
    it('returns OpenAI instance when key is set', () => {
      const instance = OpenAIService.getInstance()
      expect(OpenAI).toHaveBeenCalledWith({ apiKey: 'test-api-key' })
      expect(instance).toBeDefined()
    })

    it('throws when openaiApiKey is not set', () => {
      vi.mocked(State.getToken).mockReturnValue(undefined)
      expect(() => OpenAIService.getInstance()).toThrow('Missing OpenAI API key in state')
    })

    it('returns same instance when key unchanged', () => {
      OpenAIService.getInstance()
      OpenAIService.getInstance()
      expect(OpenAI).toHaveBeenCalledTimes(1)
    })

    it('creates new instance when key changes', () => {
      vi.mocked(State.getToken).mockReturnValue('key-1')
      OpenAIService.getInstance()
      vi.mocked(State.getToken).mockReturnValue('key-2')
      OpenAIService.getInstance()
      expect(OpenAI).toHaveBeenCalledTimes(2)
      expect(OpenAI).toHaveBeenNthCalledWith(1, { apiKey: 'key-1' })
      expect(OpenAI).toHaveBeenNthCalledWith(2, { apiKey: 'key-2' })
    })
  })

  describe('generateFlashcardData', () => {
    const mockFlashcardData: FlashcardResponse[] = [
      {
        word: 'bank',
        pos: 'noun',
        vietnamese: 'ngân hàng',
        ipa: '/bæŋk/',
        example: 'I went to the bank.',
      },
      {
        word: 'run',
        pos: 'verb',
        vietnamese: 'chạy',
        ipa: '/rʌn/',
        example: 'She runs every morning.',
      },
    ]

    it('returns flashcard data for given words', async () => {
      vi.mocked(OpenAI.prototype.chat.completions.create).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({ data: mockFlashcardData }),
            },
          },
        ],
      } as any)

      const result = await OpenAIService.generateFlashcardData(['bank', 'run'])


      expect(result).toEqual(mockFlashcardData)
      expect(OpenAI.prototype.chat.completions.create).toHaveBeenCalled()
      
      const call = vi.mocked(OpenAI.prototype.chat.completions.create).mock.calls[0][0]
      expect(call.model).toBe('gpt-5-nano')
      expect(call.messages[0].content).toContain('English learning flashcards')
      expect(call.messages[1].content).toContain('["bank","run"]')
      expect(call.response_format).toEqual({ type: 'json_object' })
    })

    it('throws when no content returned', async () => {
      vi.mocked(OpenAI.prototype.chat.completions.create).mockResolvedValue({
        choices: [{ message: { content: null } }],
      } as any)

      await expect(OpenAIService.generateFlashcardData(['test'])).rejects.toThrow(
        'No content returned from GPT'
      )
    })

    it('throws when JSON parsing fails', async () => {
      vi.mocked(OpenAI.prototype.chat.completions.create).mockResolvedValue({
        choices: [{ message: { content: 'invalid json' } }],
      } as any)

      await expect(OpenAIService.generateFlashcardData(['test'])).rejects.toThrow()
    })

    it('handles API errors', async () => {
      const apiError = new Error('API rate limit exceeded')
      vi.mocked(OpenAI.prototype.chat.completions.create).mockRejectedValue(apiError)

      await expect(OpenAIService.generateFlashcardData(['test'])).rejects.toThrow(
        'API rate limit exceeded'
      )
    })

    it('sends correct system prompt structure', async () => {
      vi.mocked(OpenAI.prototype.chat.completions.create).mockResolvedValue({
        choices: [{ message: { content: JSON.stringify({ data: [] }) } }],
      } as any)

      await OpenAIService.generateFlashcardData(['test'])

      const call = vi.mocked(OpenAI.prototype.chat.completions.create).mock.calls[0][0]
      const systemMessage = call.messages.find((m: any) => m.role === 'system')
      
      expect(systemMessage?.content).toContain('English learning flashcards')
      expect(systemMessage?.content).toContain('word')
      expect(systemMessage?.content).toContain('pos')
      expect(systemMessage?.content).toContain('vietnamese')
      expect(systemMessage?.content).toContain('ipa')
      expect(systemMessage?.content).toContain('example')
    })
  })
})
