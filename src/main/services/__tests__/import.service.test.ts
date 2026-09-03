import { beforeEach, describe, expect, it, vi } from 'vitest'
import Database from 'better-sqlite3'
import { createDatabase } from '../../database'
import { ImportService, setImportDatabase } from '../import.service'
import { readFileContent } from '../../helper/readFile'
import { checkAnkiConnect } from '../../anki-connect'

vi.mock('../../helper/readFile', () => ({ readFileContent: vi.fn() }))
vi.mock('../../anki-connect', () => ({ checkAnkiConnect: vi.fn() }))
vi.mock('../../notion', () => ({ NotionService: { getPages: vi.fn() } }))
vi.mock('../../state/runtime', () => ({
    getRuntimeState: () => ({ updateRuntimeSettings: vi.fn(() => true) })
}))

describe('ImportService', () => {
    let database: ReturnType<typeof createDatabase>
    beforeEach(() => {
        vi.clearAllMocks()
        database = createDatabase(new Database(':memory:'))
        database.migrate()
        setImportDatabase(database)
        vi.mocked(checkAnkiConnect).mockResolvedValue(false)
    })

    it('persists unique file words and reports duplicates without provider calls', async () => {
        vi.mocked(readFileContent).mockResolvedValue([' Hello ', 'hello', 'world'])
        const result = await ImportService.handleImportRequest({
            type: 'FILE_IMPORT',
            payload: {
                filePath: '/tmp/words.txt',
                deck: '',
                options: { quiz: false, flashcard: false }
            }
        })
        expect(result).toMatchObject({
            status: 'success',
            data: { inserted: 2, skipped: 1, failed: 0 }
        })
        expect(database.vocabulary.list()).toHaveLength(2)
        expect(
            database.vocabulary.list().every((record) => record.generationStatus === 'pending')
        ).toBe(true)
        expect(checkAnkiConnect).not.toHaveBeenCalled()
    })

    it('imports successfully when OpenAI and Anki are unavailable', async () => {
        vi.mocked(readFileContent).mockResolvedValue(['pending'])
        const result = await ImportService.handleImportRequest({
            type: 'FILE_IMPORT',
            payload: {
                filePath: '/tmp/words.txt',
                deck: '',
                options: { quiz: false, flashcard: false }
            }
        })
        expect(result.status).toBe('success')
        expect(database.vocabulary.list()[0].generationStatus).toBe('pending')
    })
})
