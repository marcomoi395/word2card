import type { DatabaseRepositories, VocabularyInput, VocabularyUpdate, VocabularyRecord } from '../database'

export class CollectionService {
    constructor(private readonly database: DatabaseRepositories) {}

    list(): VocabularyRecord[] {
        return this.database.vocabulary.list()
    }

    create(word: string): VocabularyRecord {
        const result = this.database.vocabulary.create({ word: word.trim() } satisfies VocabularyInput)
        if (!result.inserted || !result.record) throw new Error('word already exists')
        return result.record
    }

    update(id: string, changes: VocabularyUpdate): VocabularyRecord {
        if (!id.trim()) throw new Error('record id is required')
        const record = this.database.vocabulary.update(id, changes)
        if (!record) throw new Error('record not found')
        return record
    }

    delete(ids: string[]): number {
        return this.database.vocabulary.delete(ids)
    }
}
