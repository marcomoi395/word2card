# Phase 3: Services & External Integrations

Giai đoạn này test các module gọi external API và services có side-effects (network, disk, singleton state). **Bắt buộc Phase 2 pass 100% trước.**

**Quy tắc chung:**
- Không gọi API thật. Dùng `vi.mock()` cho toàn bộ external packages.
- Dùng `vi.stubGlobal('fetch', vi.fn())` để mock AnkiConnect HTTP calls.
- `afterEach(() => vi.clearAllMocks())` bắt buộc trong mọi test file.
- **Singleton phải được reset giữa các tests** — xem mục 0 bên dưới.

---

## 0. Singleton Reset Pattern — BẮT BUỘC

`State`, `SecretManager`, `OpenAIService`, `SpeechService` đều dùng `static instance`. Module-level export (`export default State.getInstance()`) khiến `vi.mock()` đơn thuần **không reset** instance giữa các tests — test trước sẽ contaminate test sau.

Có 2 cách xử lý, chọn một và áp dụng nhất quán:

### Cách A — Reset instance trực tiếp trong `beforeEach` (Khuyến nghị cho State, OpenAIService, SpeechService)

```typescript
import State from '../../state'
import { OpenAIService } from '../../open-ai'
import { SpeechService } from '../../speech'

beforeEach(() => {
  // Ép TypeScript bỏ qua private bằng cast — chấp nhận được trong test context
  ;(State as any).instance = undefined
  ;(OpenAIService as any).instance = null
  ;(OpenAIService as any).currentKey = null
  ;(SpeechService as any).instance = null
  ;(SpeechService as any).currentKey = null
})
```

### Cách B — Mock toàn bộ module (Dùng khi test KHÔNG quan tâm đến logic của State)

```typescript
vi.mock('../../state', () => ({
  default: {
    getToken: vi.fn(),
    setToken: vi.fn(),
    setAllTokens: vi.fn(),
    removeToken: vi.fn(),
    getMissingTokens: vi.fn(() => []),
  },
}))
```

> **Quy ước áp dụng:**
> - Test `state.test.ts` tự thân: dùng Cách A (test logic của State).
> - Các test khác (deck.service, import.service, open-ai, speech) cần State làm dependency: dùng Cách B để tránh coupling.

---

## 1. State (`src/main/state.ts`)

**Mục tiêu:** Singleton in-memory token store.
**File test:** `src/main/__tests__/state.test.ts`
**Reset:** Cách A — `(State as any).instance = undefined` trong `beforeEach`.
**Không cần mock** (pure in-memory, không I/O).

- ✅ `getInstance()` luôn trả cùng một instance (reference equality)
- ✅ `setToken` + `getToken` round-trip đúng
- ✅ `setAllTokens` merge đúng — không xóa các key khác
- ✅ `getMissingTokens` trả đúng các key thiếu
- ✅ `getMissingTokens` trả `[]` khi tất cả keys đều có
- ✅ `removeToken` xóa đúng key, các key khác không ảnh hưởng
- ✅ `getToken` với key chưa set → `undefined`
- ✅ Sau reset instance, instance mới hoàn toàn clean (không còn token cũ)

---

## 2. SecretManager / Store (`src/main/store.ts`)

**Mục tiêu:** Lưu/đọc secret với tùy chọn mã hóa.
**File test:** `src/main/__tests__/store.test.ts`
**Mock:** `electron` (đã có trong `test/setup.ts`), `electron-store` (đã có trong `test/setup.ts`)
**Reset:** `(SecretManager as any).instance = undefined` trong `beforeEach`

### `saveSecret`
- ✅ `isEncryptionAvailable() = false` → lưu plain text, `encrypted: false`
- ✅ `isEncryptionAvailable() = true` → mã hóa qua `safeStorage.encryptString`, lưu hex, `encrypted: true`
- ❌ `store.set` throw error → return `false` (không crash)

### `getSecret`
- ✅ Key chưa có → `null`
- ✅ Lưu plain text rồi đọc lại → trả đúng value
- ✅ `encrypted: true`, `isEncryptionAvailable() = true` → giải mã đúng
- ❌ `encrypted: true`, `isEncryptionAvailable() = false` → `null`
- ❌ `store.get` throw error → `null`

### `deleteSecret`
- ✅ Gọi `store.delete` với đúng key

---

## 3. AnkiConnect Client (`src/main/anki-connect.ts`)

**File test:** `src/main/__tests__/anki-connect.test.ts`
**Mock:** `vi.stubGlobal('fetch', vi.fn())`

### `checkAnkiConnect`
- ✅ `fetch` trả `{ ok: true, status: 200 }` → `true`
- ❌ `fetch` trả `{ status: 500 }` → `false`
- ❌ `fetch` throw (Connection refused) → `false`

### `sendRequest`
- ✅ Response hợp lệ `{ result: ..., error: null }` → trả `AnkiResponse`
- ❌ `response.ok = false` → throw `Error("AnkiConnect request failed with status ...")`
- ❌ Response JSON thiếu `result` hoặc `error` key → throw `"Invalid response from AnkiConnect"`
- ❌ `fetch` throw → propagate lên caller

---

## 4. Pexels Image Search (`src/main/pexels.ts`)

**Mục tiêu:** Tìm ảnh minh họa, fallback an toàn khi API fail (optional feature).
**File test:** `src/main/__tests__/pexels.test.ts`
**Mock:** `vi.mock('pexels')`

- ✅ API trả về `{ photos: [{ src: { medium: 'https://...' } }] }` → trả URL đó
- ✅ API trả về `{ photos: [] }` (0 results) → `null`
- ❌ API throw error → `null` (không crash)
- ❌ Response là `ErrorResponse` từ Pexels (không có key `photos`) → `null`

---

## 5. OpenAI Service (`src/main/open-ai.ts`)

**File test:** `src/main/__tests__/open-ai.test.ts`
**Mock:** `vi.mock('openai')`, State dùng Cách B
**Reset:** `(OpenAIService as any).instance = null`, `(OpenAIService as any).currentKey = null` trong `beforeEach`

### `getInstance`
- ✅ State có `openaiApiKey` → trả instance
- ✅ Key thay đổi giữa 2 lần gọi → tạo lại instance mới
- ❌ State không có `openaiApiKey` → throw `"Missing OpenAI API key in state"`

### `generateFlashcardData`
- ✅ OpenAI trả về JSON hợp lệ `{ data: [...] }` → trả array đúng
- ❌ `content` là `null` → throw `"No content returned from GPT"`
- ❌ `content` là string không phải valid JSON → throw JSON parse error
- ❌ `openai.chat.completions.create` throw → propagate lên

---

## 6. Speech Service (`src/main/speech.ts`)

**File test:** `src/main/__tests__/speech.test.ts`
**Mock:** `vi.mock('microsoft-cognitiveservices-speech-sdk')`, State dùng Cách B
**Reset:** `(SpeechService as any).instance = null`, `(SpeechService as any).currentKey = null` trong `beforeEach`

### `getInstance`
- ✅ State có `azureApiKey` → trả instance
- ✅ Key thay đổi → tạo lại instance
- ❌ Không có `azureApiKey` → throw `"Missing Azure API key in state"`

### `textToSpeech`
- ✅ `speakTextAsync` gọi success callback → resolve với file path
- ❌ `speakTextAsync` gọi error callback → reject
- ✅ `synthesizer.close()` được gọi cả khi thành công lẫn khi lỗi

### Retry & Concurrency (`generateAudioFiles`)
- ✅ 1 file thành công → không retry
- ✅ File lỗi lần 1, 2 → thành công lần 3 — retry đúng `MAX_RETRIES` (3) lần
- ❌ File lỗi cả 3 lần → bỏ qua (không throw, không crash toàn batch)
- ✅ Không vượt quá `MAX_CONCURRENT_REQUESTS` (5) — verify bằng cách đếm số concurrent calls

---

## 7. Deck Service (`src/main/services/deck.service.ts`)

**File test:** `src/main/services/__tests__/deck.service.test.ts`
**Mock:** `vi.mock('../../anki-connect')` — stub `checkAnkiConnect`, `sendRequest`

### `createDeckIfNotExist`
- ✅ Anki running, `sendRequest` thành công → `success`
- ❌ `checkAnkiConnect` = false → `failure("Failed to connect to AnkiConnect...")`
- ❌ `sendRequest` trả `{ error: "..." }` → `failure("Anki error: ...")`
- ❌ `sendRequest` throw → `failure` (catch block)
- ✅ `deckName` rỗng → dùng `"Default"` (verify qua spy payload truyền vào request)

### `createDecksIfNotExist`
- ✅ Tất cả decks thành công → `success`
- ❌ Một deck fail → trả `failure` ngay (short-circuit)

### `addNotesToAnki`
- ✅ `notes = []` → không gọi Anki, trả `success`
- ✅ notes hợp lệ, model tồn tại → gọi `addNotes` đúng
- ❌ `ensureModelExists` fail → trả `failure`, không gọi `addNotes`
- ❌ `sendRequest` (addNotes) trả error → `failure`

---

## 8. Import Service (`src/main/services/import.service.ts`)

**File test:** `src/main/services/__tests__/import.service.test.ts`
**Mock:** `vi.mock('fs')`, State Cách B, `vi.mock('../notion')`, `vi.mock('../open-ai')`, `vi.mock('../speech')`, `vi.mock('./deck.service')`

### FILE_IMPORT
- ✅ Happy path: đọc file → filter → generate → tạo audio (quiz=true) → push Anki → `success`
- ✅ `options.quiz = false` → `SpeechService` không được gọi
- ❌ `readFileContent` trả `null` → `failure`
- ❌ File rỗng (0 từ) → `failure`
- ❌ Thiếu `openaiApiKey` trong State → `failure`
- ❌ `OpenAIService.generateFlashcardData` throw → `failure`
- ❌ Thiếu `azureApiKey` khi `options.quiz = true` → `failure`

### NOTION_SYNC
- ✅ Happy path: fetch Notion → parse → filter → generate → push → `success`
- ❌ Notion token thiếu → `failure`
- ❌ `NotionService` throw → `failure`
- ✅ Notion trả 0 từ mới → `success` với message phù hợp

### Token Sync
- ✅ Value hợp lệ → `SecretManager.saveSecret` + `State.setToken` được gọi
- ✅ Value rỗng → `SecretManager.saveSecret` không được gọi, return `false`

### Audio Directory
- ✅ Directory chưa tồn tại → `mkdirSync` được gọi
- ✅ Directory đã tồn tại → `mkdirSync` không được gọi

---

## 9. Danh sách file cần tạo

```
src/main/__tests__/
├── state.test.ts
├── store.test.ts
├── anki-connect.test.ts
├── pexels.test.ts
├── open-ai.test.ts
└── speech.test.ts

src/main/services/__tests__/
├── deck.service.test.ts
└── import.service.test.ts
```
