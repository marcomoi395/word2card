import { sendRequest } from '../anki-connect'

export async function filterExistingWords(
    words: string[],
    fieldName: string = 'word'
): Promise<string[]> {
    try {
        if (words.length === 0) {
            return []
        }

        const actions = words.map((word) => ({
            action: 'findNotes',
            params: {
                query: `${fieldName}:${word}`
            }
        }))

        const response = (await sendRequest({
            action: 'multi',
            version: 6,
            params: { actions }
        })) as { result: number[][]; error: string | null }

        if (response.error) {
            throw new Error(response.error)
        }

        return words.filter((_, index) => {
            const resultForWord = response.result[index]
            return resultForWord && resultForWord.length === 0
        })
    } catch (error) {
        console.error('Error filtering existing words:', error)
        return words
    }
}
