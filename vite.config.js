// vite.config.js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path'; // 需引入path模块

export default defineConfig({
  plugins: [vue()],
  base: './',
  // 修复pnpm硬链接解析问题
  resolve: {
    preserveSymlinks: true, // 关键：支持pnpm的符号链接
    // 可选：配置别名，避免路径解析错误
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  optimizeDeps: {
    // 移除对@ant-design/icons-vue的exclude，让Vite正常预构建
    // 仅保留必要的exclude（如果有），若无则删除optimizeDeps
    // exclude: ['ant-design-vue'] // 建议也移除，让Vite自动处理
  }
});