import { describe, it, expect, vi } from 'vitest'

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/mock/user/data'),
  },
}))

import { AUDIO_DIR, MODEL_NAME, QUIZ_MODEL_NAME } from '../constants'
import { join } from 'path'

describe('constants', () => {
  it('exports AUDIO_DIR based on userData path', () => {
    expect(AUDIO_DIR).toBe(join('/mock/user/data', 'audio'))
  })

  it('exports MODEL_NAME as English', () => {
    expect(MODEL_NAME).toBe('English')
  })

  it('exports QUIZ_MODEL_NAME as Quiz', () => {
    expect(QUIZ_MODEL_NAME).toBe('Quiz')
  })
})
