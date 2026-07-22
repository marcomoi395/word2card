import { describe, it, expect, beforeEach } from 'vitest'
import { State } from '../state'
import { resetState } from '../../../test/helpers/singleton-reset'

describe('State', () => {
  beforeEach(() => {
    // Reset singleton instance to prevent test contamination
    resetState(State)
  })

  describe('singleton pattern', () => {
    it('returns the same instance on multiple calls', () => {
      const instance1 = State.getInstance()
      const instance2 = State.getInstance()

      expect(instance1).toBe(instance2)
    })

    it('starts with fresh state after reset', () => {
      const instance1 = State.getInstance()
      instance1.setToken('openaiApiKey', 'test-key')

      // Reset singleton
      ;(State as any).instance = undefined

      const instance2 = State.getInstance()
      expect(instance2.getToken('openaiApiKey')).toBeUndefined()
    })
  })

  describe('setToken and getToken', () => {
    it('stores and retrieves token correctly', () => {
      const state = State.getInstance()

      state.setToken('openaiApiKey', 'sk-123')
      expect(state.getToken('openaiApiKey')).toBe('sk-123')
    })

    it('allows setting multiple different tokens', () => {
      const state = State.getInstance()

      state.setToken('openaiApiKey', 'sk-123')
      state.setToken('azureApiKey', 'azure-456')
      state.setToken('pexelsToken', 'pexels-789')

      expect(state.getToken('openaiApiKey')).toBe('sk-123')
      expect(state.getToken('azureApiKey')).toBe('azure-456')
      expect(state.getToken('pexelsToken')).toBe('pexels-789')
    })

    it('returns undefined for token that was never set', () => {
      const state = State.getInstance()

      expect(state.getToken('notionToken')).toBeUndefined()
    })

    it('overwrites existing token value', () => {
      const state = State.getInstance()

      state.setToken('openaiApiKey', 'old-key')
      state.setToken('openaiApiKey', 'new-key')

      expect(state.getToken('openaiApiKey')).toBe('new-key')
    })
  })

  describe('setAllTokens', () => {
    it('merges new tokens without removing existing ones', () => {
      const state = State.getInstance()

      state.setToken('openaiApiKey', 'sk-123')
      state.setAllTokens({
        azureApiKey: 'azure-456',
        pexelsToken: 'pexels-789',
      })

      expect(state.getToken('openaiApiKey')).toBe('sk-123')
      expect(state.getToken('azureApiKey')).toBe('azure-456')
      expect(state.getToken('pexelsToken')).toBe('pexels-789')
    })

    it('overwrites existing tokens with new values', () => {
      const state = State.getInstance()

      state.setToken('openaiApiKey', 'old-key')
      state.setAllTokens({
        openaiApiKey: 'new-key',
        azureApiKey: 'azure-456',
      })

      expect(state.getToken('openaiApiKey')).toBe('new-key')
      expect(state.getToken('azureApiKey')).toBe('azure-456')
    })

    it('accepts empty object without errors', () => {
      const state = State.getInstance()

      state.setToken('openaiApiKey', 'sk-123')
      state.setAllTokens({})

      expect(state.getToken('openaiApiKey')).toBe('sk-123')
    })
  })

  describe('getMissingTokens', () => {
    it('returns tokens that are not set', () => {
      const state = State.getInstance()

      state.setToken('openaiApiKey', 'sk-123')

      const missing = state.getMissingTokens(['openaiApiKey', 'azureApiKey', 'pexelsToken'])

      expect(missing).toEqual(['azureApiKey', 'pexelsToken'])
    })

    it('returns empty array when all tokens are set', () => {
      const state = State.getInstance()

      state.setToken('openaiApiKey', 'sk-123')
      state.setToken('azureApiKey', 'azure-456')
      state.setToken('pexelsToken', 'pexels-789')

      const missing = state.getMissingTokens(['openaiApiKey', 'azureApiKey', 'pexelsToken'])

      expect(missing).toEqual([])
    })

    it('returns all tokens when none are set', () => {
      const state = State.getInstance()

      const missing = state.getMissingTokens(['openaiApiKey', 'azureApiKey', 'pexelsToken'])

      expect(missing).toEqual(['openaiApiKey', 'azureApiKey', 'pexelsToken'])
    })

    it('handles empty required tokens array', () => {
      const state = State.getInstance()

      const missing = state.getMissingTokens([])

      expect(missing).toEqual([])
    })
  })

  describe('removeToken', () => {
    it('removes the specified token', () => {
      const state = State.getInstance()

      state.setToken('openaiApiKey', 'sk-123')
      state.setToken('azureApiKey', 'azure-456')

      state.removeToken('openaiApiKey')

      expect(state.getToken('openaiApiKey')).toBeUndefined()
      expect(state.getToken('azureApiKey')).toBe('azure-456')
    })

    it('does not throw when removing non-existent token', () => {
      const state = State.getInstance()

      expect(() => state.removeToken('nonExistentKey' as any)).not.toThrow()
    })

    it('can re-set token after removal', () => {
      const state = State.getInstance()

      state.setToken('openaiApiKey', 'old-key')
      state.removeToken('openaiApiKey')
      state.setToken('openaiApiKey', 'new-key')

      expect(state.getToken('openaiApiKey')).toBe('new-key')
    })
  })
})
