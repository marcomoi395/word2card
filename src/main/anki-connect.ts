interface AnkiResponse {
    result: string | string[] | object[] | object
    error: string | null
}

export const checkAnkiConnect = async () => {
    const url = 'http://localhost:8765'
    try {
        const response = await fetch(url)
        return response.status === 200
    } catch (_) {
        return false
    }
}

export const sendRequest = async (body: object) => {
    const url = 'http://localhost:8765'
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        })

        return (await response.json()) as AnkiResponse
    } catch (error) {
        console.error('Error sending request:', error)
        return error
    }
}
