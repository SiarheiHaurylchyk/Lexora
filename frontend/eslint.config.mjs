import eslint from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettierConfig from 'eslint-config-prettier';
import fsdPlugin from 'eslint-plugin-fsd-lint';
import importPlugin from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    'dist/**',
    'build/**',
    'node_modules/**',
    '.history/**',
    'coverage/**',
    'src/_old/**',
    '**/src/_old/**',
  ]),
  {
    settings: {
      react: { version: '19.2' },
    },
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],
  reactHooks.configs.flat.recommended,
  prettierConfig,
  fsdPlugin.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}', '*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser },
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
        node: true,
      },
    },
  },
  {
    plugins: {
      fsd: fsdPlugin,
    },
    rules: {
      'fsd/forbidden-imports': ['error', {}],
      'fsd/no-relative-imports': 'off',
      'fsd/no-public-api-sidestep': 'error',
      'fsd/no-cross-slice-dependency': [
        'error',
        {
          ignoreImportPatterns: ['^(\\.\\./)+(api|config|lib|model|ui)(/.*)?$'],
        },
      ],
      'fsd/no-ui-in-business-logic': 'error',
      'fsd/no-global-store-imports': [
        'error',
        {
          allowedPaths: ['../store', './store', '@session/model/store'],
        },
      ],
      'fsd/ordered-imports': 'warn',
    },
  },
  {
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^@/features(/|$)',
              message:
                'Within the features layer use relative imports, not the @/features alias.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/entities/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^@/entities(/|$)',
              message:
                'Within the entities layer use relative imports, not the @/entities alias.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/widgets/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^@/widgets(/|$)',
              message:
                'Within the widgets layer use relative imports, not the @/widgets alias.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^@/shared(/|$)',
              message:
                'Within the shared layer use relative imports, not the @/shared alias.',
            },
          ],
        },
      ],
    },
  },
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
      import: importPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^react', '^next', '^@?\\w'],
            ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
            ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
            ['^@/app'],
            ['^@/processes'],
            ['^@/pages'],
            ['^@/widgets'],
            ['^@/features'],
            ['^@/entities'],
            ['^@/shared'],
            ['^.+\\.s?css$'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
      'linebreak-style': ['error', 'unix'],
      'import/first': 'error',
      'import/newline-after-import': ['error', { count: 1 }],
      'import/no-duplicates': 'error',
      'import/no-default-export': 'error',
      'prettier/prettier': 'error',
      semi: 'off',
      'arrow-body-style': ['error', 'as-needed'],
      'react/self-closing-comp': 'error',
      'no-multiple-empty-lines': ['error', { max: 1 }],
      'no-empty': 'error',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['src/app/**/*.{ts,tsx}'],
    rules: {
      'import/no-default-export': 'off',
      'import/prefer-default-export': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^@/app(/|$)',
              message:
                'Within the app layer use relative imports, not the @/app alias.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/pages/**/*.{ts,tsx}'],
    rules: {
      'import/no-default-export': 'off',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^@/pages(/|$)',
              message:
                'Within the pages layer use relative imports, not the @/pages alias.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['*.{js,mjs,ts}', 'vite.config.ts'],
    rules: {
      'import/no-default-export': 'off',
    },
  },
  {
    files: ['**/*.d.ts'],
    rules: {
      'import/no-default-export': 'off',
    },
  },
  {
    files: ['src/App.tsx'],
    rules: {
      'import/no-default-export': 'off',
      'fsd/no-global-store-imports': 'off',
    },
  },
  // -------------------------------------------------------------------------
  // React-hooks RC rules — downgraded from `error` to `warn`.
  //
  // The default `reactHooks.configs.flat.recommended` enables several rules
  // from the experimental react-compiler track that flag patterns which are
  // technically suboptimal but still idiomatic across the codebase:
  //
  //   • `set-state-in-effect` — fires on the classic
  //     `useEffect(() => api.fetch().then(setData), [...])` data-fetching
  //     pattern. The proper fix is migration to TanStack Query (see
  //     `shared/lib/query/useApiQuery.ts` + `docs/tanstack_query.md`).
  //   • `static-components` — fires on render-helper functions defined
  //     inline inside a parent component (e.g. `const renderRow = () => ...`).
  //     Lifting them out requires threading large numbers of props.
  //   • `impure-function`, `refs` — small-scoped, surface in legacy code only.
  //
  // Keeping these as warnings lets the build stay green while the codebase
  // is incrementally refactored onto TanStack Query / module-level helpers.
  // Promote each rule back to `error` once its category is fully addressed.
  // -------------------------------------------------------------------------
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      // The compiler-track rules below piggy-back on the same migration plan:
      'react-hooks/exhaustive-effect-dependencies': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/use-memo': 'warn',
    },
  },
]);
