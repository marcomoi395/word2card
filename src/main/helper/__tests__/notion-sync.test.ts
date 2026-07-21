import { describe, it, expect } from 'vitest'
import {
  createNotionTargetQueueMap,
  filterNotionTargetsByWords,
  resolveNotionDeckName,
  shiftNotionTarget,
  type NotionSyncTarget,
} from '../notion-sync'

describe('notion-sync helpers', () => {
  describe('resolveNotionDeckName', () => {
    it('uses datasource name when input is blank', () => {
      const deckName = resolveNotionDeckName('', 'Cambridge IELTS', new Date('2026-05-06T09:00:00.000Z'))
      expect(deckName).toBe('Vocabulary::Imported::Cambridge IELTS::2026-05-06')
    })

    it('prefixes custom input and appends date with separator', () => {
      const deckName = resolveNotionDeckName('IELTS', 'Ignored', new Date('2026-05-06T09:00:00.000Z'))
      expect(deckName).toBe('Vocabulary::Imported::IELTS::2026-05-06')
    })

    it('trims whitespace-only deckInput and uses datasource name', () => {
      const deckName = resolveNotionDeckName('   ', 'Cambridge IELTS', new Date('2026-05-06T09:00:00.000Z'))
      expect(deckName).toBe('Vocabulary::Imported::Cambridge IELTS::2026-05-06')
    })

    it('trims whitespace from dataSourceName before concatenation', () => {
      const deckName = resolveNotionDeckName('', '  Cambridge IELTS  ', new Date('2026-05-06T09:00:00.000Z'))
      expect(deckName).toBe('Vocabulary::Imported::Cambridge IELTS::2026-05-06')
    })
  })

  describe('filterNotionTargetsByWords', () => {
    it('preserves duplicate occurrences by count', () => {
      const targets: NotionSyncTarget[] = [
        { pageId: 'page-1', word: 'bank', deckName: 'Deck A' },
        { pageId: 'page-2', word: 'bank', deckName: 'Deck B' },
        { pageId: 'page-3', word: 'river', deckName: 'Deck C' },
      ]

      expect(filterNotionTargetsByWords(targets, ['bank', 'river'])).toEqual([targets[0], targets[2]])
      expect(filterNotionTargetsByWords(targets, ['bank', 'bank'])).toEqual([targets[0], targets[1]])
    })

    it('matches words case-insensitively', () => {
      const targets: NotionSyncTarget[] = [
        { pageId: 'page-1', word: 'Bank', deckName: 'Deck A' },
        { pageId: 'page-2', word: 'RIVER', deckName: 'Deck B' },
      ]

      expect(filterNotionTargetsByWords(targets, ['bank', 'river'])).toEqual([targets[0], targets[1]])
    })

    it('returns empty array when words list is empty', () => {
      const targets: NotionSyncTarget[] = [
        { pageId: 'page-1', word: 'bank', deckName: 'Deck A' },
      ]

      expect(filterNotionTargetsByWords(targets, [])).toEqual([])
    })

    it('returns empty array when targets list is empty', () => {
      expect(filterNotionTargetsByWords([], ['bank', 'river'])).toEqual([])
    })
  })

  describe('createNotionTargetQueueMap and shiftNotionTarget', () => {
    it('consumes matching targets in insertion order', () => {
      const queue = createNotionTargetQueueMap([
        { pageId: 'page-1', word: 'bank', deckName: 'Deck A' },
        { pageId: 'page-2', word: 'bank', deckName: 'Deck B' },
      ])

      expect(shiftNotionTarget(queue, 'bank')?.pageId).toBe('page-1')
      expect(shiftNotionTarget(queue, 'bank')?.pageId).toBe('page-2')
      expect(shiftNotionTarget(queue, 'bank')).toBeUndefined()
    })

    it('returns undefined when word does not exist in queue', () => {
      const queue = createNotionTargetQueueMap([
        { pageId: 'page-1', word: 'bank', deckName: 'Deck A' },
      ])

      expect(shiftNotionTarget(queue, 'river')).toBeUndefined()
    })

    it('uses case-insensitive normalization in queue', () => {
      const queue = createNotionTargetQueueMap([
        { pageId: 'page-1', word: 'Bank', deckName: 'Deck A' },
        { pageId: 'page-2', word: 'BANK', deckName: 'Deck B' },
      ])

      expect(shiftNotionTarget(queue, 'bank')?.pageId).toBe('page-1')
      expect(shiftNotionTarget(queue, 'BANK')?.pageId).toBe('page-2')
    })
  })
})
