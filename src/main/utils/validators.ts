import type {
    GenerateMissingDataPayload,
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
    if (!isRecord(value)) {
        return null
    }

    const { openaiApiKey, azureApiKey, pexelsToken } = value
    if (
        typeof openaiApiKey !== 'string' ||
        typeof azureApiKey !== 'string' ||
        typeof pexelsToken !== 'string'
    ) {
        return null
    }

    return { openaiApiKey, azureApiKey, pexelsToken }
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
    Array.isArray(value) && value.every((item) => typeof item === 'string' && item.trim().length > 0)

export const parseUpdateVocabularyPayload = (
    value: unknown
): UpdateVocabularyPayload | null => {
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
    if (!isRecord(value) || (value.recordIds !== undefined && !isStringArray(value.recordIds))) {
        return null
    }
    return value.recordIds ? { recordIds: value.recordIds } : {}
}
