import { createClient } from 'pexels'
import { createLogger } from '../shared/logger'

const logger = createLogger('main.pexels')
export async function searchImagePexels(
    token: string,
    queries: string[] | string
): Promise<string | null> {
    try {
        const client = createClient(token)
        const queryList = typeof queries === 'string' ? [queries] : queries

        for (const query of queryList) {
            if (!query.trim()) {
                continue
            }

            try {
                const response = await client.photos.search({
                    query,
                    per_page: 1,
                    orientation: 'landscape'
                })

                if ('photos' in response && response.photos.length > 0) {
                    return response.photos[0].src.medium
                }
            } catch (error) {
                logger.error('pexels_image_search_failed', {
                    error: error instanceof Error ? error : new Error(String(error)),
                    query
                })
            }
        }
    } catch (error) {
        logger.error('pexels_image_search_failed', {
            error: error instanceof Error ? error : new Error(String(error))
        })
    }

    return null
}
