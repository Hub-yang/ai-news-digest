import process from 'node:process'
import vue from '@vitejs/plugin-vue'
import Icons from 'unplugin-icons/vite'
import { defineConfig } from 'vite'
import vueDevTools from 'vite-plugin-vue-devtools'

// Vite 的 loadEnv 只把 VITE_ 前缀的变量暴露给 import.meta.env，不会把 .env
// 写回真正的 process.env——而翻译逻辑读的是 process.env.DEEPL_API_KEY（CI 里
// 由 workflow 的 env 块设置）。本地开发时用 Node 原生 API 显式加载一次，
// 让 `pnpm build`/`pnpm dev` 也能读到同一个变量，无需新增 dotenv 依赖。
try {
  process.loadEnvFile()
}
catch {
  // 没有 .env 文件时静默跳过——翻译会走「无 key 跳过」的降级路径
}

export default defineConfig({
  base: '/ai-news-digest/',
  plugins: [vue(), vueDevTools(), Icons({ compiler: 'vue3' })],
  ssgOptions: {
    script: 'async',
  },
})
