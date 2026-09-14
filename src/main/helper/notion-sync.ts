export interface NotionSyncTarget {
    pageId: string
    word: string
    deckName: string
}

const normalizeWord = (word: string): string => word.trim().toLowerCase()

export const filterNotionTargetsByWords = (
    targets: NotionSyncTarget[],
    words: string[]
): NotionSyncTarget[] => {
    const remainingCounts = new Map<string, number>()

    for (const word of words) {
        const normalizedWord = normalizeWord(word)
        remainingCounts.set(normalizedWord, (remainingCounts.get(normalizedWord) ?? 0) + 1)
    }

    return targets.filter((target) => {
        const normalizedWord = normalizeWord(target.word)
        const remainingCount = remainingCounts.get(normalizedWord) ?? 0

        if (remainingCount === 0) {
            return false
        }

        remainingCounts.set(normalizedWord, remainingCount - 1)
        return true
    })
}

export const createNotionTargetQueueMap = (
    targets: NotionSyncTarget[]
): Map<string, NotionSyncTarget[]> => {
    const targetsByWord = new Map<string, NotionSyncTarget[]>()

    for (const target of targets) {
        const normalizedWord = normalizeWord(target.word)
        const currentTargets = targetsByWord.get(normalizedWord) ?? []

        currentTargets.push(target)
        targetsByWord.set(normalizedWord, currentTargets)
    }

    return targetsByWord
}

export const shiftNotionTarget = (
    targetsByWord: Map<string, NotionSyncTarget[]>,
    word: string
): NotionSyncTarget | undefined => {
    const normalizedWord = normalizeWord(word)
    const targets = targetsByWord.get(normalizedWord)

    if (!targets || targets.length === 0) {
        return undefined
    }

    const target = targets.shift()
    if (targets.length === 0) {
        targetsByWord.delete(normalizedWord)
    }

    return target
}
