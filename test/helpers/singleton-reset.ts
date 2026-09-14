// Type helper for accessing private singleton properties
type SingletonClass = Record<string, unknown>

export function resetSingletonInstance(
    singletonClass: unknown,
    property: string,
    value: undefined | null = undefined
): void {
    const cls = singletonClass as SingletonClass
    cls[property] = value
}

export function resetSecretManager(SecretManagerClass: unknown): void {
    resetSingletonInstance(SecretManagerClass, 'instance', undefined)
}

export function resetNotionService(NotionServiceClass: unknown): void {
    resetSingletonInstance(NotionServiceClass, 'instance', null)
    resetSingletonInstance(NotionServiceClass, 'currentToken', null)
}

export function resetOpenAIService(OpenAIServiceClass: unknown): void {
    resetSingletonInstance(OpenAIServiceClass, 'instance', null)
    resetSingletonInstance(OpenAIServiceClass, 'currentKey', null)
}

export function verifySingletonsReset(singletons: {
    SecretManager?: unknown
    NotionService?: unknown
    OpenAIService?: unknown
}): void {
    const failures: string[] = []

    if (singletons.SecretManager) {
        const cls = singletons.SecretManager as SingletonClass
        if (cls['instance'] !== undefined) failures.push('SecretManager.instance is not undefined')
    }

    if (singletons.NotionService) {
        const cls = singletons.NotionService as SingletonClass
        if (cls['instance'] !== null) failures.push('NotionService.instance is not null')
        if (cls['currentToken'] !== null) failures.push('NotionService.currentToken is not null')
    }

    if (singletons.OpenAIService) {
        const cls = singletons.OpenAIService as SingletonClass
        if (cls['instance'] !== null) failures.push('OpenAIService.instance is not null')
        if (cls['currentKey'] !== null) failures.push('OpenAIService.currentKey is not null')
    }

    if (failures.length > 0) {
        throw new Error(`Singleton cleanup verification failed:\n  - ${failures.join('\n  - ')}`)
    }
}
