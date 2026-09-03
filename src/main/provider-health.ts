import { checkAnkiConnect } from './anki-connect'
import { getRuntimeSetting } from './state/runtime'
import type { ProviderHealthSnapshot, ProviderHealthStatus, ProviderName } from '../shared/ipc'
import { createLogger } from '../shared/logger'

const logger = createLogger('main.provider_health')
const timeoutMs = 5000
const result = (
    provider: ProviderName,
    state: ProviderHealthStatus['state'],
    message?: string
): ProviderHealthStatus => ({
    provider,
    state,
    ...(message ? { message } : {})
})

const request = async (url: string, init?: RequestInit): Promise<Response> => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
        return await fetch(url, { ...init, signal: controller.signal })
    } finally {
        clearTimeout(timeout)
    }
}

const checkOpenAI = async (): Promise<ProviderHealthStatus> => {
    const key = getRuntimeSetting('openaiApiKey')
    if (!key) return result('openai', 'not_configured', 'API key not configured')
    const baseUrl =
        getRuntimeSetting('openaiBaseUrl')?.replace(/\/$/, '') || 'https://api.openai.com/v1'
    try {
        const response = await request(`${baseUrl}/models`, {
            headers: { Authorization: `Bearer ${key}` }
        })
        return response.ok
            ? result('openai', 'connected', 'Connected')
            : result('openai', response.status === 401 ? 'invalid' : 'unreachable', `HTTP ${response.status}`)
    } catch (error) {
        logger.error('openai_health_check_failed', {
            error: error instanceof Error ? error : new Error(String(error))
        })
        return result('openai', 'unreachable', 'Unable to reach OpenAI')
    }
}

const checkNotion = async (): Promise<ProviderHealthStatus> => {
    const token = getRuntimeSetting('notionToken')
    const databaseId = getRuntimeSetting('notionDatabaseId')
    if (!token || !databaseId)
        return result('notion', 'not_configured', 'Token and database ID required')
    try {
        const response = await request(
            `https://api.notion.com/v1/databases/${encodeURIComponent(databaseId)}`,
            { headers: { Authorization: `Bearer ${token}`, 'Notion-Version': '2022-06-28' } }
        )
        return response.ok
            ? result('notion', 'connected', 'Connected')
            : result('notion', response.status === 401 ? 'invalid' : 'unreachable', `HTTP ${response.status}`)
    } catch (error) {
        logger.error('notion_health_check_failed', {
            error: error instanceof Error ? error : new Error(String(error))
        })
        return result('notion', 'unreachable', 'Unable to reach Notion')
    }
}

const checkPexels = async (): Promise<ProviderHealthStatus> => {
    const token = getRuntimeSetting('pexelsToken')
    if (!token) return result('pexels', 'not_configured', 'API key not configured')
    try {
        const response = await request('https://api.pexels.com/v1/curated?per_page=1', {
            headers: { Authorization: token }
        })
        return response.ok
            ? result('pexels', 'connected', 'Connected')
            : result('pexels', response.status === 401 ? 'invalid' : 'unreachable', `HTTP ${response.status}`)
    } catch (error) {
        logger.error('pexels_health_check_failed', {
            error: error instanceof Error ? error : new Error(String(error))
        })
        return result('pexels', 'unreachable', 'Unable to reach Pexels')
    }
}

const checkAnki = async (): Promise<ProviderHealthStatus> =>
    (await checkAnkiConnect())
        ? result('anki', 'connected', 'Connected')
        : result('anki', 'unreachable', 'AnkiConnect is not running')

export const checkProviderHealth = async (): Promise<ProviderHealthSnapshot> => {
    const providers = await Promise.all([checkOpenAI(), checkNotion(), checkPexels(), checkAnki()])
    return {
        providers: Object.fromEntries(
            providers.map((provider) => [provider.provider, provider])
        ) as ProviderHealthSnapshot['providers']
    }
}
