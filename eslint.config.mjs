import { defineConfig } from 'eslint/config'
import tseslint from '@electron-toolkit/eslint-config-ts'
import eslintConfigPrettier from '@electron-toolkit/eslint-config-prettier'
import unusedImports from 'eslint-plugin-unused-imports'
import globals from 'globals'

export default defineConfig(
    { ignores: ['**/node_modules', '**/dist', '**/out'] },
    tseslint.configs.recommended,
    eslintConfigPrettier,
    {
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.es2021,
                ...globals.jest
            },
            parserOptions: {
                // Bật type-aware để rules TS hiểu được type từ tsconfig
                projectService: true, // ESLint v9 + TS-ESLint mới
                tsconfigRootDir: import.meta.dirname
            }
        },

        plugins: {
            'unused-imports': unusedImports
        },

        rules: {
            // Cho phép dùng any tạm thời (cảnh báo), không chặn code

            // Bộ "no-unsafe-*" là thứ hay làm bạn ức chế lúc mới dùng TS
            '@typescript-eslint/no-unsafe-assignment': 'warn',
            '@typescript-eslint/no-unsafe-call': 'warn',
            '@typescript-eslint/no-unsafe-member-access': 'warn',
            '@typescript-eslint/no-unsafe-return': 'warn',
            '@typescript-eslint/no-explicit-any': [
                'warn',
                { fixToUnknown: false, ignoreRestArgs: true }
            ],

            // Không ép bạn phải khai báo kiểu trả về cho mọi hàm
            '@typescript-eslint/explicit-function-return-type': 'off',

            // Nest hay dùng DI + class fields → tránh gắt gao quá mức
            '@typescript-eslint/explicit-member-accessibility': 'off',

            // Nhiều thư viện third-party type chưa đẹp → đừng quá nghiêm
            '@typescript-eslint/no-unsafe-argument': 'off',

            /** ---------- Dọn rác import/biến thừa ---------- */
            // Xóa import không dùng (autofix)
            'unused-imports/no-unused-imports': 'warn',
            // Biến đã import nhưng không dùng → cảnh báo, không chặn
            'no-unused-vars': 'off', // tắt rule base, dùng bản TS
            '@typescript-eslint/no-unused-vars': [
                'warn',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
            ],

            /** ---------- Logic cơ bản nên giữ ---------- */
            'no-constant-condition': ['error', { checkLoops: false }],
            'no-console': 'off', // Dev backend thường cần console; chuyển 'warn' nếu muốn sạch log
            eqeqeq: ['warn', 'smart'], // khuyến khích dùng === trừ case đặc biệt
            curly: ['warn', 'all'] // khuyến khích block rõ ràng
        }
    },

    /** ---------- Override cho file test/spec ---------- */
    {
        files: ['**/*.spec.ts', '**/*.test.ts'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/require-await': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-return': 'off'
        }
    }
)
