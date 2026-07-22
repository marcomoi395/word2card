/**
 * Singleton Reset Helpers for Test Isolation
 * 
 * These helpers ensure complete singleton cleanup between test runs,
 * preventing state contamination across test files.
 * 
 * IMPORTANT: These functions accept the singleton class as a parameter
 * to avoid import timing issues with mocked modules. Always pass the
 * class you imported in your test file.
 * 
 * Usage:
 *   import { resetState } from '../../../test/helpers/singleton-reset'
 *   import { State } from '../state'
 * 
 *   beforeEach(() => {
 *     resetState(State)
 *     vi.clearAllMocks()
 *   })
 */

// Type helper for accessing private singleton properties
type SingletonClass = Record<string, unknown>

/**
 * Reset a singleton instance by setting its property to a value.
 * 
 * @param singletonClass - The singleton class to reset
 * @param property - The property name to reset (e.g., 'instance')
 * @param value - The value to set (undefined or null)
 */
export function resetSingletonInstance(
  singletonClass: unknown,
  property: string,
  value: undefined | null = undefined
): void {
  const cls = singletonClass as SingletonClass
  cls[property] = value
}

/**
 * Reset State singleton - pass your imported State class.
 */
export function resetState(StateClass: unknown): void {
  resetSingletonInstance(StateClass, 'instance', undefined)
}

/**
 * Reset SecretManager singleton - pass your imported SecretManager class.
 */
export function resetSecretManager(SecretManagerClass: unknown): void {
  resetSingletonInstance(SecretManagerClass, 'instance', undefined)
}

/**
 * Reset NotionService singleton - pass your imported NotionService class.
 */
export function resetNotionService(NotionServiceClass: unknown): void {
  resetSingletonInstance(NotionServiceClass, 'instance', null)
  resetSingletonInstance(NotionServiceClass, 'currentToken', null)
}

/**
 * Reset OpenAIService singleton - pass your imported OpenAIService class.
 */
export function resetOpenAIService(OpenAIServiceClass: unknown): void {
  resetSingletonInstance(OpenAIServiceClass, 'instance', null)
  resetSingletonInstance(OpenAIServiceClass, 'currentKey', null)
}

/**
 * Reset SpeechService singleton - pass your imported SpeechService class.
 */
export function resetSpeechService(SpeechServiceClass: unknown): void {
  resetSingletonInstance(SpeechServiceClass, 'instance', null)
  resetSingletonInstance(SpeechServiceClass, 'currentKey', null)
}

/**
 * Reset all singleton instances - pass all your imported classes.
 */
export function resetAllSingletons(singletons: {
  State?: unknown
  SecretManager?: unknown
  NotionService?: unknown
  OpenAIService?: unknown
  SpeechService?: unknown
}): void {
  if (singletons.State) resetState(singletons.State)
  if (singletons.SecretManager) resetSecretManager(singletons.SecretManager)
  if (singletons.NotionService) resetNotionService(singletons.NotionService)
  if (singletons.OpenAIService) resetOpenAIService(singletons.OpenAIService)
  if (singletons.SpeechService) resetSpeechService(singletons.SpeechService)
}

/**
 * Verify singleton instances are properly reset.
 * Pass the classes you want to verify.
 */
export function verifySingletonsReset(singletons: {
  State?: unknown
  SecretManager?: unknown
  NotionService?: unknown
  OpenAIService?: unknown
  SpeechService?: unknown
}): void {
  const failures: string[] = []

  if (singletons.State) {
    const cls = singletons.State as SingletonClass
    if (cls['instance'] !== undefined) {
      failures.push('State.instance is not undefined')
    }
  }

  if (singletons.SecretManager) {
    const cls = singletons.SecretManager as SingletonClass
    if (cls['instance'] !== undefined) {
      failures.push('SecretManager.instance is not undefined')
    }
  }

  if (singletons.NotionService) {
    const cls = singletons.NotionService as SingletonClass
    if (cls['instance'] !== null) {
      failures.push('NotionService.instance is not null')
    }
    if (cls['currentToken'] !== null) {
      failures.push('NotionService.currentToken is not null')
    }
  }

  if (singletons.OpenAIService) {
    const cls = singletons.OpenAIService as SingletonClass
    if (cls['instance'] !== null) {
      failures.push('OpenAIService.instance is not null')
    }
    if (cls['currentKey'] !== null) {
      failures.push('OpenAIService.currentKey is not null')
    }
  }

  if (singletons.SpeechService) {
    const cls = singletons.SpeechService as SingletonClass
    if (cls['instance'] !== null) {
      failures.push('SpeechService.instance is not null')
    }
    if (cls['currentKey'] !== null) {
      failures.push('SpeechService.currentKey is not null')
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Singleton cleanup verification failed:\n  - ${failures.join('\n  - ')}`
    )
  }
}
