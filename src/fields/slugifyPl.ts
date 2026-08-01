/**
 * Slugify świadomy polskich znaków.
 *
 * Payload domyślnie robi `replace(/[^\w-]+/g, '')`, a `\w` bez flagi unicode to
 * tylko [A-Za-z0-9_]. Efekt: diakrytyki są WYCINANE, nie transliterowane, więc
 * "Tyle zajęło całej" dawało slug "tyle-zajo-caej". Tutaj najpierw rozkładamy
 * znaki przez NFD i zdejmujemy znaki łączące (é → e, ä → a), a dopiero potem
 * czyścimy resztę.
 *
 * `ł`/`Ł` obsługujemy osobno, bo to samodzielne litery z kreską — NFD ich nie
 * rozkłada i bez tego wypadałyby całkiem ("łódź" → "d").
 */
const STROKED_L = /ł/g
const STROKED_L_UPPER = /Ł/g
const COMBINING_MARKS = /[̀-ͯ]/g

export const slugifyPl = (value?: string | null): string =>
  (value ?? '')
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(STROKED_L, 'l')
    .replace(STROKED_L_UPPER, 'L')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()

/** Adapter pod `slugField({ slugify })` — Payload woła to z obiektem argumentów. */
export const slugifyField = ({ valueToSlugify }: { valueToSlugify?: string | null }): string =>
  slugifyPl(valueToSlugify)
