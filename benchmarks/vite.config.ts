import { defineConfig } from 'vite-plus'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'happy-dom',
    benchmark: {
      include: ['src/**/*.bench.{ts,tsx}'],
    },
  },
  run: {
    tasks: {
      bench: {
        command: 'vp test bench --run',
        cache: false,
      },
    },
  },
})
