export interface ModelFlashcard {
    modelName: string
    css: string
    isCloze: boolean
    inOrderFields: string[]
    cardTemplates: CardTemplate[]
}

export interface CardTemplate {
    Name: string
    Front: string
    Back: string
}
