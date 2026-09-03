import Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { createLogger } from '../shared/logger'

export type SourceType = 'file' | 'notion'
export type GenerationStatus = 'pending' | 'generating' | 'ready' | 'failed'
export type AnkiStatus = 'not_submitted' | 'submitted' | 'failed'

export interface VocabularyInput {
    word: string
    source?: SourceType
    sourceReference?: string | null
    partOfSpeech?: string | null
    cloze?: string | null
    example?: string | null
    vietnamese?: string | null
    ipa?: string | null
    meaning?: string | null
    imageUrl?: string | null
    imageProvider?: string | null
    audio?: string | null
}

export interface VocabularyUpdate {
    word?: string
    source?: SourceType
    sourceReference?: string | null
    partOfSpeech?: string | null
    cloze?: string | null
    example?: string | null
    vietnamese?: string | null
    ipa?: string | null
    meaning?: string | null
    imageUrl?: string | null
    imageProvider?: string | null
    audio?: string | null
    generationStatus?: GenerationStatus
    generationError?: string | null
    ankiStatus?: AnkiStatus
    ankiError?: string | null
}

export interface VocabularyRecord {
    id: string
    word: string
    normalizedWord: string
    source: SourceType
    sourceReference: string | null
    partOfSpeech: string | null
    cloze: string | null
    example: string | null
    vietnamese: string | null
    ipa: string | null
    meaning: string | null
    imageUrl: string | null
    imageProvider: string | null
    audio: string | null
    generationStatus: GenerationStatus
    generationError: string | null
    ankiStatus: AnkiStatus
    ankiError: string | null
    createdAt: string
    updatedAt: string
}

export interface DatabaseRepositories {
    vocabulary: {
        create(input: VocabularyInput): { inserted: boolean; record: VocabularyRecord | null }
        get(id: string): VocabularyRecord | null
        list(): VocabularyRecord[]
        update(id: string, input: VocabularyUpdate): VocabularyRecord | null
    }
    settings: { get(key: string): string | null; set(key: string, value: string): void }
    migrate(): void
    transaction<T>(callback: () => T): T
    close(): void
}
export const OPENAI_DEFAULT_BASE_URL = 'https://api.openai.com/v1'
export const OPENAI_DEFAULT_MODEL = 'gpt-4o-mini'


import type { RuntimeSettings } from './state/model'

const logger = createLogger('main.database')
export interface DatabaseSettingsPersistence {
    load: () => RuntimeSettings
    save: (settings: RuntimeSettings) => boolean
    delete: (key: keyof RuntimeSettings) => boolean
}

export function createDatabaseSettingsPersistence(
    repositories: Pick<DatabaseRepositories, 'settings' | 'transaction'>
): DatabaseSettingsPersistence {
    const keys: (keyof RuntimeSettings)[] = ['openaiApiKey', 'openaiBaseUrl', 'openaiModel']
    return {
        load: () => {
            const settings: RuntimeSettings = {}
            for (const key of keys) {
                const value = repositories.settings.get(key)
                if (value !== null) settings[key] = value
            }
            return settings
        },
        save: (settings) => {
            try {
                repositories.transaction(() => {
                    for (const key of keys) {
                        const value = settings[key]
                        if (value !== undefined) repositories.settings.set(key, value)
                    }
                })
                return true
            } catch (error) {
                logger.error('database_settings_save_failed', { error })
                return false
            }

        },
        delete: (key) => {
            if (!keys.includes(key)) return true
            try {
                repositories.transaction(() => repositories.settings.set(key, ''))
                return true
            } catch (error) {
                logger.error('database_settings_delete_failed', { key: String(key), error })
                return false
            }

        }
    }
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS vocabulary (
 id TEXT PRIMARY KEY, word TEXT NOT NULL, normalized_word TEXT NOT NULL UNIQUE,
 source TEXT NOT NULL DEFAULT 'file', source_reference TEXT, part_of_speech TEXT, cloze TEXT,
 example TEXT, vietnamese TEXT, ipa TEXT, meaning TEXT, image_url TEXT, image_provider TEXT, audio TEXT,
 generation_status TEXT NOT NULL DEFAULT 'pending', generation_error TEXT,
 anki_status TEXT NOT NULL DEFAULT 'not_submitted', anki_error TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
`

function toRecord(row: Record<string, unknown>): VocabularyRecord {
    return {
        id: row.id as string,
        word: row.word as string,
        normalizedWord: row.normalized_word as string,
        source: row.source as SourceType,
        sourceReference: row.source_reference as string | null,
        partOfSpeech: row.part_of_speech as string | null,
        cloze: row.cloze as string | null,
        example: row.example as string | null,
        vietnamese: row.vietnamese as string | null,
        ipa: row.ipa as string | null,
        meaning: row.meaning as string | null,
        imageUrl: row.image_url as string | null,
        imageProvider: row.image_provider as string | null,
        audio: row.audio as string | null,
        generationStatus: row.generation_status as GenerationStatus,
        generationError: row.generation_error as string | null,
        ankiStatus: row.anki_status as AnkiStatus,
        ankiError: row.anki_error as string | null,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string
    }
}

export function createDatabase(database: Database.Database): DatabaseRepositories {
    const migrate = (): void => {
        database.exec('BEGIN')
        try {
            database.exec(SCHEMA)
            database.prepare('INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)').run(1)
            database.exec('COMMIT')
        } catch (error) {
            logger.error('database_migration_failed', { error })
            database.exec('ROLLBACK')
            throw error
        }

    }
    const get = (id: string): VocabularyRecord | null => {
        const row = database.prepare('SELECT * FROM vocabulary WHERE id = ?').get(id) as
            Record<string, unknown> | undefined
        return row ? toRecord(row) : null
    }
    return {
        migrate,
        transaction: <T>(callback: () => T): T => database.transaction(callback)(),
        close: () => database.close(),
        vocabulary: {
            create: (input) => {
                const word = input.word.trim()
                if (!word) throw new Error('word is required')
                const id = randomUUID()
                const result = database
                    .prepare(
                        `INSERT OR IGNORE INTO vocabulary (id, word, normalized_word, source, source_reference, part_of_speech, cloze, example, vietnamese, ipa, meaning, image_url, image_provider, audio) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                    )
                    .run(
                        id,
                        word,
                        word.toLocaleLowerCase(),
                        input.source ?? 'file',
                        input.sourceReference ?? null,
                        input.partOfSpeech ?? null,
                        input.cloze ?? null,
                        input.example ?? null,
                        input.vietnamese ?? null,
                        input.ipa ?? null,
                        input.meaning ?? null,
                        input.imageUrl ?? null,
                        input.imageProvider ?? null,
                        input.audio ?? null
                    )
                return result.changes === 0
                    ? { inserted: false, record: null }
                    : { inserted: true, record: get(id) }
            },
            get,
            list: () =>
                (
                    database
                        .prepare('SELECT * FROM vocabulary ORDER BY created_at, id')
                        .all() as Record<string, unknown>[]
                ).map(toRecord),
            update: (id, input) => {
                if (!get(id)) return null
                const map: Record<string, string> = {
                    word: 'word',
                    source: 'source',
                    sourceReference: 'source_reference',
                    partOfSpeech: 'part_of_speech',
                    cloze: 'cloze',
                    example: 'example',
                    vietnamese: 'vietnamese',
                    ipa: 'ipa',
                    meaning: 'meaning',
                    imageUrl: 'image_url',
                    imageProvider: 'image_provider',
                    audio: 'audio',
                    generationStatus: 'generation_status',
                    generationError: 'generation_error',
                    ankiStatus: 'anki_status',
                    ankiError: 'anki_error'
                }
                const keys = Object.keys(input).filter(
                    (key) => (input as Record<string, unknown>)[key] !== undefined
                )
                if (keys.length === 0) return get(id)
                const values = keys.map((key) => {
                    const value = (input as Record<string, unknown>)[key]
                    if (key === 'word') {
                        if (typeof value !== 'string' || !value.trim())
                            throw new Error('word is required')
                        return value.trim()
                    }
                    return value ?? null
                })
                const assignments = keys.map((key) => `${map[key]} = ?`)
                if (keys.includes('word')) {
                    assignments.push('normalized_word = ?')
                    values.push((values[keys.indexOf('word')] as string).toLocaleLowerCase())
                }
                assignments.push('updated_at = CURRENT_TIMESTAMP')
                database
                    .prepare(`UPDATE vocabulary SET ${assignments.join(', ')} WHERE id = ?`)
                    .run(...values, id)
                return get(id)
            }
        },
        settings: {
            get: (key) =>
                (
                    database.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
                        { value?: string } | undefined
                )?.value ?? null,
            set: (key, value) => {
                database
                    .prepare(
                        `INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP`
                    )
                    .run(key, value)
            }
        }
    }
}

export function openDatabase(path: string): DatabaseRepositories {
    const repositories = createDatabase(new Database(path))
    repositories.migrate()
    return repositories
}
