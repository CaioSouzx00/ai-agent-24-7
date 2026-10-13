import boundaries from 'eslint-plugin-boundaries'
import tseslint from 'typescript-eslint'

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'src/shared/lib/api-types.ts'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      boundaries,
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.app.json',
        },
      },
      'boundaries/elements': [
        {
          type: 'app',
          pattern: 'src/app/**',
        },
        {
          type: 'feature',
          pattern: 'src/features/*',
        },
        {
          type: 'shared',
          pattern: 'src/shared/**',
        },
        {
          type: 'styles',
          pattern: 'src/styles/**',
        },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'allow',
          policies: [
            {
              from: { element: { type: 'shared' } },
              disallow: [
                { to: { element: { type: 'feature' } } },
                { to: { element: { type: 'app' } } },
              ],
              message: 'Shared modules must never depend on features or app.',
            },
            {
              from: { element: { type: 'feature' } },
              disallow: [
                { to: { element: { type: 'app' } } },
              ],
              message: 'Features must not depend on app root.',
            },
          ],
        },
      ],
    },
  },
]
