import { describe, expect, it } from 'vitest'
import { IPC_CHANNELS } from '../ipc'
import { parseRecordIdsPayload, parseUpdateVocabularyPayload } from '../../main/utils/validators'

describe('shared IPC contracts', () => {
    it('exposes stable channels for feature operations', () => {
        expect(IPC_CHANNELS.listVocabulary).toBe('list-vocabulary')
        expect(IPC_CHANNELS.updateVocabulary).toBe('update-vocabulary')
        expect(IPC_CHANNELS.generateMissingData).toBe('generate-missing-data')
        expect(IPC_CHANNELS.getProviderHealth).toBe('get-provider-health')
        expect(IPC_CHANNELS.submitToAnki).toBe('submit-to-anki')
    })

    it('accepts a validated vocabulary edit payload', () => {
        expect(
            parseUpdateVocabularyPayload({ id: 'word-1', changes: { meaning: 'definition' } })
        ).toEqual({
            id: 'word-1',
            changes: { meaning: 'definition' }
        })
    })

    it('rejects unknown or empty vocabulary edits', () => {
        expect(parseUpdateVocabularyPayload({ id: 'word-1', changes: {} })).toBeNull()
        expect(
            parseUpdateVocabularyPayload({ id: 'word-1', changes: { generationStatus: 'ready' } })
        ).toBeNull()
    })

    it('accepts optional record ID selections and rejects malformed values', () => {
        expect(parseRecordIdsPayload({ recordIds: ['word-1', 'word-2'] })).toEqual({
            recordIds: ['word-1', 'word-2']
        })
        expect(parseRecordIdsPayload(undefined)).toEqual({})
        expect(parseRecordIdsPayload({ recordIds: [''] })).toBeNull()
        expect(parseRecordIdsPayload({ recordIds: 'word-1' })).toBeNull()
    })
})
