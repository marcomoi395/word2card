# Phase 2: Core Logic & Pure Functions

Giai đoạn này phủ toàn bộ các hàm độc lập (pure functions, helpers, validators) không phụ thuộc external API hay Electron runtime. Phải pass 100% trước khi triển khai Phase 3.

**Quy tắc chung:**
- Không cần mock Electron, không cần mock network.
- Chỉ mock `fs` ở các file có I/O (`readFile.ts`).
- `filter-existing-words.ts` mock `anki-connect` module.
- `clozeWord` là private — xem mục 6 để biết cách xử lý.

---

## 1. Validators (`src/main/utils/validators.ts`)

**Mục tiêu:** Chặn payload độc hại từ Renderer trước khi vào Main Process.
**File test:** `src/main/utils/__tests__/validators.test.ts`

### `isRecord`
- ✅ `{}`, `{ a: 1 }`, `{ nested: {} }`
- ❌ `null`, `undefined`, `[]`, `"string"`, `0`, `false`, `() => {}`

### `isImportOptions`
- ✅ `{ quiz: true, flashcard: false }`
- ❌ `{ quiz: true }` — thiếu `flashcard`
- ❌ `{ quiz: 1, flashcard: false }` — quiz là number
- ❌ `{}`

### `parseSaveSettingsPayload`
- ✅ Đủ 3 keys string → trả đúng object
- ✅ Có extra key thừa → vẫn parse đúng 3 key cần thiết
- ❌ Thiếu 1 trong 3 keys → `null`
- ❌ Giá trị là `number`, `null`, `boolean` → `null`
- ❌ Input không phải object → `null`

### `parseImportRequest`
- ✅ `type: 'FILE_IMPORT'` đủ `filePath` (string), `deck` (string), `options` (valid)
- ✅ `type: 'NOTION_SYNC'` đủ `token`, `notionDatabaseId`, `deck`, `options`
- ❌ `type: 'UNKNOWN'` → `null`
- ❌ `type: 'FILE_IMPORT'`, `payload` thiếu `filePath` → `null`
- ❌ `type: 'FILE_IMPORT'`, `options.quiz` là string → `null`
- ❌ `payload` là `null` → `null`
- ❌ Input hoàn toàn không phải object → `null`

---

## 2. Path Sanitizer (`src/main/helper/sanitize-filename.ts`)

**Mục tiêu:** Tạo filename an toàn cho filesystem.
**File test:** `src/main/helper/__tests__/sanitize-filename.test.ts`

- ✅ `"take into account"` → `"take-into-account"`
- ✅ `"it's raining"` → `"its-raining"`
- ✅ `'say "hello"'` → `"say-hello"`
- ✅ `"cost-effective"` → `"cost-effective"` (giữ nguyên hyphen hợp lệ)
- ✅ `"hello   world"` — multiple spaces → `"hello-world"`
- ✅ `"Hello World"` — uppercase → `"hello-world"`
- ⚠️ `"../../etc/passwd"` — path traversal → output không chứa `..` hay `/`
- ⚠️ `"lưu ý 🌟"` — unicode/emoji → không throw, trả chuỗi hợp lệ
- ⚠️ `"!@#$%"` — toàn special chars → `""` (empty)
- ⚠️ `""` — empty → `""`
- ⚠️ `"   "` — whitespace only → `""`
- ⚠️ Chuỗi > 255 ký tự → không throw, trả output

---

## 3. Notion Response Parser (`src/main/helper/get-words-from-notion-response.ts`)

**Mục tiêu:** Parse data từ Notion API không bao giờ crash app.
**File test:** `src/main/helper/__tests__/get-words-from-notion-response.test.ts`

### `getWordEntriesFromResponse`
- ✅ Pages hợp lệ → trả `[{ pageId, word }]` đúng
- ✅ Word bị trim/lowercase: `"  Bank  "` → `{ word: "bank" }`
- ✅ Array rỗng `[]` → `[]`
- ❌ Input `null` → `[]`
- ❌ Input `undefined` → `[]`
- ❌ Input là object (không phải array) → `[]`
- ❌ Page thiếu `id` → bị bỏ qua
- ❌ `properties.English` không tồn tại → bỏ qua page đó
- ❌ `properties.English.type` không phải `"title"` → bỏ qua
- ❌ `title[0].plain_text` là empty string sau trim → bỏ qua
- ❌ `title` là array rỗng → bỏ qua

### `getWordsFromResponse`
- ✅ Trả đúng mảng string word — verify bằng cách so sánh với `getWordEntriesFromResponse` cùng input.

---

## 4. File Reader (`src/main/helper/readFile.ts`)

**Mục tiêu:** Đọc file word list, xử lý mọi lỗi I/O mà không crash.
**File test:** `src/main/helper/__tests__/readFile.test.ts`
**Mock:** `vi.mock('fs')`

- ✅ File hợp lệ, nhiều dòng → trả array các dòng đã trim, bỏ dòng trống
- ✅ Dòng có khoảng trắng đầu/cuối: `"  bank  \n"` → `["bank"]`
- ✅ File chỉ có dòng trống → `[]`
- ✅ File rỗng hoàn toàn → `[]`
- ❌ File không tồn tại (`ENOENT`) → `null` (không throw)
- ❌ Permission denied (`EACCES`) → `null` (không throw)

---

## 5. Anki Word Filter (`src/main/helper/filter-existing-words.ts`)

**Mục tiêu:** Lọc từ đã tồn tại trong Anki, fallback an toàn khi Anki lỗi.
**File test:** `src/main/helper/__tests__/filter-existing-words.test.ts`
**Mock:** `vi.mock('../anki-connect')` — stub `sendRequest`

- ✅ Tất cả words đều mới (Anki trả `[[]]` cho mỗi word) → trả nguyên mảng input
- ✅ Tất cả words đã tồn tại (Anki trả `[[123]]`) → trả `[]`
- ✅ Mix — một số đã có, một số chưa → chỉ trả các từ chưa có
- ✅ Input là `[]` → trả `[]` ngay, không gọi `sendRequest`
- ❌ `sendRequest` throw error → fallback trả nguyên mảng input (không crash)
- ❌ `response.error` có giá trị → fallback trả nguyên mảng input

---

## 6. Notion Sync Helpers (`src/main/helper/notion-sync.ts`)

**File test:** `src/main/helper/__tests__/notion-sync.test.ts` *(migrate từ node:test + bổ sung)*

### Bổ sung sau migrate

#### `resolveNotionDeckName`
- ✅ Đã có: blank input → dùng datasource name
- ✅ Đã có: custom input → prefix + date
- ⚠️ `deckInput` chỉ có khoảng trắng `"  "` → phải dùng datasource name (trim đúng)
- ⚠️ `dataSourceName` có khoảng trắng đầu/cuối → trim trước khi ghép

#### `filterNotionTargetsByWords`
- ✅ Đã có: duplicate word tiêu thụ đúng số lần
- ⚠️ Word matching case-insensitive: `"Bank"` match target `"bank"`
- ⚠️ `words` list rỗng → `[]`
- ⚠️ `targets` list rỗng → `[]`

#### `createNotionTargetQueueMap` + `shiftNotionTarget`
- ✅ Đã có: consumption theo insertion order
- ⚠️ `shiftNotionTarget` với word không tồn tại trong queue → `undefined`
- ⚠️ Case-insensitive normalization trong queue

---

## 7. `clozeWord` trong `handle.ts` — Cách xử lý private function

`clozeWord` hiện không được export trong `handle.ts`.

**Option A (Khuyến nghị):** Extract ra `src/main/helper/cloze.ts` và export. Test độc lập, rõ ràng.

**Option B:** Test gián tiếp qua `createFlashcards` ở Phase 3 — không lý tưởng vì cần mock nhiều dependencies chỉ để kiểm tra một string operation.

> **Cần xác nhận trước khi triển khai:** Option A hay B?

**Nếu Option A — test cases:**
- `clozeWord("I")` → `"_"`
- `clozeWord("to")` → `"__"`
- `clozeWord("bank")` → `"b__k"`
- `clozeWord("effective")` → `"e_______e"`
- `clozeWord("cost-effective")` → `"c____________e"`

---

## 8. Danh sách file cần tạo

```
src/main/utils/__tests__/
└── validators.test.ts

src/main/helper/__tests__/
├── sanitize-filename.test.ts
├── get-words-from-notion-response.test.ts
├── readFile.test.ts
├── filter-existing-words.test.ts
└── notion-sync.test.ts   ← migrate + mở rộng
```
