export function formatDate(date: Date | null): string {
  if (!date || Number.isNaN(date.getTime()))
    return ''
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', year: 'numeric' })
}
