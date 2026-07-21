import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileContent } from '../readFile'
import fs from 'fs'

// Mock fs module
vi.mock('fs', () => ({
  default: {
    promises: {
      readFile: vi.fn(),
    },
  },
}))

describe('readFile', () => {
  const mockReadFile = vi.mocked(fs.promises.readFile)

  beforeEach(() => {
    mockReadFile.mockReset()
  })

  describe('happy path', () => {
    it('returns array of trimmed lines from valid file', async () => {
      mockReadFile.mockResolvedValue('bank\nriver\neffective\n')

      const result = await readFileContent('/path/to/file.txt')

      expect(result).toEqual(['bank', 'river', 'effective'])
      expect(mockReadFile).toHaveBeenCalledWith('/path/to/file.txt', 'utf-8')
    })

    it('trims whitespace from lines: "  bank  \\n" becomes "bank"', async () => {
      mockReadFile.mockResolvedValue('  bank  \n  river  \n')

      const result = await readFileContent('/path/to/file.txt')

      expect(result).toEqual(['bank', 'river'])
    })

    it('filters out blank lines', async () => {
      mockReadFile.mockResolvedValue('bank\n\nriver\n\neffective\n')

      const result = await readFileContent('/path/to/file.txt')

      expect(result).toEqual(['bank', 'river', 'effective'])
    })

    it('returns empty array for file with only blank lines', async () => {
      mockReadFile.mockResolvedValue('\n\n\n\n')

      const result = await readFileContent('/path/to/file.txt')

      expect(result).toEqual([])
    })

    it('returns empty array for completely empty file', async () => {
      mockReadFile.mockResolvedValue('')

      const result = await readFileContent('/path/to/file.txt')

      expect(result).toEqual([])
    })
  })

  describe('error handling', () => {
    it('returns null when file does not exist (ENOENT)', async () => {
      const error = new Error('ENOENT: no such file or directory')
      ;(error as any).code = 'ENOENT'
      mockReadFile.mockRejectedValue(error)

      const result = await readFileContent('/nonexistent/file.txt')

      expect(result).toBeNull()
    })

    it('returns null when permission denied (EACCES)', async () => {
      const error = new Error('EACCES: permission denied')
      ;(error as any).code = 'EACCES'
      mockReadFile.mockRejectedValue(error)

      const result = await readFileContent('/restricted/file.txt')

      expect(result).toBeNull()
    })

    it('returns null for any other error without throwing', async () => {
      mockReadFile.mockRejectedValue(new Error('Unknown error'))

      const result = await readFileContent('/path/to/file.txt')

      expect(result).toBeNull()
    })
  })
})
