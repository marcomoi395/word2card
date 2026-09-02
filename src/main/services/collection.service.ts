import type { DatabaseRepositories, VocabularyUpdate, VocabularyRecord } from '../database'

export class CollectionService {
    constructor(private readonly database: DatabaseRepositories) {}

    list(): VocabularyRecord[] {
        return this.database.vocabulary.list()
    }

    update(id: string, changes: VocabularyUpdate): VocabularyRecord {
        if (!id.trim()) throw new Error('record id is required')
        const record = this.database.vocabulary.update(id, changes)
        if (!record) throw new Error('record not found')
        return record
    }
}
