import { describe, it, expect } from 'vitest'
import {
    createNotionTargetQueueMap,
    filterNotionTargetsByWords,
    resolveNotionDeckName,
    shiftNotionTarget,
    type NotionSyncTarget
} from './notion-sync'

describe('notion-sync', () => {
    describe('resolveNotionDeckName', () => {
        it('uses datasource name when input is blank', () => {
            const deckName = resolveNotionDeckName('', 'Cambridge IELTS', new Date('2026-05-06T09:00:00.000Z'))
            expect(deckName).toBe('Vocabulary::Imported::Cambridge IELTS::2026-05-06')
        })

        it('prefixes custom input and appends date with separator', () => {
            const deckName = resolveNotionDeckName('IELTS', 'Ignored', new Date('2026-05-06T09:00:00.000Z'))
            expect(deckName).toBe('Vocabulary::Imported::IELTS::2026-05-06')
        })
    })

    describe('filterNotionTargetsByWords', () => {
        it('preserves duplicate occurrences by count', () => {
            const targets: NotionSyncTarget[] = [
                { pageId: 'page-1', word: 'bank', deckName: 'Deck A' },
                { pageId: 'page-2', word: 'bank', deckName: 'Deck B' },
                { pageId: 'page-3', word: 'river', deckName: 'Deck C' }
            ]

            expect(filterNotionTargetsByWords(targets, ['bank', 'river'])).toEqual([targets[0], targets[2]])
            expect(filterNotionTargetsByWords(targets, ['bank', 'bank'])).toEqual([targets[0], targets[1]])
        })
    })

    describe('shiftNotionTarget', () => {
        it('consumes matching targets in insertion order', () => {
            const queue = createNotionTargetQueueMap([
                { pageId: 'page-1', word: 'bank', deckName: 'Deck A' },
                { pageId: 'page-2', word: 'bank', deckName: 'Deck B' }
            ])

            expect(shiftNotionTarget(queue, 'bank')?.pageId).toBe('page-1')
            expect(shiftNotionTarget(queue, 'bank')?.pageId).toBe('page-2')
            expect(shiftNotionTarget(queue, 'bank')).toBeUndefined()
        })
    })
})
