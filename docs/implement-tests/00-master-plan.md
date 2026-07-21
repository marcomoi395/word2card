# Master Plan: Comprehensive Test Coverage cho Word2Card

Dự án Word2Card (Electron + Vanilla TS, build bằng `electron-vite`) yêu cầu độ bao phủ test >= 95% trên toàn bộ `src/`, từ Unit Test đến Integration Test. Tài liệu này định nghĩa chiến lược, quy ước mock, dependency chain giữa các phases và tiêu chuẩn nghiệm thu.

---

## 🌟 Nguyên Tắc Kiểm Thử (Testing Principles)

1. **Zero Skipped Cases** — Mỗi module phải có đủ 3 nhóm:
   - **Happy Path:** Đầu vào hợp lệ, kết quả đúng như spec.
   - **Sad Path:** Đầu vào sai (null, undefined, wrong type, empty string), lỗi đúng phải trả về.
   - **Boundary / Edge Cases:** Giới hạn dữ liệu (chuỗi quá dài, array rỗng, ký tự đặc biệt, timeout, concurrent requests).

2. **Arrange-Act-Assert (AAA)** — Cấu trúc bắt buộc cho mọi test case: Chuẩn bị dữ liệu → Thực thi → Kiểm tra kết quả.

3. **Strict Isolation** — Không gọi API thật, không đọc/ghi file thật, không phụ thuộc vào trạng thái global giữa các tests.

4. **Tooling:** Vitest (tích hợp sẵn hệ sinh thái Vite/Electron-Vite), `jsdom` cho Renderer tests.

---

## 🔧 Mock Strategy Convention (Thống nhất toàn codebase)

| Tình huống | Kỹ thuật | Ví dụ |
|---|---|---|
| Mock toàn bộ module bên ngoài (Electron, `openai`, `pexels`, Azure SDK) | `vi.mock('module-name', factory)` | `vi.mock('electron', () => ({ app: {...} }))` |
| Mock một method cụ thể của class / object đã import | `vi.spyOn(object, 'method')` | `vi.spyOn(DeckService, 'createDeckIfNotExist')` |
| Reset singleton giữa các tests | `beforeEach` + gán lại `instance = null` qua cast | Xem Phase 3, mục Singleton Reset |
| Mock `fs` module | `vi.mock('fs')` + `vi.mocked(fs.promises.readFile).mockResolvedValue(...)` | Xem Phase 2, mục readFile |
| Mock `fetch` (AnkiConnect) | `vi.stubGlobal('fetch', vi.fn())` | Xem Phase 3, mục AnkiConnect |

**Quy tắc chung:**
- Dùng `vi.mock()` cho module-level (import bị thay toàn bộ).
- Dùng `vi.spyOn()` khi chỉ cần override một method, giữ phần còn lại của module thật.
- Gọi `vi.clearAllMocks()` trong `afterEach` để tránh state leak giữa các test.

---

## 🗺 Lộ Trình & Dependency Chain

```
Phase 1: Setup Infrastructure
   ↓ (bắt buộc hoàn thành trước)
Phase 2: Core Logic & Pure Functions  ← KHÔNG phụ thuộc external
   ↓ (Phase 2 phải PASS 100% trước khi bắt đầu)
Phase 3: Services & Integration       ← Mock kết quả từ Phase 2's modules
   ↓ (Phase 3 phải PASS 100% trước khi bắt đầu)
Phase 4: IPC Handlers & Renderer UI   ← Mock Services từ Phase 3
```

> **Lý do:** Services (Phase 3) import trực tiếp Validators, Helpers (Phase 2). Nếu Phase 2 fail, Phase 3 không có base đáng tin cậy để mock. IPC Handlers (Phase 4) gọi Services nên phụ thuộc tương tự.

---

## 📋 Tổng hợp Files cần tạo

### Phase 2 — Core Logic
- `src/main/utils/__tests__/validators.test.ts`
- `src/main/helper/__tests__/sanitize-filename.test.ts`
- `src/main/helper/__tests__/get-words-from-notion-response.test.ts`
- `src/main/helper/__tests__/filter-existing-words.test.ts`
- `src/main/helper/__tests__/readFile.test.ts`
- `src/main/helper/__tests__/notion-sync.test.ts` *(migrate từ node:test, mở rộng)*

### Phase 3 — Services & Integration
- `src/main/__tests__/anki-connect.test.ts`
- `src/main/__tests__/state.test.ts`
- `src/main/__tests__/store.test.ts`
- `src/main/__tests__/pexels.test.ts`
- `src/main/__tests__/open-ai.test.ts`
- `src/main/__tests__/speech.test.ts`
- `src/main/services/__tests__/deck.service.test.ts`
- `src/main/services/__tests__/import.service.test.ts`

### Phase 4 — IPC & Renderer
- `src/main/ipc/handlers/__tests__/file.handler.test.ts`
- `src/main/ipc/handlers/__tests__/import.handler.test.ts`
- `src/main/ipc/handlers/__tests__/settings.handler.test.ts`
- `src/main/ipc/handlers/__tests__/window.handler.test.ts`
- `src/renderer/src/__tests__/renderer.test.ts`

---

## 📊 Tiêu Chuẩn Nghiệm Thu

- 100% test cases pass.
- Coverage `>= 95%` (Statements, Branches, Functions, Lines) cho toàn bộ `src/`.
- Mỗi test có mô tả rõ ràng bằng `describe` / `it` đủ để đọc như tài liệu spec.
- Không có `test.skip` hoặc `it.todo` ở trạng thái cuối.

---

## 📎 Tham khảo chi tiết từng Phase

- [Phase 1: Setup Infrastructure](./01-phase1-setup.md)
- [Phase 2: Core Logic & Pure Functions](./02-phase2-core-logic.md)
- [Phase 3: Services & External Integrations](./03-phase3-services-integration.md)
- [Phase 4: IPC Handlers & Renderer UI](./04-phase4-ipc-and-renderer.md)