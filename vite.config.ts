import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
  plugins: [uni()],
  server: {
    proxy: {
      '/onenet-api': {
        target: 'https://bwmd.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/onenet-api/, '/api'),
      },
    },
  },
})
