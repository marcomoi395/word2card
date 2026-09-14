export const DEFAULT_IMPORTED_DECK_PREFIX = 'Vocabulary::Imported'

const datePart = (value: number): string => String(value).padStart(2, '0')

export const defaultImportedDeckName = (date: Date = new Date()): string =>
    `${DEFAULT_IMPORTED_DECK_PREFIX}::${date.getFullYear()}-${datePart(date.getMonth() + 1)}-${datePart(date.getDate())}`

export const resolveImportedDeckName = (deckInput: string, date: Date = new Date()): string =>
    deckInput.trim() || defaultImportedDeckName(date)
