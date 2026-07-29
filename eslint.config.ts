import antfu from '@antfu/eslint-config'

export default antfu({
  vue: true,
  typescript: true,
  // content/ 是抓取来的数据，不是源码——里面照搬了各家 feed 的原文，
  // 全角空格之类的东西会触发 no-irregular-whitespace，而那正是原始内容。
  ignores: ['dist/**', 'content/**'],
}, {
  files: ['src/data/fetch-sources.ts', 'scripts/**/*.ts'],
  rules: {
    'no-console': 'off',
  },
}, {
  files: ['pnpm-workspace.yaml'],
  rules: {
    // 这条规则会往 pnpm-workspace.yaml 里写 trustPolicy: no-downgrade，
    // 而该策略会让 @types/node 的传递依赖 undici-types@6.21.0 因缺少 provenance
    // 直接装不上（ERR_PNPM_TRUST_DOWNGRADE），install 全线失败。
    // 要开启它得先升 @types/node，那是独立的决定，不在本次改动范围内。
    'pnpm/yaml-enforce-settings': 'off',
  },
})
