import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite-plus'
import vueDevtools from 'vite-plugin-vue-devtools'

export default defineConfig({
  plugins: [vue(), vueDevtools()],
  resolve: {
    tsconfigPaths: true,
  },
})
