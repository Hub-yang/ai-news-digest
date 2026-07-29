/**
 * 拼出带 base 前缀的站内链接。
 *
 * 跨期跳转刻意用普通 <a>（整页加载）而不是 RouterLink：每一页的数据都由
 * vite-ssg 在构建期序列化进了各自的 HTML，走客户端路由反而要在运行时再去
 * 取一次数据，白白破坏「纯静态、运行时零请求」这个性质。
 *
 * 站点部署在 /ai-news-digest/ 子路径下，硬写 "/issues/2/" 会 404。
 */
export function siteUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
}
