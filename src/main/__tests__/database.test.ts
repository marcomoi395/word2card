import { describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { createDatabase } from '../database'

describe('SQLite database', () => {
    it('initializes a rerunnable schema and stores normalized vocabulary records', () => {
        const database = new Database(':memory:')
        const db = createDatabase(database)

        db.migrate()
        db.migrate()
        const first = db.vocabulary.create({ word: '  Hello  ' })
        const duplicate = db.vocabulary.create({ word: 'hello' })

        expect(first.inserted).toBe(true)
        expect(first.record).toMatchObject({
            id: expect.any(String),
            word: 'Hello',
            normalizedWord: 'hello',
            deckName: 'Default'
        })
        expect(duplicate.inserted).toBe(false)
        expect(db.vocabulary.list()).toHaveLength(1)
    })

    it('adds Default as the deck for vocabulary stored before the deck migration', () => {
        const database = new Database(':memory:')
        database.exec(`
            CREATE TABLE vocabulary (
                id TEXT PRIMARY KEY, word TEXT NOT NULL, normalized_word TEXT NOT NULL UNIQUE,
                source TEXT NOT NULL DEFAULT 'file', source_reference TEXT, part_of_speech TEXT,
                cloze TEXT, example TEXT, vietnamese TEXT, ipa TEXT, meaning TEXT, image_url TEXT,
                image_provider TEXT, generation_status TEXT NOT NULL DEFAULT 'pending',
                generation_error TEXT, anki_status TEXT NOT NULL DEFAULT 'not_submitted',
                anki_error TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            INSERT INTO vocabulary (id, word, normalized_word) VALUES ('old-1', 'old', 'old');
        `)

        const db = createDatabase(database)
        db.migrate()

        expect(db.vocabulary.get('old-1')).toMatchObject({ deckName: 'Default' })
    })

    it('rolls back repository writes when a transaction throws', () => {
        const database = new Database(':memory:')
        const db = createDatabase(database)
        db.migrate()

        expect(() =>
            db.transaction(() => {
                db.vocabulary.create({ word: 'rollback' })
                throw new Error('stop')
            })
        ).toThrow('stop')
        expect(db.vocabulary.list()).toHaveLength(0)
    })

    it('lists the most recently imported vocabulary first', () => {
        const database = new Database(':memory:')
        const db = createDatabase(database)
        db.migrate()
        const older = db.vocabulary.create({ word: 'older' }).record!
        const newer = db.vocabulary.create({ word: 'newer' }).record!
        database
            .prepare('UPDATE vocabulary SET created_at = ? WHERE id = ?')
            .run('2026-09-13 00:00:00', older.id)
        database
            .prepare('UPDATE vocabulary SET created_at = ? WHERE id = ?')
            .run('2026-09-14 00:00:00', newer.id)

        expect(db.vocabulary.list().map((record) => record.word)).toEqual(['newer', 'older'])
    })
})
