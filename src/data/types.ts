export interface Source {
  name: string
  url: string
}

export interface FeedItem {
  title: string
  link: string
  formattedDate: string
  description: string
}

export interface SourceResult {
  name: string
  items: FeedItem[]
  error: string | null
}
