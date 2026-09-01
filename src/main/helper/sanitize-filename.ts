/**
 * Sanitizes a word or phrase to be used as a safe filename
 * Replaces spaces with hyphens and removes special characters
 *
 * @param text - The word or phrase to sanitize
 * @returns A filesystem-safe filename (without extension)
 *
 * @example
 * sanitizeFilename("take into account") // "take-into-account"
 * sanitizeFilename("it's raining") // "its-raining"
 * sanitizeFilename("cost-effective") // "cost-effective"
 */
export function sanitizeFilename(text: string): string {
    return (
        text
            .toLowerCase()
            .trim()
            // Replace spaces with hyphens
            .replace(/\s+/g, '-')
            // Remove apostrophes
            .replace(/'/g, '')
            // Remove quotes
            .replace(/["]/g, '')
            // Replace other special chars with hyphens
            .replace(/[^\w-]/g, '-')
            // Remove multiple consecutive hyphens
            .replace(/-+/g, '-')
            // Remove leading/trailing hyphens
            .replace(/^-|-$/g, '')
    )
}
