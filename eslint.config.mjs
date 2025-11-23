// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: [
            'eslint.config.mjs',
            '**/dist/**',
            '**/node_modules/**',
            '**/coverage/**',
            '**/.puaros/**',
            '**/build/**',
        ],
    },
    eslint.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
    eslintPluginPrettierRecommended,
    {
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest,
                ...globals.es2021,
            },
            sourceType: 'commonjs',
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    {
        rules: {
            // ========================================
            // TypeScript Best Practices
            // ========================================
            '@typescript-eslint/no-explicit-any': 'warn', // Warn about 'any' usage
            '@typescript-eslint/no-unsafe-assignment': 'warn',
            '@typescript-eslint/no-unsafe-member-access': 'warn',
            '@typescript-eslint/no-unsafe-call': 'warn',
            '@typescript-eslint/no-unsafe-return': 'warn',
            '@typescript-eslint/no-unsafe-argument': 'warn',
            '@typescript-eslint/explicit-function-return-type': [
                'warn',
                {
                    allowExpressions: true,
                    allowTypedFunctionExpressions: true,
                    allowHigherOrderFunctions: true,
                },
            ],
            '@typescript-eslint/explicit-module-boundary-types': 'warn',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/await-thenable': 'error',
            '@typescript-eslint/no-misused-promises': 'error',
            '@typescript-eslint/prefer-nullish-coalescing': 'warn',
            '@typescript-eslint/prefer-optional-chain': 'warn',
            '@typescript-eslint/prefer-readonly': 'warn',
            '@typescript-eslint/promise-function-async': 'warn',
            '@typescript-eslint/require-await': 'warn',
            '@typescript-eslint/no-unnecessary-condition': 'warn',
            '@typescript-eslint/no-non-null-assertion': 'warn',

            // ========================================
            // Code Quality & Best Practices
            // ========================================
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            'no-debugger': 'error',
            'no-alert': 'error',
            'no-var': 'error',
            'prefer-const': 'error',
            'prefer-arrow-callback': 'warn',
            'prefer-template': 'warn',
            'no-nested-ternary': 'warn',
            'no-unneeded-ternary': 'error',
            'no-else-return': 'warn',
            eqeqeq: ['error', 'always'],
            curly: ['error', 'all'],
            'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0 }],
            'no-trailing-spaces': 'error',
            'comma-dangle': ['error', 'always-multiline'],

            // ========================================
            // Code Style (handled by Prettier mostly)
            // ========================================
            indent: ['error', 4, { SwitchCase: 1 }],
            '@typescript-eslint/indent': 'off', // Let Prettier handle this
            quotes: ['error', 'single', { avoidEscape: true }],
            semi: ['error', 'always'],

            // ========================================
            // Prettier Integration
            // ========================================
            'prettier/prettier': [
                'error',
                {
                    tabWidth: 4,
                    endOfLine: 'auto',
                },
            ],

            // ========================================
            // Complexity & Maintainability
            // ========================================
            complexity: ['warn', 15],
            'max-depth': ['warn', 4],
            'max-lines-per-function': ['warn', { max: 100, skipBlankLines: true, skipComments: true }],
            'max-params': ['warn', 5],

            // ========================================
            // Imports & Dependencies
            // ========================================
            'no-duplicate-imports': 'error',
            'sort-imports': [
                'warn',
                {
                    ignoreCase: true,
                    ignoreDeclarationSort: true,
                },
            ],
        },
    },
);
