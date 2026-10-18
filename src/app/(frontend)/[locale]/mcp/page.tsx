import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { WaitlistForm } from './WaitlistForm'

// ponytail: PL-only copy (the channel is Polish); /en/mcp shows the same page until there is an EN audience.

type Args = {
  searchParams: Promise<{ potwierdzone?: string }>
}

export const metadata: Metadata = {
  title: 'Subskrybuj kanał swoim agentem',
  description:
    'Kanał Bartka jako connector MCP dla Claude, ChatGPT i Cursora. Agent pyta, co nowego, i dostaje prompty, pliki i kulisy z filmów. Lista testerów otwarta.',
}

const STEPS = [
  {
    title: 'Dodajesz kanał jako connector',
    body: 'Jeden adres wklejony w ustawieniach Claude, ChatGPT albo Cursora. Nic nie instalujesz na komputerze.',
  },
  {
    title: 'Pytasz, kiedy chcesz',
    body: '„Co nowego od zeszłego tygodnia?”, „W którym filmie były testy w Playwright?”. Agent sprawdza kanał wtedy, gdy go o to poprosisz.',
  },
  {
    title: 'Agent dopasowuje to do Ciebie',
    body: 'On zna Twój projekt, kanał daje mu materiał z filmów. Z tego dostajesz trzy rzeczy do wzięcia zamiast 20 minut do obejrzenia.',
  },
]

const FEED = [
  ['Co nowego', 'filmy od wybranej daty, z rozdziałami i jednym zdaniem o tym, co z nich wynika'],
  ['Prompty i pliki', 'dokładnie to, co wpisałem i co z tego wyszło, gotowe do skopiowania'],
  ['Kulisy sesji', 'czasy, tokeny, testy i to, czego model nie sprawdził'],
  ['Wyszukiwanie', 'po wszystkich filmach naraz, także po tym, co pada w nagraniu'],
  ['Paczki', 'te same, które są pod filmami, bez szukania linku w opisie'],
]

export default async function McpPage({ searchParams }: Args) {
  const { potwierdzone } = await searchParams

  return (
    <div className="container py-16 md:py-24">
      <div className="max-w-5xl mx-auto">
        {potwierdzone ? (
          <p role="status" className="mb-12 border-l-4 border-primary bg-card p-4 font-medium">
            Potwierdzone, jesteś na liście testerów. Pierwszy mail przyjdzie, gdy ruszy budowa.
            Odpisz na niego, jakiego agenta używasz.
          </p>
        ) : null}

        <header className="grid gap-12 md:grid-cols-[1fr_1.1fr] md:items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary mb-4">
              Eksperyment · lista testerów otwarta
            </p>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
              Subskrybuj kanał swoim agentem
            </h1>
            <p className="text-lg text-muted-foreground">
              Dzwonek na YouTube mówi, że jest nowy film. Agent podpięty pod kanał powie Ci, co z
              tego filmu przyda się w Twoim projekcie: prompt, kod, liczby z sesji.
            </p>
          </div>

          <figure
            aria-label="Przykładowa rozmowa z agentem"
            className="bg-[hsl(222_28%_10%)] text-[hsl(210_20%_88%)] font-mono text-sm shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs text-white/50">
              <span>agent · connector: bartek-yt</span>
              <span>tak to ma wyglądać</span>
            </div>
            <div className="space-y-4 p-5 leading-relaxed">
              <p>
                <span className="text-[hsl(215_85%_70%)]">ty&gt;</span> co nowego na kanale Bartka?
                coś dla mojego projektu?
              </p>
              <div className="space-y-2 border-l-2 border-[hsl(215_85%_55%)] pl-4">
                <p>
                  Najnowszy film (18.10): „Opus 5.5 vs GPT-6: jedna gra, dwa podejścia, jeden
                  werdykt”.
                </p>
                <p className="text-white/60">Do wzięcia:</p>
                <ul className="space-y-1">
                  <li>· prompt, z którego powstały obie gry</li>
                  <li>· obie gry do odpalenia lokalnie</li>
                  <li>
                    · kulisy: oba modele skończyły po ok. 30 min, Opus zużył ok. 102 tys. tokenów,
                    GPT-6 ok. 54 tys.
                  </li>
                </ul>
                <p className="text-white/60">Pod Twój projekt:</p>
                <p>
                  pytanie kontrolne po każdym buildzie: „co obejmował prompt, co zrobione, a co
                  wyhalucynowane”. Dopisać do Twojego CLAUDE.md?
                </p>
              </div>
            </div>
          </figure>
        </header>

        <section className="mt-20">
          <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-muted-foreground mb-8">
            Jak to ma działać
          </h2>
          <ol className="grid gap-8 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="bg-card p-6 shadow-sm">
                <span className="font-mono text-3xl font-bold text-primary">{`0${i + 1}`}</span>
                <h3 className="text-lg font-semibold mt-3 mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-20 grid gap-12 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold mb-6">Co agent dostanie z kanału</h2>
            <dl className="space-y-4">
              {FEED.map(([term, desc]) => (
                <div key={term} className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:gap-4">
                  <dt className="font-mono text-sm font-semibold text-primary">{term}</dt>
                  <dd className="text-muted-foreground">{desc}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-6">Czego nie będzie</h2>
            <p className="text-muted-foreground mb-4">
              Agent nic nie robi sam. Czyta kanał tylko wtedy, gdy go zapytasz. Żadnych powiadomień,
              żadnego kodu do uruchomienia u Ciebie, żadnego dostępu do Twoich plików z mojej
              strony.
            </p>
            <p className="text-muted-foreground">
              Kanał oddaje dane, nie polecenia. Jeśli w materiałach jest coś do zrobienia, Twój
              agent pokaże Ci to i zapyta, a decyzja zostaje przy Tobie.
            </p>
          </div>
        </section>

        <section className="mt-20 grid gap-12 md:grid-cols-[1fr_1fr] border-t pt-16">
          <div>
            <h2 className="text-2xl font-bold mb-6">Gdzie jesteśmy</h2>
            <p className="text-muted-foreground mb-4">
              Serwera jeszcze nie ma. Zacznę go budować, gdy zapisze się 10 osób, a pierwsze 20
              podłączy swojego agenta przed wszystkimi.
            </p>
            <p className="text-muted-foreground">
              Każdą sesję budowy nagrywam. Z tego będzie film i kulisy dla testerów: prompty,
              decyzje i to, co nie zadziałało.
            </p>
          </div>
          <div id="zapis" className="bg-card p-6 md:p-8 shadow-sm">
            <h2 className="text-2xl font-bold mb-2">Dołącz do testów</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Raz w tygodniu krótki mail o teście: co dodałem i jedno pytanie. Wypisujesz się jednym
              kliknięciem.
            </p>
            <WaitlistForm />
            <p className="mt-4 text-xs text-muted-foreground">
              Dane przetwarzam według{' '}
              <Link href="/polityka-prywatnosci" className="underline">
                polityki prywatności
              </Link>
              .
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
