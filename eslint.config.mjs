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
            '**/examples/**',
            '**/tests/**',
            '**/*.config.ts',
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
            '@typescript-eslint/prefer-nullish-coalescing': 'off', // Allow || operator alongside ??
            '@typescript-eslint/prefer-optional-chain': 'warn',
            '@typescript-eslint/prefer-readonly': 'warn',
            '@typescript-eslint/promise-function-async': 'warn',
            '@typescript-eslint/require-await': 'warn',
            '@typescript-eslint/no-unnecessary-condition': 'off', // Sometimes useful for defensive coding
            '@typescript-eslint/no-non-null-assertion': 'warn',
            '@typescript-eslint/no-unnecessary-type-parameters': 'warn', // Allow generic JSON parsers

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
            'no-nested-ternary': 'off', // Allow nested ternaries when readable
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
            indent: 'off', // Let Prettier handle this
            '@typescript-eslint/indent': 'off', // Let Prettier handle this
            quotes: ['error', 'double', { avoidEscape: true }],
            semi: ['error', 'never'],

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

            // ========================================
            // Comments
            // ========================================
            'no-inline-comments': 'off',
            'line-comment-position': 'off',
            'spaced-comment': [
                'error',
                'always',
                {
                    markers: ['/'],
                    exceptions: ['-', '+', '*', '='],
                    block: {
                        balanced: true,
                    },
                },
            ],
            'multiline-comment-style': ['warn', 'starred-block'],
            'no-warning-comments': [
                'warn',
                {
                    terms: ['todo', 'fixme', 'hack', 'xxx'],
                    location: 'start',
                },
            ],
        },
    },
    {
        // CLI-specific overrides
        files: ['**/cli/**/*.ts', '**/cli/**/*.js'],
        rules: {
            'no-console': 'off', // Console is expected in CLI
            'max-lines-per-function': 'off', // CLI action handlers can be long
            complexity: 'off', // CLI logic can be complex
            '@typescript-eslint/no-unsafe-member-access': 'off', // Commander options are untyped
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
        },
    },
    {
        // Value Objects and Domain - allow more parameters for create methods
        files: ['**/domain/value-objects/**/*.ts', '**/application/use-cases/**/*.ts'],
        rules: {
            'max-params': ['warn', 8], // DDD patterns often need more params
        },
    },
);
