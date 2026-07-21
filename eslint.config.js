import antfu from '@antfu/eslint-config'

export default antfu({
  vue: true,
  typescript: true,
  ignores: ['output/**'],
}, {
  files: ['src/build.ts'],
  rules: {
    // 构建脚本的进度信息属于预期的 CLI 输出，不是遗留的调试日志
    'no-console': 'off',
  },
})
