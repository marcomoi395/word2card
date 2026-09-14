import { describe, it, expect } from 'vitest'
import {
    createNotionTargetQueueMap,
    filterNotionTargetsByWords,
    shiftNotionTarget,
    type NotionSyncTarget
} from '../notion-sync'
import { defaultImportedDeckName, resolveImportedDeckName } from '../../../shared/deck'

describe('notion-sync helpers', () => {
    describe('import deck names', () => {
        const date = new Date(2026, 4, 6)

        it('uses the date-based imported deck when input is blank', () => {
            expect(defaultImportedDeckName(date)).toBe('Vocabulary::Imported::2026-05-06')
            expect(resolveImportedDeckName('   ', date)).toBe('Vocabulary::Imported::2026-05-06')
        })

        it('uses a custom destination deck exactly as entered', () => {
            expect(resolveImportedDeckName('  IELTS  ', date)).toBe('IELTS')
        })
    })

    describe('filterNotionTargetsByWords', () => {
        it('preserves duplicate occurrences by count', () => {
            const targets: NotionSyncTarget[] = [
                { pageId: 'page-1', word: 'bank', deckName: 'Deck A' },
                { pageId: 'page-2', word: 'bank', deckName: 'Deck B' },
                { pageId: 'page-3', word: 'river', deckName: 'Deck C' }
            ]

            expect(filterNotionTargetsByWords(targets, ['bank', 'river'])).toEqual([
                targets[0],
                targets[2]
            ])
            expect(filterNotionTargetsByWords(targets, ['bank', 'bank'])).toEqual([
                targets[0],
                targets[1]
            ])
        })

        it('matches words case-insensitively', () => {
            const targets: NotionSyncTarget[] = [
                { pageId: 'page-1', word: 'Bank', deckName: 'Deck A' },
                { pageId: 'page-2', word: 'RIVER', deckName: 'Deck B' }
            ]

            expect(filterNotionTargetsByWords(targets, ['bank', 'river'])).toEqual([
                targets[0],
                targets[1]
            ])
        })

        it('returns empty array when words list is empty', () => {
            const targets: NotionSyncTarget[] = [
                { pageId: 'page-1', word: 'bank', deckName: 'Deck A' }
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
                { pageId: 'page-2', word: 'bank', deckName: 'Deck B' }
            ])

            expect(shiftNotionTarget(queue, 'bank')?.pageId).toBe('page-1')
            expect(shiftNotionTarget(queue, 'bank')?.pageId).toBe('page-2')
            expect(shiftNotionTarget(queue, 'bank')).toBeUndefined()
        })

        it('returns undefined when word does not exist in queue', () => {
            const queue = createNotionTargetQueueMap([
                { pageId: 'page-1', word: 'bank', deckName: 'Deck A' }
            ])

            expect(shiftNotionTarget(queue, 'river')).toBeUndefined()
        })

        it('uses case-insensitive normalization in queue', () => {
            const queue = createNotionTargetQueueMap([
                { pageId: 'page-1', word: 'Bank', deckName: 'Deck A' },
                { pageId: 'page-2', word: 'BANK', deckName: 'Deck B' }
            ])

            expect(shiftNotionTarget(queue, 'bank')?.pageId).toBe('page-1')
            expect(shiftNotionTarget(queue, 'BANK')?.pageId).toBe('page-2')
        })
    })
})
