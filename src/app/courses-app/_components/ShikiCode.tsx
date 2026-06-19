import { highlightCode } from '@/utilities/shikiHighlighter'
import { t, type Locale } from '@/i18n'
import { CopyButton } from './CopyButton'

export async function ShikiCode({ code, lang, locale }: {
  code: string
  lang?: string
  locale: Locale
}) {
  const html = await highlightCode(code ?? '', lang)
  return (
    <figure className="lc not-prose">
      <figcaption className="lc__bar">
        <span className="lc__name">{lang ?? 'code'}</span>
        <CopyButton
          code={code ?? ''}
          copyLabel={t(locale, 'courses.lesson.copy')}
          copiedLabel={t(locale, 'courses.lesson.copied')}
        />
      </figcaption>
      <div className="lc__body" dangerouslySetInnerHTML={{ __html: html }} />
    </figure>
  )
}
