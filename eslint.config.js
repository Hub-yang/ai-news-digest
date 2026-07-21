import antfu from '@antfu/eslint-config'

export default antfu({
  vue: true,
  typescript: true,
  ignores: ['dist/**'],
}, {
  files: ['src/data/fetch-sources.ts'],
  rules: {
    'no-console': 'off',
  },
})
