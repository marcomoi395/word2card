# Phase 4: IPC Handlers & Renderer UI

Giai đoạn này test lớp biên giữa Main Process (IPC handlers) và Renderer Process (Vanilla TS DOM). **Bắt buộc Phase 3 pass 100% trước.**

**Quy tắc chung:**
- IPC handler tests: môi trường `node`. Mock `electron` (đã có trong `test/setup.ts`), mock Services bằng `vi.mock`.
- Renderer tests: môi trường `jsdom` (tự động qua `environmentMatchGlobs`). Load HTML thật vào JSDOM.
- Không test styling hay layout — chỉ test behavior, DOM state, và IPC calls.

---

## 1. `window.handler.ts` — Window Controls

**File test:** `src/main/ipc/handlers/__tests__/window.handler.test.ts`
**Mock:** `electron` (`BrowserWindow`, `ipcMain.on`)

- ✅ `registerWindowHandlers` đăng ký `ipcMain.on(windowMinimize, ...)`
- ✅ `registerWindowHandlers` đăng ký `ipcMain.on(windowClose, ...)`
- ✅ Trigger event `windowMinimize` → `mainWindow.minimize()` được gọi
- ✅ Trigger event `windowClose` → `mainWindow.close()` được gọi

> **Cách test event trigger:** Dùng `vi.spyOn` trên `ipcMain.on`, lấy callback đã đăng ký, gọi thủ công.

```typescript
// Ví dụ pattern
const handlers: Record<string, () => void> = {}
vi.spyOn(ipcMain, 'on').mockImplementation((channel, handler) => {
  handlers[channel] = handler as () => void
  return ipcMain
})
registerWindowHandlers(mockWindow)
handlers['window-minimize']()
expect(mockWindow.minimize).toHaveBeenCalled()
```

---

## 2. `file.handler.ts` — File Dialog

**File test:** `src/main/ipc/handlers/__tests__/file.handler.test.ts`
**Mock:** `electron` (`dialog.showOpenDialog`, `ipcMain.handle`)

- ✅ `result.canceled = false`, `filePaths = ['/path/file.txt']` → `success({ filePath: '/path/file.txt' })`
- ✅ `result.canceled = true` → `success({ filePath: null })`
- ✅ `filePaths = []` (không chọn dù không cancel) → `success({ filePath: null })`
- ❌ `dialog.showOpenDialog` throw `Error("permission denied")` → `failure("permission denied")`
- ❌ `dialog.showOpenDialog` throw non-Error object → `failure("Failed to open file dialog")`

---

## 3. `import.handler.ts` — Import Request

**File test:** `src/main/ipc/handlers/__tests__/import.handler.test.ts`
**Mock:** `electron` (`ipcMain.handle`), `vi.mock('../../services/import.service')`

- ✅ Payload hợp lệ `FILE_IMPORT` → `parseImportRequest` parse được → `ImportService.handleImportRequest` được gọi đúng object → trả kết quả từ service
- ✅ Payload hợp lệ `NOTION_SYNC` → tương tự
- ❌ Payload không hợp lệ → `parseImportRequest` trả `null` → `failure("Invalid import request payload")` ngay, không gọi service
- ❌ Payload là `null` → `failure`
- ❌ Payload là string → `failure`

---

## 4. `settings.handler.ts` — Settings & Secrets

**File test:** `src/main/ipc/handlers/__tests__/settings.handler.test.ts`
**Mock:** `electron` (`ipcMain.handle`), `vi.mock('../../store')`, `vi.mock('../../state')`

### `saveSettings` handler
- ✅ Payload hợp lệ, tất cả `syncRuntimeSecret` thành công → `success("Settings saved successfully")`
- ✅ Value rỗng cho một key → `SecretManager.deleteSecret` + `State.removeToken` được gọi cho key đó
- ✅ Value hợp lệ → `SecretManager.saveSecret` + `State.setToken` được gọi với đúng value đã trim
- ❌ Payload không hợp lệ (`parseSaveSettingsPayload` trả null) → `failure("Invalid settings payload")`
- ❌ `SecretManager.saveSecret` trả `false` cho 1 trong 3 keys → `failure("Failed to save some settings")`

### `getSecret` handler
- ✅ State có đủ tokens → `success({ openaiApiKey, azureApiKey, pexelsToken, notionToken, notionDatabaseId })`
- ✅ Token chưa set → giá trị là `""` (empty string, không phải `undefined`)
- ❌ Exception bung ra trong handler → `failure(error.message)`

---

## 5. Renderer UI (`src/renderer/src/renderer.ts`)

**File test:** `src/renderer/src/__tests__/renderer.test.ts`
**Environment:** `jsdom` (tự động qua `environmentMatchGlobs`)

### Cách load HTML vào JSDOM

Load `index.html` thật vào `document` trước khi import renderer module:

```typescript
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { beforeEach, vi } from 'vitest'

beforeEach(async () => {
  // 1. Load HTML thật vào jsdom
  const html = readFileSync(resolve(__dirname, '../../../index.html'), 'utf-8')
  document.documentElement.innerHTML = html

  // 2. Mock window.api (preload bridge)
  ;(window as any).api = {
    minimize: vi.fn(),
    close: vi.fn(),
    platform: 'linux' as NodeJS.Platform,
    getFilePath: vi.fn((file: File) => `/mock/${file.name}`),
    openFileDialog: vi.fn(),
    sendImport: vi.fn(),
    saveSettings: vi.fn(),
    getSecret: vi.fn().mockResolvedValue({
      status: 'success',
      data: {
        openaiApiKey: '',
        azureApiKey: '',
        pexelsToken: '',
        notionToken: '',
        notionDatabaseId: '',
      },
    }),
  }

  // 3. Dynamic import để renderer chạy sau khi DOM sẵn sàng
  await import('../renderer')
})
```

> **Lưu ý `vi.resetModules()`:** Vì renderer.ts attach listeners ngay khi load, cần gọi `vi.resetModules()` trong `beforeEach` để mỗi test import một instance mới, tránh double-listener:
> ```typescript
> beforeEach(() => {
>   vi.resetModules()
>   // ...sau đó setup DOM và import
> })
> ```

---

### Trạng thái khởi tạo (Initialization)
- ✅ Các tab chính render đúng trong DOM (File Import, Notion Sync)
- ✅ `window.api.getSecret` được gọi khi load
- ✅ Các input API key được điền từ response của `getSecret`

### Settings Form
- ✅ Nhập giá trị vào `openaiApiKey` input, bấm Save → `window.api.saveSettings` được gọi với đúng payload
- ❌ `saveSettings` trả `{ status: 'error', message: '...' }` → UI hiển thị thông báo lỗi

### File Import Flow
- ✅ Click "Choose File" → `window.api.openFileDialog` được gọi
- ✅ `openFileDialog` trả `{ filePath: '/path/file.txt' }` → tên file hiện lên DOM
- ✅ `openFileDialog` trả `{ filePath: null }` (cancel) → DOM không thay đổi
- ✅ Bấm Import với file đã chọn → `window.api.sendImport` gọi với `type: 'FILE_IMPORT'`
- ❌ Bấm Import mà chưa chọn file → `sendImport` không được gọi

### Notion Sync Flow
- ✅ Điền đủ token + database ID → bấm Sync → `sendImport` gọi với `type: 'NOTION_SYNC'`
- ❌ Thiếu token hoặc database ID → `sendImport` không được gọi

### Async Loading States
- ✅ Bấm Import → button disabled (hoặc spinner visible)
- ✅ Import `status: 'success'` → loading kết thúc, hiện thông báo thành công
- ❌ Import `status: 'error'` → loading kết thúc, hiện đúng `message` lỗi trên UI

---

## 6. Danh sách file cần tạo

```
src/main/ipc/handlers/__tests__/
├── window.handler.test.ts
├── file.handler.test.ts
├── import.handler.test.ts
└── settings.handler.test.ts

src/renderer/src/__tests__/
└── renderer.test.ts
```
