import { describe, it, expect } from 'vitest'
import {
  isRecord,
  isImportOptions,
  parseSaveSettingsPayload,
  parseImportRequest,
} from '../validators'

describe('validators', () => {
  describe('isRecord', () => {
    it('accepts plain objects', () => {
      expect(isRecord({})).toBe(true)
      expect(isRecord({ a: 1 })).toBe(true)
      expect(isRecord({ nested: { key: 'value' } })).toBe(true)
    })

    it('rejects null', () => {
      expect(isRecord(null)).toBe(false)
    })

    it('rejects undefined', () => {
      expect(isRecord(undefined)).toBe(false)
    })

    it('rejects arrays', () => {
      expect(isRecord([])).toBe(false)
      expect(isRecord([1, 2, 3])).toBe(false)
    })

    it('rejects primitive types', () => {
      expect(isRecord('string')).toBe(false)
      expect(isRecord(0)).toBe(false)
      expect(isRecord(42)).toBe(false)
      expect(isRecord(false)).toBe(false)
      expect(isRecord(true)).toBe(false)
    })

    it('rejects functions', () => {
      expect(isRecord(() => {})).toBe(false)
      expect(isRecord(function () {})).toBe(false)
    })
  })

  describe('isImportOptions', () => {
    it('accepts valid ImportOptions with both booleans', () => {
      expect(isImportOptions({ quiz: true, flashcard: false })).toBe(true)
      expect(isImportOptions({ quiz: false, flashcard: true })).toBe(true)
      expect(isImportOptions({ quiz: true, flashcard: true })).toBe(true)
      expect(isImportOptions({ quiz: false, flashcard: false })).toBe(true)
    })

    it('rejects object missing flashcard property', () => {
      expect(isImportOptions({ quiz: true })).toBe(false)
    })

    it('rejects object missing quiz property', () => {
      expect(isImportOptions({ flashcard: false })).toBe(false)
    })

    it('rejects when quiz is not boolean', () => {
      expect(isImportOptions({ quiz: 1, flashcard: false })).toBe(false)
      expect(isImportOptions({ quiz: 'true', flashcard: false })).toBe(false)
      expect(isImportOptions({ quiz: null, flashcard: false })).toBe(false)
    })

    it('rejects when flashcard is not boolean', () => {
      expect(isImportOptions({ quiz: true, flashcard: 0 })).toBe(false)
      expect(isImportOptions({ quiz: true, flashcard: 'false' })).toBe(false)
      expect(isImportOptions({ quiz: true, flashcard: null })).toBe(false)
    })

    it('rejects empty object', () => {
      expect(isImportOptions({})).toBe(false)
    })

    it('rejects non-object values', () => {
      expect(isImportOptions(null)).toBe(false)
      expect(isImportOptions(undefined)).toBe(false)
      expect(isImportOptions('string')).toBe(false)
      expect(isImportOptions(123)).toBe(false)
    })
  })

  describe('parseSaveSettingsPayload', () => {
    it('returns valid payload when all three keys are strings', () => {
      const input = {
        openaiApiKey: 'sk-123',
        azureApiKey: 'azure-456',
        pexelsToken: 'pexels-789',
      }
      expect(parseSaveSettingsPayload(input)).toEqual(input)
    })

    it('returns valid payload with empty strings', () => {
      const input = {
        openaiApiKey: '',
        azureApiKey: '',
        pexelsToken: '',
      }
      expect(parseSaveSettingsPayload(input)).toEqual(input)
    })

    it('ignores extra keys and returns only the three required keys', () => {
      const input = {
        openaiApiKey: 'sk-123',
        azureApiKey: 'azure-456',
        pexelsToken: 'pexels-789',
        extraKey: 'ignored',
        anotherKey: 42,
      }
      expect(parseSaveSettingsPayload(input)).toEqual({
        openaiApiKey: 'sk-123',
        azureApiKey: 'azure-456',
        pexelsToken: 'pexels-789',
      })
    })

    it('returns null when openaiApiKey is missing', () => {
      expect(
        parseSaveSettingsPayload({
          azureApiKey: 'azure-456',
          pexelsToken: 'pexels-789',
        })
      ).toBeNull()
    })

    it('returns null when azureApiKey is missing', () => {
      expect(
        parseSaveSettingsPayload({
          openaiApiKey: 'sk-123',
          pexelsToken: 'pexels-789',
        })
      ).toBeNull()
    })

    it('returns null when pexelsToken is missing', () => {
      expect(
        parseSaveSettingsPayload({
          openaiApiKey: 'sk-123',
          azureApiKey: 'azure-456',
        })
      ).toBeNull()
    })

    it('returns null when openaiApiKey is not a string', () => {
      expect(
        parseSaveSettingsPayload({
          openaiApiKey: 123,
          azureApiKey: 'azure-456',
          pexelsToken: 'pexels-789',
        })
      ).toBeNull()
    })

    it('returns null when azureApiKey is null', () => {
      expect(
        parseSaveSettingsPayload({
          openaiApiKey: 'sk-123',
          azureApiKey: null,
          pexelsToken: 'pexels-789',
        })
      ).toBeNull()
    })

    it('returns null when pexelsToken is boolean', () => {
      expect(
        parseSaveSettingsPayload({
          openaiApiKey: 'sk-123',
          azureApiKey: 'azure-456',
          pexelsToken: true,
        })
      ).toBeNull()
    })

    it('returns null when input is not an object', () => {
      expect(parseSaveSettingsPayload(null)).toBeNull()
      expect(parseSaveSettingsPayload(undefined)).toBeNull()
      expect(parseSaveSettingsPayload('string')).toBeNull()
      expect(parseSaveSettingsPayload(123)).toBeNull()
      expect(parseSaveSettingsPayload([])).toBeNull()
    })
  })

  describe('parseImportRequest', () => {
    describe('FILE_IMPORT type', () => {
      it('returns valid request when all required fields are present', () => {
        const input = {
          type: 'FILE_IMPORT',
          payload: {
            filePath: '/path/to/file.txt',
            deck: 'MyDeck',
            options: { quiz: true, flashcard: false },
          },
        }
        expect(parseImportRequest(input)).toEqual(input)
      })

      it('returns null when filePath is missing', () => {
        const input = {
          type: 'FILE_IMPORT',
          payload: {
            deck: 'MyDeck',
            options: { quiz: true, flashcard: false },
          },
        }
        expect(parseImportRequest(input)).toBeNull()
      })

      it('returns null when deck is missing', () => {
        const input = {
          type: 'FILE_IMPORT',
          payload: {
            filePath: '/path/to/file.txt',
            options: { quiz: true, flashcard: false },
          },
        }
        expect(parseImportRequest(input)).toBeNull()
      })

      it('returns null when options is invalid', () => {
        const input = {
          type: 'FILE_IMPORT',
          payload: {
            filePath: '/path/to/file.txt',
            deck: 'MyDeck',
            options: { quiz: 'true', flashcard: false },
          },
        }
        expect(parseImportRequest(input)).toBeNull()
      })

      it('returns null when filePath is not a string', () => {
        const input = {
          type: 'FILE_IMPORT',
          payload: {
            filePath: 123,
            deck: 'MyDeck',
            options: { quiz: true, flashcard: false },
          },
        }
        expect(parseImportRequest(input)).toBeNull()
      })

      it('returns null when payload is null', () => {
        const input = {
          type: 'FILE_IMPORT',
          payload: null,
        }
        expect(parseImportRequest(input)).toBeNull()
      })
    })

    describe('NOTION_SYNC type', () => {
      it('returns valid request when all required fields are present', () => {
        const input = {
          type: 'NOTION_SYNC',
          payload: {
            token: 'secret_token',
            notionDatabaseId: 'db-123',
            deck: 'NotionDeck',
            options: { quiz: false, flashcard: true },
          },
        }
        expect(parseImportRequest(input)).toEqual(input)
      })

      it('returns null when token is missing', () => {
        const input = {
          type: 'NOTION_SYNC',
          payload: {
            notionDatabaseId: 'db-123',
            deck: 'NotionDeck',
            options: { quiz: false, flashcard: true },
          },
        }
        expect(parseImportRequest(input)).toBeNull()
      })

      it('returns null when notionDatabaseId is missing', () => {
        const input = {
          type: 'NOTION_SYNC',
          payload: {
            token: 'secret_token',
            deck: 'NotionDeck',
            options: { quiz: false, flashcard: true },
          },
        }
        expect(parseImportRequest(input)).toBeNull()
      })

      it('returns null when deck is not a string', () => {
        const input = {
          type: 'NOTION_SYNC',
          payload: {
            token: 'secret_token',
            notionDatabaseId: 'db-123',
            deck: 123,
            options: { quiz: false, flashcard: true },
          },
        }
        expect(parseImportRequest(input)).toBeNull()
      })

      it('returns null when payload is not an object', () => {
        const input = {
          type: 'NOTION_SYNC',
          payload: 'not-an-object',
        }
        expect(parseImportRequest(input)).toBeNull()
      })
    })

    describe('invalid type', () => {
      it('returns null for unknown type', () => {
        const input = {
          type: 'UNKNOWN_TYPE',
          payload: {},
        }
        expect(parseImportRequest(input)).toBeNull()
      })

      it('returns null when type is missing', () => {
        const input = {
          payload: {
            filePath: '/path/to/file.txt',
            deck: 'MyDeck',
            options: { quiz: true, flashcard: false },
          },
        }
        expect(parseImportRequest(input)).toBeNull()
      })
    })

    describe('malformed input', () => {
      it('returns null when input is not an object', () => {
        expect(parseImportRequest(null)).toBeNull()
        expect(parseImportRequest(undefined)).toBeNull()
        expect(parseImportRequest('string')).toBeNull()
        expect(parseImportRequest(123)).toBeNull()
        expect(parseImportRequest([])).toBeNull()
      })
    })
  })
})
