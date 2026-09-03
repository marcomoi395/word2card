import fs from 'fs'
import path from 'path'
import { createLogger } from '../../shared/logger'

const logger = createLogger('main.read_file')

export const validateTextFilePath = async (filePath: string): Promise<boolean> => {
    if (!path.isAbsolute(filePath) || path.extname(filePath).toLowerCase() !== '.txt') {
        logger.debug('text_file_path_rejected', { reason: 'invalid_extension_or_path' })
        return false
    }

    try {
        const stats = await fs.promises.stat(filePath)
        const valid = stats.isFile()
        logger.debug(valid ? 'text_file_path_validated' : 'text_file_path_rejected', {
            reason: valid ? undefined : 'not_a_file'
        })
        return valid
    } catch {
        logger.debug('text_file_path_rejected', {
            reason: 'stat_failed',
            error: new Error('file_stat_failed')
        })
        return false
    }
}

export const readFileContent = async (filePath: string) => {
    try {
        const res = await fs.promises.readFile(filePath, 'utf-8')
        const lines = res
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
        logger.info('text_file_read', { lineCount: lines.length })
        return lines
    } catch {
        logger.error('text_file_read_failed', { error: new Error('file_read_failed') })
        return null
    }
}
