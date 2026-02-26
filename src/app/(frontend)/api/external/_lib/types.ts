export type ContentFormat = 'markdown' | 'lexical'

interface MetaFields {
  title?: string
  description?: string
  image?: number
}

interface BaseRequest {
  contentFormat?: ContentFormat
  heroImage?: number
  meta?: MetaFields
  _status?: 'draft' | 'published'
  publishedAt?: string
}

export interface CreatePostRequest extends BaseRequest {
  title: string
  content: string | Record<string, unknown>
  categories?: (number | string)[]
  authors?: number[]
}

export interface CreateProjectRequest extends BaseRequest {
  title: string
  description: string | Record<string, unknown>
  technologies?: string[]
  githubUrl?: string
  productionUrl?: string
}

export interface DocSummary {
  id: number
  title: string
  slug: string
  _status: string
  createdAt: string
  updatedAt: string
}
