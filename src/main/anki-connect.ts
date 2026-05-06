export interface AnkiResponse<T> {
    result: T
    error: string | null
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null
}

const isAnkiResponse = <T>(value: unknown): value is AnkiResponse<T> => {
    return isRecord(value) && 'result' in value && 'error' in value
}

export const checkAnkiConnect = async () => {
    const url = 'http://localhost:8765'
    try {
        const response = await fetch(url)
        return response.status === 200
    } catch {
        return false
    }
}

export const sendRequest = async <T>(body: Record<string, unknown>): Promise<AnkiResponse<T>> => {
    const url = 'http://localhost:8765'
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    })

    if (!response.ok) {
        throw new Error(`AnkiConnect request failed with status ${response.status}`)
    }

    const data: unknown = await response.json()
    if (!isAnkiResponse<T>(data)) {
        throw new Error('Invalid response from AnkiConnect')
    }

    return data
}
