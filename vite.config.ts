import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isProd = mode === 'production'
  return {
    plugins: [react()],
    base: './', // 使用相对路径，确保在 Electron 中正确加载资源
    build: {
      outDir: 'build/web', // 统一构建目录
      emptyOutDir: true,
      sourcemap: !isProd,
      target: 'es2022',
      assetsInlineLimit: 0,
      rollupOptions: {
        output: {
          manualChunks: () => undefined
        }
      }
    },
    esbuild: isProd ? { drop: ['console', 'debugger'] } : undefined
  }
})
