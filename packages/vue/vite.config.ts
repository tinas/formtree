import { defineConfig } from 'vite-plus'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  pack: {
    entry: {
      index: 'src/index.ts',
      devtools: 'src/devtools/index.ts',
    },
    platform: 'neutral',
    tsconfig: 'tsconfig.build.json',
    dts: {
      generator: 'tsgo',
    },
    exports: true,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'happy-dom',
  },
})
