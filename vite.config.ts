import { defineConfig } from 'vite-plus'

export default defineConfig({
  fmt: {
    singleQuote: true,
    semi: false,
    printWidth: 120,
    arrowParens: 'avoid',
    ignorePatterns: ['**/dist/**', '**/.vitepress/cache/**', 'apps/docs/api/**'],
  },
  lint: {
    ignorePatterns: ['**/dist/**', '**/.vitepress/cache/**', 'apps/docs/api/**'],
    jsPlugins: [{ name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' }],
    plugins: ['typescript'],
    rules: {
      'vite-plus/prefer-vite-plus-imports': 'error',
      'func-style': ['error', 'declaration'],
      'typescript/array-type': ['error', { default: 'generic' }],
      'typescript/consistent-type-definitions': ['error', 'interface'],
      'typescript/no-explicit-any': 'error',
    },
    options: { typeAware: true, typeCheck: true },
  },
  run: {
    cache: true,
  },
})
