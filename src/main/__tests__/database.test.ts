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
            normalizedWord: 'hello'
        })
        expect(duplicate.inserted).toBe(false)
        expect(db.vocabulary.list()).toHaveLength(1)
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
})
