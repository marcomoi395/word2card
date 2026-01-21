import { sendRequest } from '../anki-connect'

export async function filterExistingWords(
    words: string[],
    fieldName: string = 'word'
): Promise<string[]> {
    try {
        if (words.length === 0) {
            return []
        }

        const checkPromises = words.map(async (word) => {
            const getNotes = (await sendRequest({
                action: 'findNotes',
                version: 6,
                params: {
                    query: `${fieldName}:${word}`
                }
            })) as { result: string[]; error: string | null }

            return getNotes.result && getNotes.result.length === 0 ? word : null
        })

        const results = await Promise.all(checkPromises)
        const finalWords = results.filter((word): word is string => word !== null)
        return finalWords
    } catch (error) {
        console.error('Error filtering existing words:', error)
        return words
    }
}
