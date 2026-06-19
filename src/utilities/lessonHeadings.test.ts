import { describe, it, expect } from 'vitest'
import { extractHeadings } from './lessonHeadings'

const doc = (children: any[]) => ({ root: { type: 'root', children } })
const heading = (tag: string, text: string) => ({
  type: 'heading',
  tag,
  children: [{ type: 'text', text }],
})

describe('extractHeadings', () => {
  it('returns h2/h3 in order with slug ids and levels', () => {
    const content = doc([
      heading('h2', 'Wprowadzenie'),
      { type: 'paragraph', children: [{ type: 'text', text: 'x' }] },
      heading('h3', 'Krok 1'),
      heading('h4', 'Pominąć'),
    ])
    expect(extractHeadings(content)).toEqual([
      { id: 'wprowadzenie', text: 'Wprowadzenie', level: 2 },
      { id: 'krok-1', text: 'Krok 1', level: 3 },
    ])
  })
  it('dedupes repeated heading text', () => {
    const content = doc([heading('h2', 'Setup'), heading('h2', 'Setup')])
    expect(extractHeadings(content).map((h) => h.id)).toEqual(['setup', 'setup-1'])
  })
  it('handles missing/empty content', () => {
    expect(extractHeadings(undefined)).toEqual([])
    expect(extractHeadings(doc([]))).toEqual([])
  })
  it('concatenates nested inline text (e.g. links) inside a heading', () => {
    const content = doc([
      {
        type: 'heading',
        tag: 'h2',
        children: [
          { type: 'text', text: 'Zobacz ' },
          { type: 'link', children: [{ type: 'text', text: 'dokumentację' }] },
        ],
      },
    ])
    expect(extractHeadings(content)).toEqual([
      { id: 'zobacz-dokumentacje', text: 'Zobacz dokumentację', level: 2 },
    ])
  })
})
