import Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'

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

export interface VocabularyRecord extends VocabularyInput {
    id: string
    normalizedWord: string
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
        list(): VocabularyRecord[]
    }
    settings: { get(key: string): string | null; set(key: string, value: string): void }
    migrate(): void
    transaction<T>(callback: () => T): T
    close(): void
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
            database.exec('ROLLBACK')
            throw error
        }
    }
    return {
        migrate,
        transaction: <T>(callback: () => T): T => database.transaction(callback)(),
        close: () => database.close(),
        vocabulary: {
            create: (input) => {
                const word = input.word.trim()
                if (!word) throw new Error('word is required')
                const result = database
                    .prepare(
                        `INSERT OR IGNORE INTO vocabulary
                    (id, word, normalized_word, source, source_reference, part_of_speech, cloze, example, vietnamese, ipa, meaning, image_url, image_provider, audio)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                    )
                    .run(
                        randomUUID(),
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
                if (result.changes === 0) return { inserted: false, record: null }
                return {
                    inserted: true,
                    record: toRecord(
                        database
                            .prepare('SELECT * FROM vocabulary WHERE rowid = last_insert_rowid()')
                            .get() as Record<string, unknown>
                    )
                }
            },
            list: () =>
                (
                    database
                        .prepare('SELECT * FROM vocabulary ORDER BY created_at, id')
                        .all() as Record<string, unknown>[]
                ).map(toRecord)
        },
        settings: {
            get: (key) =>
                (
                    database.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
                        { value?: string } | undefined
                )?.value ?? null,
            set: (key, value) =>
                database
                    .prepare(
                        `INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP`
                    )
                    .run(key, value)
        }
    }
}

export function openDatabase(path: string): DatabaseRepositories {
    const repositories = createDatabase(new Database(path))
    repositories.migrate()
    return repositories
}
