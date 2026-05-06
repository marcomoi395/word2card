import type { SecretKey } from '../shared/ipc'

export type TokenMap = Partial<Record<SecretKey, string>>

export class State {
    private static instance: State
    private tokens: TokenMap = {}

    private constructor() {
        // Private constructor to prevent direct instantiation
    }

    public static getInstance(): State {
        if (!State.instance) {
            State.instance = new State()
        }
        return State.instance
    }

    public setToken(type: SecretKey, value: string) {
        this.tokens[type] = value
    }

    public setAllTokens(tokens: TokenMap) {
        this.tokens = { ...this.tokens, ...tokens }
    }

    public getToken(type: SecretKey): string | undefined {
        return this.tokens[type]
    }

    public getMissingTokens(requiredTypes: SecretKey[]): SecretKey[] {
        return requiredTypes.filter((type) => !this.tokens[type])
    }

    public removeToken(type: SecretKey) {
        delete this.tokens[type]
    }
}

export default State.getInstance()
