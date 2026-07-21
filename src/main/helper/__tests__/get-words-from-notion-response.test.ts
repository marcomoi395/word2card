import { describe, it, expect } from 'vitest'
import { getWordEntriesFromResponse, getWordsFromResponse } from '../get-words-from-notion-response'

describe('get-words-from-notion-response', () => {
  describe('getWordEntriesFromResponse', () => {
    it('returns array with pageId and word from valid pages', () => {
      const pages = [
        {
          id: 'page-1',
          properties: {
            English: {
              type: 'title',
              title: [{ plain_text: 'bank' }],
            },
          },
        },
        {
          id: 'page-2',
          properties: {
            English: {
              type: 'title',
              title: [{ plain_text: 'river' }],
            },
          },
        },
      ]

      const result = getWordEntriesFromResponse(pages)
      expect(result).toEqual([
        { pageId: 'page-1', word: 'bank' },
        { pageId: 'page-2', word: 'river' },
      ])
    })

    it('trims and lowercases word: "  Bank  " becomes "bank"', () => {
      const pages = [
        {
          id: 'page-1',
          properties: {
            English: {
              type: 'title',
              title: [{ plain_text: '  Bank  ' }],
            },
          },
        },
      ]

      const result = getWordEntriesFromResponse(pages)
      expect(result).toEqual([{ pageId: 'page-1', word: 'bank' }])
    })

    it('returns empty array when input is empty array', () => {
      expect(getWordEntriesFromResponse([])).toEqual([])
    })

    it('returns empty array when input is null', () => {
      expect(getWordEntriesFromResponse(null as any)).toEqual([])
    })

    it('returns empty array when input is undefined', () => {
      expect(getWordEntriesFromResponse(undefined as any)).toEqual([])
    })

    it('returns empty array when input is object (not array)', () => {
      expect(getWordEntriesFromResponse({ id: 'page-1' } as any)).toEqual([])
    })

    it('skips page missing id property', () => {
      const pages = [
        {
          properties: {
            English: {
              type: 'title',
              title: [{ plain_text: 'bank' }],
            },
          },
        },
        {
          id: 'page-2',
          properties: {
            English: {
              type: 'title',
              title: [{ plain_text: 'river' }],
            },
          },
        },
      ]

      const result = getWordEntriesFromResponse(pages)
      expect(result).toEqual([{ pageId: 'page-2', word: 'river' }])
    })

    it('skips page where properties.English does not exist', () => {
      const pages = [
        {
          id: 'page-1',
          properties: {
            Vietnamese: {
              type: 'title',
              title: [{ plain_text: 'ngân hàng' }],
            },
          },
        },
        {
          id: 'page-2',
          properties: {
            English: {
              type: 'title',
              title: [{ plain_text: 'river' }],
            },
          },
        },
      ]

      const result = getWordEntriesFromResponse(pages)
      expect(result).toEqual([{ pageId: 'page-2', word: 'river' }])
    })

    it('skips page where properties.English.type is not "title"', () => {
      const pages = [
        {
          id: 'page-1',
          properties: {
            English: {
              type: 'rich_text',
              title: [{ plain_text: 'bank' }],
            },
          },
        },
        {
          id: 'page-2',
          properties: {
            English: {
              type: 'title',
              title: [{ plain_text: 'river' }],
            },
          },
        },
      ]

      const result = getWordEntriesFromResponse(pages)
      expect(result).toEqual([{ pageId: 'page-2', word: 'river' }])
    })

    it('skips page where title[0].plain_text is empty after trim', () => {
      const pages = [
        {
          id: 'page-1',
          properties: {
            English: {
              type: 'title',
              title: [{ plain_text: '   ' }],
            },
          },
        },
        {
          id: 'page-2',
          properties: {
            English: {
              type: 'title',
              title: [{ plain_text: 'river' }],
            },
          },
        },
      ]

      const result = getWordEntriesFromResponse(pages)
      expect(result).toEqual([{ pageId: 'page-2', word: 'river' }])
    })

    it('skips page where title array is empty', () => {
      const pages = [
        {
          id: 'page-1',
          properties: {
            English: {
              type: 'title',
              title: [],
            },
          },
        },
        {
          id: 'page-2',
          properties: {
            English: {
              type: 'title',
              title: [{ plain_text: 'river' }],
            },
          },
        },
      ]

      const result = getWordEntriesFromResponse(pages)
      expect(result).toEqual([{ pageId: 'page-2', word: 'river' }])
    })

    it('skips page where title[0].plain_text is missing', () => {
      const pages = [
        {
          id: 'page-1',
          properties: {
            English: {
              type: 'title',
              title: [{}],
            },
          },
        },
        {
          id: 'page-2',
          properties: {
            English: {
              type: 'title',
              title: [{ plain_text: 'river' }],
            },
          },
        },
      ]

      const result = getWordEntriesFromResponse(pages)
      expect(result).toEqual([{ pageId: 'page-2', word: 'river' }])
    })

    it('accepts custom propertyName parameter', () => {
      const pages = [
        {
          id: 'page-1',
          properties: {
            Word: {
              type: 'title',
              title: [{ plain_text: 'bank' }],
            },
          },
        },
      ]

      const result = getWordEntriesFromResponse(pages, 'Word')
      expect(result).toEqual([{ pageId: 'page-1', word: 'bank' }])
    })
  })

  describe('getWordsFromResponse', () => {
    it('returns array of word strings from valid pages', () => {
      const pages = [
        {
          id: 'page-1',
          properties: {
            English: {
              type: 'title',
              title: [{ plain_text: 'bank' }],
            },
          },
        },
        {
          id: 'page-2',
          properties: {
            English: {
              type: 'title',
              title: [{ plain_text: 'river' }],
            },
          },
        },
      ]

      const result = getWordsFromResponse(pages)
      expect(result).toEqual(['bank', 'river'])
    })

    it('returns same words as getWordEntriesFromResponse but without pageId', () => {
      const pages = [
        {
          id: 'page-1',
          properties: {
            English: {
              type: 'title',
              title: [{ plain_text: 'Bank' }],
            },
          },
        },
        {
          id: 'page-2',
          properties: {
            English: {
              type: 'title',
              title: [{ plain_text: 'RIVER' }],
            },
          },
        },
      ]

      const entries = getWordEntriesFromResponse(pages)
      const words = getWordsFromResponse(pages)

      expect(words).toEqual(entries.map((e) => e.word))
      expect(words).toEqual(['bank', 'river'])
    })

    it('returns empty array when input is invalid', () => {
      expect(getWordsFromResponse(null as any)).toEqual([])
      expect(getWordsFromResponse(undefined as any)).toEqual([])
      expect(getWordsFromResponse([])).toEqual([])
    })
  })
})
