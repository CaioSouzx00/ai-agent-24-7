import boundaries from 'eslint-plugin-boundaries'

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'src/shared/lib/api-types.ts'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      boundaries,
    },
    settings: {
      'boundaries/elements': [
        {
          type: 'app',
          pattern: 'src/app/**',
          mode: 'folder',
        },
        {
          type: 'feature',
          pattern: 'src/features/*',
          mode: 'folder',
        },
        {
          type: 'shared',
          pattern: 'src/shared/**',
          mode: 'folder',
        },
        {
          type: 'styles',
          pattern: 'src/styles/**',
          mode: 'folder',
        },
      ],
    },
    rules: {
      // Shared cannot import from features or app
      'boundaries/element-types': [
        'error',
        {
          default: 'allow',
          rules: [
            {
              from: 'shared',
              disallow: ['feature', 'app'],
              message: 'Shared modules must never depend on features or app.',
            },
            {
              from: 'feature',
              disallow: ['app'],
              message: 'Features must not depend on app root.',
            },
          ],
        },
      ],
      // Disallow importing internal files of other features directly
      'boundaries/entry-point': [
        'error',
        {
          default: 'disallow',
          rules: [
            {
              target: 'feature',
              allow: 'index.ts',
            },
            {
              target: 'shared',
              allow: '**',
            },
            {
              target: 'app',
              allow: '**',
            },
          ],
        },
      ],
    },
  },
]
