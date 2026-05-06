import test from 'node:test'
import assert from 'node:assert/strict'
import {
    createNotionTargetQueueMap,
    filterNotionTargetsByWords,
    resolveNotionDeckName,
    shiftNotionTarget,
    type NotionSyncTarget
} from './notion-sync'

test('resolveNotionDeckName uses datasource name when input is blank', () => {
    const deckName = resolveNotionDeckName('', 'Cambridge IELTS', new Date('2026-05-06T09:00:00.000Z'))

    assert.equal(deckName, 'Vocabulary::Imported::Cambridge IELTS::2026-05-06')
})

test('resolveNotionDeckName prefixes custom input and appends date with separator', () => {
    const deckName = resolveNotionDeckName('IELTS', 'Ignored', new Date('2026-05-06T09:00:00.000Z'))

    assert.equal(deckName, 'Vocabulary::Imported::IELTS::2026-05-06')
})

test('filterNotionTargetsByWords preserves duplicate occurrences by count', () => {
    const targets: NotionSyncTarget[] = [
        { pageId: 'page-1', word: 'bank', deckName: 'Deck A' },
        { pageId: 'page-2', word: 'bank', deckName: 'Deck B' },
        { pageId: 'page-3', word: 'river', deckName: 'Deck C' }
    ]

    assert.deepEqual(filterNotionTargetsByWords(targets, ['bank', 'river']), [targets[0], targets[2]])
    assert.deepEqual(filterNotionTargetsByWords(targets, ['bank', 'bank']), [targets[0], targets[1]])
})

test('shiftNotionTarget consumes matching targets in insertion order', () => {
    const queue = createNotionTargetQueueMap([
        { pageId: 'page-1', word: 'bank', deckName: 'Deck A' },
        { pageId: 'page-2', word: 'bank', deckName: 'Deck B' }
    ])

    assert.equal(shiftNotionTarget(queue, 'bank')?.pageId, 'page-1')
    assert.equal(shiftNotionTarget(queue, 'bank')?.pageId, 'page-2')
    assert.equal(shiftNotionTarget(queue, 'bank'), undefined)
})
