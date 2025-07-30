import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // 使用相对路径，确保在 Electron 中正确加载资源
  build: {
    outDir: 'build/web', // 统一构建目录
    emptyOutDir: true
  }
})
