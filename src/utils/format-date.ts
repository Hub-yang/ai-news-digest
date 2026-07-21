export function formatDate(date: Date | null): string {
  if (!date)
    return ''
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
