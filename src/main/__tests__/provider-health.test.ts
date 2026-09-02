import { beforeEach, describe, expect, it, vi } from 'vitest'
import { checkProviderHealth } from '../provider-health'
import { getRuntimeSetting } from '../state/runtime'
import { checkAnkiConnect } from '../anki-connect'

vi.mock('../state/runtime', () => ({ getRuntimeSetting: vi.fn() }))
vi.mock('../anki-connect', () => ({ checkAnkiConnect: vi.fn() }))

describe('provider health', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(getRuntimeSetting).mockImplementation(
            (key) =>
                ({
                    openaiApiKey: 'openai-key',
                    notionToken: 'notion-token',
                    notionDatabaseId: 'database-id',
                    pexelsToken: 'pexels-key'
                })[key]
        )
        vi.mocked(checkAnkiConnect).mockResolvedValue(true)
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })))
    })

    it('reports connected providers with stable provider keys', async () => {
        const health = await checkProviderHealth()
        expect(health.providers.openai.state).toBe('connected')
        expect(health.providers.notion.state).toBe('connected')
        expect(health.providers.pexels.state).toBe('connected')
        expect(health.providers.anki.state).toBe('connected')
    })

    it('distinguishes missing configuration from invalid credentials', async () => {
        vi.mocked(getRuntimeSetting).mockImplementation((key) =>
            key === 'openaiApiKey'
                ? undefined
                : key === 'notionToken'
                  ? 'token'
                  : key === 'notionDatabaseId'
                    ? 'db'
                    : undefined
        )
        vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 401 }))
        const health = await checkProviderHealth()
        expect(health.providers.openai.state).toBe('not_configured')
        expect(health.providers.notion.state).toBe('invalid')
        expect(health.providers.pexels.state).toBe('not_configured')
    })

    it('reports network failures as unreachable without rejecting', async () => {
        vi.mocked(fetch).mockRejectedValue(new Error('offline'))
        vi.mocked(checkAnkiConnect).mockResolvedValue(false)
        const health = await checkProviderHealth()
        expect(health.providers.openai.state).toBe('unreachable')
        expect(health.providers.notion.state).toBe('unreachable')
        expect(health.providers.pexels.state).toBe('unreachable')
        expect(health.providers.anki.state).toBe('unreachable')
    })
})
