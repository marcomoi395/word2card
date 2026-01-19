interface UnsplashImage {
    id: string
    urls: {
        small: string
        regular?: string
    }
}

interface UnsplashResponse {
    results: UnsplashImage[]
}

export async function searchImageUnsplash(
    accessKey: string,
    query: string
): Promise<string | null> {
    try {
        const url = new URL('https://api.unsplash.com/search/photos')
        url.searchParams.append('query', query)
        url.searchParams.append('per_page', '1')
        url.searchParams.append('orientation', 'landscape')

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                Authorization: `Client-ID ${accessKey}`,
                'Content-Type': 'application/json'
            }
        })

        if (!response.ok) {
            console.error(`Unsplash API Error: ${response.status} ${response.statusText}`)
            return null
        }

        const data = (await response.json()) as UnsplashResponse

        if (data.results && data.results.length > 0) {
            return data.results[0].urls.small
        }

        return null
    } catch (error) {
        return null
    }
}
