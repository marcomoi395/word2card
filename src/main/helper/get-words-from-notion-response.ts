import { PageObjectResponse } from '@notionhq/client'

export const getWordsFromResponse = (
    pages: PageObjectResponse[],
    propertyName: string = 'English'
): string[] => {
    if (!pages || !Array.isArray(pages)) {
        return []
    }

    return pages
        .map((page) => {
            const property = page.properties[propertyName]
            if (property && property.type === 'title') {
                const word = property.title?.[0]?.plain_text || ''
                return word.trim().toLowerCase()
            }

            return ''
        })
        .filter((word): word is string => word !== '')
}
