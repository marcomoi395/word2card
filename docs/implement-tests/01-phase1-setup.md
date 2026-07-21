# Phase 1: Setup Testing Infrastructure

`electron-vite` dùng `electron.vite.config.ts` để bundle ứng dụng. File này **không** nhận thức được Vitest. Vì vậy, Vitest cần file cấu hình **riêng biệt** (`vitest.config.ts`) đặt ở root — hai config tồn tại **song song, không conflict**, vì `electron-vite` chạy qua lệnh `electron-vite dev/build`, còn Vitest chạy qua lệnh `vitest` hoàn toàn tách biệt.

---

## 1. Cài đặt Dependencies

```bash
npm install -D vitest @vitest/coverage-v8 jsdom
```

- `vitest` — test runner, tương thích native với Vite config pipeline.
- `@vitest/coverage-v8` — coverage provider dựa trên V8 (built-in Node, không cần Babel).
- `jsdom` — giả lập browser DOM cho Renderer tests.

---

## 2. `vitest.config.ts` (tách biệt, không chỉnh `electron.vite.config.ts`)

Tạo file `vitest.config.ts` tại root — **không** merge vào `electron.vite.config.ts`:

```typescript
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
        'src/**/*.test.ts',
        'src/**/index.ts',
      ],
      all: true,
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 95,
        statements: 95,
      },
    },
  },
})
```

> `electron.vite.config.ts` giữ nguyên 100%. Hai config hoàn toàn độc lập.

---

## 3. `tsconfig.json` cho Test

Thêm `test/**` vào `include` trong `tsconfig.node.json`:

```json
{
  "include": ["src/**/*", "test/**/*"]
}
```

Hoặc tạo `tsconfig.test.json` riêng:

```json
{
  "extends": "./tsconfig.node.json",
  "include": ["src/**/*", "test/**/*"],
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

---

## 4. Global Setup & Electron Mocks (`test/setup.ts`)

Tạo thư mục `test/` và file `test/setup.ts`. Chạy **trước mọi test file**. Mock các module Electron không chạy được ngoài Electron runtime:

```typescript
import { vi, afterEach } from 'vitest'

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => `/mock/path/${name}`),
    isPackaged: false,
  },
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
    removeHandler: vi.fn(),
  },
  ipcRenderer: {
    invoke: vi.fn(),
    send: vi.fn(),
    on: vi.fn(),
  },
  dialog: {
    showOpenDialog: vi.fn(),
  },
  BrowserWindow: vi.fn(() => ({
    minimize: vi.fn(),
    close: vi.fn(),
  })),
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => false),
    encryptString: vi.fn((s: string) => Buffer.from(s)),
    decryptString: vi.fn((b: Buffer) => b.toString()),
  },
}))

vi.mock('electron-store', () => ({
  default: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}))

afterEach(() => {
  vi.clearAllMocks()
})
```

---

## 5. Cập nhật `package.json` Scripts

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

---

## 6. Migrate `notion-sync.test.ts` hiện tại

File hiện tại dùng `node:test` và `assert`. Phải chuyển sang Vitest:

| Cũ (`node:test`) | Mới (Vitest) |
|---|---|
| `import test from 'node:test'` | Xóa — Vitest inject `describe`/`it` qua `globals: true` |
| `import assert from 'node:assert/strict'` | Xóa |
| `test('...', () => { ... })` | `it('...', () => { ... })` |
| `assert.equal(a, b)` | `expect(a).toBe(b)` |
| `assert.deepEqual(a, b)` | `expect(a).toEqual(b)` |

**Ví dụ sau migrate:**

```typescript
// Trước
import test from 'node:test'
import assert from 'node:assert/strict'

test('resolveNotionDeckName uses datasource name when input is blank', () => {
  assert.equal(
    resolveNotionDeckName('', 'Cambridge IELTS', new Date('2026-05-06T09:00:00.000Z')),
    'Vocabulary::Imported::Cambridge IELTS::2026-05-06'
  )
})

// Sau
describe('resolveNotionDeckName', () => {
  it('uses datasource name when input is blank', () => {
    expect(
      resolveNotionDeckName('', 'Cambridge IELTS', new Date('2026-05-06T09:00:00.000Z'))
    ).toBe('Vocabulary::Imported::Cambridge IELTS::2026-05-06')
  })
})
```

File sau migrate đặt tại: `src/main/helper/__tests__/notion-sync.test.ts`
