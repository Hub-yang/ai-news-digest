export default {
  '*': 'eslint --fix',
  '*.{ts,vue}': 'bash -c \'vue-tsc --noEmit\'',
}
