import type { ImportOptions, ImportRequest, SaveSettingsPayload } from '../../shared/ipc'

export const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export const isImportOptions = (value: unknown): value is ImportOptions => {
    return isRecord(value) && typeof value.quiz === 'boolean' && typeof value.flashcard === 'boolean'
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
            typeof notionDatabaseId !== 'string' ||
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
