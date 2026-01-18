export interface TokenMap {
    [key: string]: string
}

export class State {
    private static instance: State
    private _tokens: TokenMap = {}

    private constructor() {
        // Private constructor to prevent direct instantiation
    }

    public static getInstance(): State {
        if (!State.instance) {
            State.instance = new State()
        }
        return State.instance
    }

    public setToken(type: string, value: string) {
        this._tokens[type] = value
    }

    public setAllTokens(tokens: TokenMap) {
        this._tokens = { ...this._tokens, ...tokens }
    }

    public getToken(type: string): string | undefined {
        return this._tokens[type]
    }

    public getMissingTokens(requiredTypes: string[]): string[] {
        return requiredTypes.filter((type) => !this._tokens[type])
    }

    public removeToken(type: string) {
        delete this._tokens[type]
    }
}

export default State.getInstance()
