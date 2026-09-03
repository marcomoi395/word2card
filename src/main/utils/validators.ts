import type {
    GenerateMissingDataPayload,
    ImportDraftRecord,
    ImportOptions,
    ImportRequest,
    SaveSettingsPayload,
    SubmitToAnkiPayload,
    UpdateVocabularyPayload
} from '../../shared/ipc'

export const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export const isImportOptions = (value: unknown): value is ImportOptions => {
    return (
        isRecord(value) && typeof value.quiz === 'boolean' && typeof value.flashcard === 'boolean'
    )
}

export const parseSaveSettingsPayload = (value: unknown): SaveSettingsPayload | null => {
    if (!isRecord(value)) return null
    const { openaiApiKey, azureApiKey, pexelsToken, openaiBaseUrl, openaiModel } = value
    if (
        typeof openaiApiKey !== 'string' ||
        typeof azureApiKey !== 'string' ||
        typeof pexelsToken !== 'string'
    )
        return null
    if (openaiBaseUrl !== undefined && typeof openaiBaseUrl !== 'string') return null
    if (openaiModel !== undefined && typeof openaiModel !== 'string') return null
    return { openaiApiKey, azureApiKey, pexelsToken, openaiBaseUrl, openaiModel }
}

export const parseImportRequest = (value: unknown): ImportRequest | null => {
    if (!isRecord(value)) {
        return null
    }

    if (value.type === 'FILE_IMPORT') {
        const payload = value.payload
        if (!isRecord(payload)) {
            return null
        }

        const { filePath, deck, options } = payload
        if (typeof filePath !== 'string' || typeof deck !== 'string' || !isImportOptions(options)) {
            return null
        }

        return {
            type: 'FILE_IMPORT',
            payload: { filePath, deck, options }
        }
    }

    if (value.type === 'NOTION_SYNC') {
        const payload = value.payload
        if (!isRecord(payload)) {
            return null
        }

        const { token, notionDatabaseId, deck, options } = payload
        if (
            typeof token !== 'string' ||
            !token.trim() ||
            typeof notionDatabaseId !== 'string' ||
            !notionDatabaseId.trim() ||
            typeof deck !== 'string' ||
            !isImportOptions(options)
        ) {
            return null
        }

        return {
            type: 'NOTION_SYNC',
            payload: { token, notionDatabaseId, deck, options }
        }
    }

    return null
}
const EDITABLE_FIELDS = [
    'word',
    'partOfSpeech',
    'cloze',
    'example',
    'vietnamese',
    'ipa',
    'meaning',
    'imageUrl',
    'imageProvider',
    'audio'
] as const

const isStringArray = (value: unknown): value is string[] =>
    Array.isArray(value) &&
    value.every((item) => typeof item === 'string' && item.trim().length > 0)
const isNullableString = (value: unknown): value is string | null => value === null || typeof value === 'string'

export const parseImportDraftRecord = (value: unknown): ImportDraftRecord | null => {
    if (!isRecord(value)) return null
    if (
        typeof value.id !== 'string' || !value.id.trim() ||
        typeof value.word !== 'string' || !value.word.trim() ||
        (value.source !== 'file' && value.source !== 'notion') ||
        !isNullableString(value.sourceReference) ||
        !isNullableString(value.partOfSpeech) ||
        !isNullableString(value.cloze) ||
        !isNullableString(value.example) ||
        !isNullableString(value.vietnamese) ||
        !isNullableString(value.ipa) ||
        !isNullableString(value.meaning) ||
        !isNullableString(value.imageUrl) ||
        !isNullableString(value.imageProvider) ||
        !isNullableString(value.audio) ||
        !['pending', 'generating', 'ready', 'failed'].includes(value.generationStatus as string) ||
        !isNullableString(value.generationError)
    ) return null
    return value as unknown as ImportDraftRecord
}

export const parseImportDraftRecords = (value: unknown): ImportDraftRecord[] | null => {
    if (!Array.isArray(value)) return null
    const records = value.map(parseImportDraftRecord)
    return records.every((record): record is ImportDraftRecord => record !== null) ? records : null
}

export const parseUpdateVocabularyPayload = (value: unknown): UpdateVocabularyPayload | null => {
    if (
        !isRecord(value) ||
        typeof value.id !== 'string' ||
        !value.id.trim() ||
        !isRecord(value.changes)
    ) {
        return null
    }

    const changes: Record<string, unknown> = {}
    for (const key of Object.keys(value.changes)) {
        if (!EDITABLE_FIELDS.includes(key as (typeof EDITABLE_FIELDS)[number])) return null
        const field = value.changes[key]
        if (field !== null && typeof field !== 'string') return null
        changes[key] = field
    }
    if (Object.keys(changes).length === 0) return null
    return { id: value.id, changes: changes as UpdateVocabularyPayload['changes'] }
}

export const parseRecordIdsPayload = (
    value: unknown
): GenerateMissingDataPayload | SubmitToAnkiPayload | null => {
    if (value === undefined) return {}
    if (!isRecord(value)) return null
    if (value.records !== undefined) {
        const records = parseImportDraftRecords(value.records)
        return records ? { records } : null
    }
    if (value.recordIds !== undefined && !isStringArray(value.recordIds)) return null
    return value.recordIds ? { recordIds: value.recordIds } : {}
}
export const parseEditVocabularyPayload = parseUpdateVocabularyPayload
