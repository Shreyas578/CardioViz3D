import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/predict': 'http://127.0.0.1:8000',
      '/metrics': 'http://127.0.0.1:8000',
      '/explain': 'http://127.0.0.1:8000',
      '/whatif': 'http://127.0.0.1:8000',
      '/plots': 'http://127.0.0.1:8000',
    }
  }
})
