import { app } from 'electron'
import { join } from 'path'

export const AUDIO_DIR = join(app.getPath('userData'), 'audio')
export const MODEL_NAME = 'English'
export const QUIZ_MODEL_NAME = 'Quiz'
