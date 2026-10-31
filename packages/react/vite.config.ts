import { defineConfig } from 'vite-plus'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  pack: {
    platform: 'neutral',
    tsconfig: 'tsconfig.build.json',
    dts: {
      generator: 'tsgo',
    },
    exports: true,
  },
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    environment: 'happy-dom',
  },
})
