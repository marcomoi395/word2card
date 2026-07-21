import { describe, it, expect, vi, beforeEach } from 'vitest'
import { searchImagePexels } from '../pexels'

// Mock pexels module
vi.mock('pexels', () => ({
  createClient: vi.fn(),
}))

import { createClient } from 'pexels'

describe('Pexels service', () => {
  let mockPhotosSearch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockPhotosSearch = vi.fn()
    vi.mocked(createClient).mockReturnValue({
      photos: {
        search: mockPhotosSearch,
      },
    } as any)
  })

  describe('happy path', () => {
    it('returns image URL when query finds results', async () => {
      mockPhotosSearch.mockResolvedValue({
        photos: [
          {
            src: {
              medium: 'https://images.pexels.com/photos/123/photo.jpg',
            },
          },
        ],
      })

      const result = await searchImagePexels('test-token', 'nature')

      expect(result).toBe('https://images.pexels.com/photos/123/photo.jpg')
      expect(createClient).toHaveBeenCalledWith('test-token')
      expect(mockPhotosSearch).toHaveBeenCalledWith({
        query: 'nature',
        per_page: 1,
        orientation: 'landscape',
      })
    })

    it('returns first photo when multiple results exist', async () => {
      mockPhotosSearch.mockResolvedValue({
        photos: [
          {
            src: {
              medium: 'https://images.pexels.com/photos/first.jpg',
            },
          },
          {
            src: {
              medium: 'https://images.pexels.com/photos/second.jpg',
            },
          },
        ],
      })

      const result = await searchImagePexels('test-token', 'landscape')

      expect(result).toBe('https://images.pexels.com/photos/first.jpg')
    })
  })

  describe('no results scenarios', () => {
    it('returns null when photos array is empty', async () => {
      mockPhotosSearch.mockResolvedValue({
        photos: [],
      })

      const result = await searchImagePexels('test-token', 'nonexistent')

      expect(result).toBeNull()
    })

    it('returns null when response does not have photos key (ErrorResponse)', async () => {
      mockPhotosSearch.mockResolvedValue({
        error: 'Rate limit exceeded',
      })

      const result = await searchImagePexels('test-token', 'query')

      expect(result).toBeNull()
    })
  })

  describe('error handling', () => {
    it('returns null when API throws error', async () => {
      mockPhotosSearch.mockRejectedValue(new Error('Network error'))

      const result = await searchImagePexels('test-token', 'query')

      expect(result).toBeNull()
    })

    it('returns null when createClient throws error', async () => {
      vi.mocked(createClient).mockImplementation(() => {
        throw new Error('Invalid token')
      })

      const result = await searchImagePexels('invalid-token', 'query')

      expect(result).toBeNull()
    })

    it('returns null when photos.search throws non-Error object', async () => {
      mockPhotosSearch.mockRejectedValue('string error')

      const result = await searchImagePexels('test-token', 'query')

      expect(result).toBeNull()
    })
  })
})
