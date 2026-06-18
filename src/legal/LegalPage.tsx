import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import type { Locale } from '@/i18n'
import { LEGAL_CONTENT, type LegalDoc } from '@/legal/content'
import { remarkAutolinkBare } from '@/legal/remarkAutolinkBare'

/**
 * Shared server component that renders a legal document (Regulamin / Polityka
 * Prywatności) for a given locale. The markdown carries its own H1, so we rely
 * on it as the page heading (no duplicate <h1>). GFM is enabled for the tables
 * used by the privacy policy. Links are rendered clickable with safe rel attrs.
 */
export function LegalPage({ doc, locale }: { doc: LegalDoc; locale: Locale }) {
  const markdown = LEGAL_CONTENT[doc][locale]

  return (
    <div className="container py-16 md:py-20">
      <article className="legal-prose mx-auto max-w-3xl">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkAutolinkBare]}
          components={{
            a: ({ href, children, ...props }) => {
              const isExternal = !!href && /^https?:\/\//.test(href)
              return (
                <a
                  href={href}
                  {...(isExternal
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
                  {...props}
                >
                  {children}
                </a>
              )
            },
          }}
        >
          {markdown}
        </ReactMarkdown>
      </article>
    </div>
  )
}
