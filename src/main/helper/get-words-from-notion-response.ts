type NotionLikePage = {
    id: string
    properties: Record<string, unknown>
}

export interface NotionWordEntry {
    pageId: string
    word: string
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null
}

const isNotionLikePage = (value: unknown): value is NotionLikePage => {
    return isRecord(value) && typeof value.id === 'string' && isRecord(value.properties)
}

const hasTitleProperty = (
    value: unknown
): value is { type: 'title'; title: Array<{ plain_text?: string }> } => {
    return typeof value === 'object' && value !== null && 'type' in value && 'title' in value
}

export const getWordEntriesFromResponse = (
    pages: unknown[],
    propertyName: string = 'English'
): NotionWordEntry[] => {
    if (!pages || !Array.isArray(pages)) {
        return []
    }

    return pages
        .filter(isNotionLikePage)
        .map((page) => {
            const property = page.properties[propertyName]
            if (hasTitleProperty(property) && property.type === 'title') {
                const word = property.title?.[0]?.plain_text?.trim().toLowerCase()
                if (word) {
                    return {
                        pageId: page.id,
                        word
                    }
                }
            }

            return null
        })
        .filter((entry): entry is NotionWordEntry => entry !== null)
}

export const getWordsFromResponse = (
    pages: unknown[],
    propertyName: string = 'English'
): string[] => {
    return getWordEntriesFromResponse(pages, propertyName).map((entry) => entry.word)
}
