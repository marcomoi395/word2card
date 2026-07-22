import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SpeechService } from '../speech'
import { resetSpeechService } from '../../../test/helpers/singleton-reset'

// Mock microsoft-cognitiveservices-speech-sdk with prototype pattern
vi.mock('microsoft-cognitiveservices-speech-sdk', () => {
  const SpeechSynthesizer = vi.fn()
  SpeechSynthesizer.prototype.speakTextAsync = vi.fn()
  SpeechSynthesizer.prototype.close = vi.fn()

  return {
    SpeechConfig: {
      fromSubscription: vi.fn(() => ({
        speechSynthesisOutputFormat: undefined,
        speechSynthesisVoiceName: undefined,
      })),
    },
    AudioConfig: {
      fromAudioFileOutput: vi.fn(() => ({})),
    },
    SpeechSynthesizer,
    SpeechSynthesisOutputFormat: {
      Audio16Khz32KBitRateMonoMp3: 'Audio16Khz32KBitRateMonoMp3',
    },
    ResultReason: {
      SynthesizingAudioCompleted: 'SynthesizingAudioCompleted',
      Canceled: 'Canceled',
    },
  }
})

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn(),
}))

// Mock State
vi.mock('../state', () => ({
  default: { getToken: vi.fn() },
}))

// Mock sanitizeFilename
vi.mock('./helper/sanitize-filename', () => ({
  sanitizeFilename: vi.fn((text: string) => text.replace(/[^a-z0-9]/gi, '_')),
}))

import * as sdk from 'microsoft-cognitiveservices-speech-sdk'
import * as fs from 'fs'
import State from '../state'

describe('SpeechService', () => {
  beforeEach(() => {
    // Reset singleton to prevent test contamination
    resetSpeechService(SpeechService)

    // Reset mocks
    vi.clearAllMocks()
    vi.mocked(State.getToken).mockReturnValue('test-azure-key')
    vi.mocked(fs.existsSync).mockReturnValue(false)
  })

  describe('getInstance', () => {
    it('returns SpeechService instance when key is set', () => {
      const instance = SpeechService.getInstance()
      
      expect(sdk.SpeechConfig.fromSubscription).toHaveBeenCalledWith(
        'test-azure-key',
        'southeastasia'
      )
      expect(instance).toBeDefined()
    })

    it('throws when azureApiKey is not set', () => {
      vi.mocked(State.getToken).mockReturnValue(undefined)
      expect(() => SpeechService.getInstance()).toThrow('Missing Azure API key in state')
    })

    it('returns same instance when key unchanged', () => {
      SpeechService.getInstance()
      SpeechService.getInstance()
      expect(sdk.SpeechConfig.fromSubscription).toHaveBeenCalledTimes(1)
    })

    it('creates new instance when key changes', () => {
      vi.mocked(State.getToken).mockReturnValue('key-1')
      SpeechService.getInstance()
      vi.mocked(State.getToken).mockReturnValue('key-2')
      SpeechService.getInstance()
      expect(sdk.SpeechConfig.fromSubscription).toHaveBeenCalledTimes(2)
    })
  })

  describe('textToSpeech', () => {
    it('resolves with success message when synthesis completes', async () => {
      const service = SpeechService.getInstance()

      vi.mocked(sdk.SpeechSynthesizer.prototype.speakTextAsync).mockImplementation((_text, onSuccess) => {
        onSuccess?.({ reason: sdk.ResultReason.SynthesizingAudioCompleted } as unknown as sdk.SpeechSynthesisResult)
      })

      const result = await service.textToSpeech('test', 'test.mp3', '/output')

      expect(result).toBe('Done: test.mp3')
      expect(sdk.SpeechSynthesizer.prototype.close).toHaveBeenCalled()
    })

    it('rejects when synthesis fails', async () => {
      const service = SpeechService.getInstance()

      vi.mocked(sdk.SpeechSynthesizer.prototype.speakTextAsync).mockImplementation((_text, onSuccess) => {
        onSuccess?.({
          reason: sdk.ResultReason.Canceled,
          errorDetails: 'Network error',
        } as unknown as sdk.SpeechSynthesisResult)
      })

      await expect(service.textToSpeech('test', 'test.mp3', '/output')).rejects.toThrow(
        'Error synthesizing test.mp3'
      )
      expect(sdk.SpeechSynthesizer.prototype.close).toHaveBeenCalled()
    })

    it('rejects on SDK error callback', async () => {
      const service = SpeechService.getInstance()

      vi.mocked(sdk.SpeechSynthesizer.prototype.speakTextAsync).mockImplementation((_text, _onSuccess, onError) => {
        onError?.('SDK error')
      })

      await expect(service.textToSpeech('test', 'test.mp3', '/output')).rejects.toThrow('SDK error')
      expect(sdk.SpeechSynthesizer.prototype.close).toHaveBeenCalled()
    })
  })

  describe('synthesizeWithRetry', () => {
    it('returns result on first successful attempt', async () => {
      const service = SpeechService.getInstance()

      vi.mocked(sdk.SpeechSynthesizer.prototype.speakTextAsync).mockImplementation((_text, onSuccess) => {
        onSuccess?.({ reason: sdk.ResultReason.SynthesizingAudioCompleted } as unknown as sdk.SpeechSynthesisResult)
      })

      const result = await service.synthesizeWithRetry('test', 'test.mp3', '/output')
      expect(result).toBe('Done: test.mp3')
    })

    it('retries on failure and succeeds', async () => {
      const service = SpeechService.getInstance()

      let attempts = 0
      vi.mocked(sdk.SpeechSynthesizer.prototype.speakTextAsync).mockImplementation((_text, onSuccess, onError) => {
        attempts++
        if (attempts === 1) {
          onError?.('First attempt failed')
        } else {
          onSuccess?.({ reason: sdk.ResultReason.SynthesizingAudioCompleted } as unknown as sdk.SpeechSynthesisResult)
        }
      })

      vi.spyOn(global, 'setTimeout').mockImplementation(((cb: any) => {
        cb()
        return 0 as any
      }) as any)

      const result = await service.synthesizeWithRetry('test', 'test.mp3', '/output')

      expect(result).toBe('Done: test.mp3')
      expect(attempts).toBe(2)

      vi.restoreAllMocks()
    })

    it('returns null after MAX_RETRIES failures', async () => {
      const service = SpeechService.getInstance()

      vi.mocked(sdk.SpeechSynthesizer.prototype.speakTextAsync).mockImplementation((_text, _onSuccess, onError) => {
        onError?.('Always fails')
      })

      vi.spyOn(global, 'setTimeout').mockImplementation(((cb: any) => {

        cb()
        return 0 as any
      }) as any)

      const result = await service.synthesizeWithRetry('test', 'test.mp3', '/output')

      expect(result).toBeNull()
      vi.restoreAllMocks()
    })
  })

    it('logs string error if error is not an Error instance', async () => {
      let attempt = 0
      vi.mocked(sdk.SpeechSynthesizer.prototype.speakTextAsync).mockImplementation((_text, onSuccess, onError) => {
        attempt++
        if (attempt <= 1 && onError) {
          onError('String error message')
        } else {
          onSuccess?.({ reason: sdk.ResultReason.SynthesizingAudioCompleted } as unknown as sdk.SpeechSynthesisResult)
        }
      })
      const consoleSpy = vi.spyOn(console, 'warn')

      const service = SpeechService.getInstance()
      await service.synthesizeWithRetry('hello', 'hello.mp3', '/output')

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('String error message'))
      consoleSpy.mockRestore()
    })
  describe('createSpeechFiles', () => {
    it('creates speech files for all words', async () => {
      vi.mocked(sdk.SpeechSynthesizer.prototype.speakTextAsync).mockImplementation((_text, onSuccess) => {
        onSuccess?.({ reason: sdk.ResultReason.SynthesizingAudioCompleted } as unknown as sdk.SpeechSynthesisResult)
      })

      const result = await SpeechService.createSpeechFiles(['apple', 'banana'], '/output')
      expect(result).toHaveLength(2)
    })

    it('handles concurrent requests properly', async () => {
      vi.mocked(sdk.SpeechSynthesizer.prototype.speakTextAsync).mockImplementation((_text, onSuccess) => {
        onSuccess?.({ reason: sdk.ResultReason.SynthesizingAudioCompleted } as unknown as sdk.SpeechSynthesisResult)
      })
      const words = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7']
      const result = await SpeechService.createSpeechFiles(words, '/output')
      expect(result).toHaveLength(7)
    })

    it('skips files that already exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)

      const result = await SpeechService.createSpeechFiles(['apple'], '/output')

      expect(result).toHaveLength(1)
      expect(sdk.SpeechSynthesizer.prototype.speakTextAsync).not.toHaveBeenCalled()
    })

    it('handles mix of existing and new files', async () => {
      vi.mocked(fs.existsSync)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)

      vi.mocked(sdk.SpeechSynthesizer.prototype.speakTextAsync).mockImplementation((_text, onSuccess) => {
        onSuccess?.({ reason: sdk.ResultReason.SynthesizingAudioCompleted } as unknown as sdk.SpeechSynthesisResult)
      })

      const result = await SpeechService.createSpeechFiles(['apple', 'banana'], '/output')

      expect(result).toHaveLength(2)
      expect(sdk.SpeechSynthesizer.prototype.speakTextAsync).toHaveBeenCalledTimes(1)
    })

    it('filters out null results from failed syntheses', async () => {
      let callCount = 0
      vi.mocked(sdk.SpeechSynthesizer.prototype.speakTextAsync).mockImplementation((_text, onSuccess, onError) => {
        callCount++
        if (callCount === 1) {
          onSuccess?.({ reason: sdk.ResultReason.SynthesizingAudioCompleted } as unknown as sdk.SpeechSynthesisResult)
        } else {
          onError?.('Failed')
        }
      })

      vi.spyOn(global, 'setTimeout').mockImplementation(((cb: any) => {
        cb()
        return 0 as any
      }) as any)

      const result = await SpeechService.createSpeechFiles(['apple', 'banana'], '/output')

      expect(result).toHaveLength(1)
      vi.restoreAllMocks()
    })
  })
})
