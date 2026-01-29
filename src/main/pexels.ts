import { createClient } from 'pexels'

export async function searchImagePexels(token: string, query: string): Promise<string | null> {
    const client = createClient(token)

    try {
        const response = await client.photos.search({
            query,
            per_page: 1,
            orientation: 'landscape'
        })

        if ('photos' in response && response.photos.length > 0) {
            return response.photos[0].src.medium
        }

        return null
    } catch (error) {
        return null
    }
}
