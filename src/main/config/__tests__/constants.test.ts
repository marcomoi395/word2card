import { describe, it, expect, vi } from 'vitest'

vi.mock('electron', () => ({
    app: {
        getPath: vi.fn().mockReturnValue('/mock/user/data')
    }
}))

import { MODEL_NAME, QUIZ_MODEL_NAME } from '../constants'

describe('constants', () => {
    it('exports MODEL_NAME as English', () => {
        expect(MODEL_NAME).toBe('English')
    })

    it('exports QUIZ_MODEL_NAME as Quiz', () => {
        expect(QUIZ_MODEL_NAME).toBe('Quiz')
    })
})
