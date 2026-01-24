import fs from 'fs'

export const readFileContent = async (path: string) => {
    try {
        const res = await fs.promises.readFile(path, 'utf-8')
        return res
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
    } catch (e) {
        console.error('Error reading file:', e)
        return null
    }
}
