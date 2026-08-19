import fs from 'fs'
import path from 'path'

export const validateTextFilePath = async (filePath: string): Promise<boolean> => {
    if (!path.isAbsolute(filePath) || path.extname(filePath).toLowerCase() !== '.txt') {
        return false
    }

    try {
        const stats = await fs.promises.stat(filePath)
        return stats.isFile()
    } catch {
        return false
    }
}

export const readFileContent = async (filePath: string) => {
    try {
        const res = await fs.promises.readFile(filePath, 'utf-8')
        return res
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
    } catch (e) {
        console.error('Error reading file:', e)
        return null
    }
}
