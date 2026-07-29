import process from 'node:process'

/**
 * 本地跑脚本时加载 .env。
 *
 * translate.ts 读的是 process.env.DEEPL_API_KEY——CI 里由 workflow 的 env 块
 * 提供，本地则在 .env 里。vite.config.ts 已经为 build/dev 做过同样的事，但
 * `tsx scripts/*.ts` 根本不经过 Vite，不显式加载的话本地出刊会静默跳过翻译
 * （走「无 key 降级」路径），而且不会有任何报错提示。
 */
export function loadEnv(): void {
  try {
    process.loadEnvFile()
  }
  catch {
    // 没有 .env 是正常情况（CI、fork），翻译会走无 key 的降级路径
  }
}
