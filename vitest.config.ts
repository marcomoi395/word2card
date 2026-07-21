import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environmentMatchGlobs: [
      ['src/renderer/**', 'jsdom'],
      ['src/main/**', 'node'],
      ['src/shared/**', 'node'],
    ],
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/index.ts',
        'src/**/__tests__/**',
        'src/**/*.test.ts',
        'src/preload/index.ts',
      ],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 95,
        statements: 95,
      },
    },
  },
})
