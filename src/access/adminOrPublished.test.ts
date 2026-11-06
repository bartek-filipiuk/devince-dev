import { describe, it, expect } from 'vitest'
import { adminOrPublished } from './adminOrPublished'

const call = (user: any) => adminOrPublished({ req: { user } } as any)
const publishedOnly = { _status: { equals: 'published' } }

describe('adminOrPublished', () => {
  it('limits anonymous to published', () => expect(call(null)).toEqual(publishedOnly))
  it('limits customer to published', () => expect(call({ roles: ['customer'] })).toEqual(publishedOnly))
  it('limits user without roles to published', () => expect(call({})).toEqual(publishedOnly))
  it('allows admin to read drafts', () => expect(call({ roles: ['admin'] })).toBe(true))
})
