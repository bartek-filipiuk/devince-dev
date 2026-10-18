import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { CopyField } from './CopyField'
import { WaitlistForm } from './WaitlistForm'

// ponytail: PL-only copy (the channel is Polish); /en/mcp shows the same page until there is an EN audience.

type Args = {
  searchParams: Promise<{ potwierdzone?: string }>
}

export const metadata: Metadata = {
  title: 'Subskrybuj kanał swoim agentem',
  description:
    'Kanał Bartka jako connector MCP dla Claude, ChatGPT, Cursora i Claude Code. Agent pyta, co nowego, i dostaje prompty, pliki i kulisy z filmów.',
}

const MCP_URL = 'https://devince.dev/api/channel/mcp'

// ponytail: UI paths as of 2026-10; clients move menus around, the URL is what matters
const CLIENTS = [
  {
    name: 'Claude (claude.ai w przeglądarce, aplikacja desktop)',
    steps:
      'Ustawienia → Connectors → Dodaj własny connector. Nazwa: bartek-yt, adres poniżej, bez logowania.',
    copy: MCP_URL,
  },
  {
    name: 'ChatGPT',
    steps:
      'Na planie płatnym: Ustawienia → Apps & Connectors → Advanced: włącz Developer mode, potem Create. Adres poniżej, uwierzytelnianie: brak.',
    copy: MCP_URL,
  },
  {
    name: 'Cursor',
    steps: 'Settings → Tools & MCP → New MCP Server albo wpis w ~/.cursor/mcp.json:',
    copy: `{ "mcpServers": { "bartek-yt": { "url": "${MCP_URL}" } } }`,
  },
  {
    name: 'Claude Code',
    steps: 'W terminalu:',
    copy: `claude mcp add --transport http bartek-yt ${MCP_URL}`,
  },
]

const PROMPTS = [
  'Co nowego na kanale Bartka od zeszłego tygodnia? Co z tego przyda się w moim projekcie?',
  'Znajdź u Bartka film, w którym model sam testował swoją grę, i pokaż mi kulisy.',
  'Pokaż prompt z najnowszego filmu i powiedz, jak go dopasować do mojego repo.',
]

const STEPS = [
  {
    title: 'Dodajesz kanał jako connector',
    body: 'Jeden adres wklejony w ustawieniach Claude, ChatGPT albo Cursora. Bez konta i bez instalowania czegokolwiek.',
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
            Potwierdzone. Raz w tygodniu napiszę, co nowego na kanale i na serwerze. Odpisz na
            pierwszy mail, jakiego agenta używasz.
          </p>
        ) : null}

        <header className="grid gap-12 md:grid-cols-[1fr_1.1fr] md:items-center">
          <div className="min-w-0">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary mb-4">
              Nowe · kanał jako connector MCP
            </p>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
              Subskrybuj kanał swoim agentem
            </h1>
            <p className="text-lg text-muted-foreground">
              Dzwonek na YouTube mówi, że jest nowy film. Agent podpięty pod kanał powie Ci, co z
              tego filmu przyda się w Twoim projekcie: prompt, kod, liczby z sesji.
            </p>
            <div className="mt-8 min-w-0">
              <p className="text-sm font-medium mb-2">Adres do wklejenia jako connector:</p>
              <CopyField value={MCP_URL} label="Adres serwera MCP" event="mcp_copy_url" />
            </div>
          </div>

          <figure
            aria-label="Przykładowa rozmowa z agentem"
            className="bg-[hsl(222_28%_10%)] text-[hsl(210_20%_88%)] font-mono text-sm shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs text-white/50">
              <span>agent · connector: bartek-yt</span>
              <span>przykład</span>
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
            Jak to działa
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

        <section className="mt-20" id="podlacz">
          <h2 className="text-2xl font-bold mb-8">Podłącz w minutę</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {CLIENTS.map((c) => (
              <div key={c.name} className="min-w-0 bg-card p-6 shadow-sm">
                <h3 className="font-semibold mb-2">{c.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{c.steps}</p>
                <CopyField value={c.copy} label={c.name} event="mcp_copy_client" />
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <h2 className="text-2xl font-bold mb-2">Od czego zacząć</h2>
          <p className="text-muted-foreground mb-6">Wklej agentowi jedno z tych pytań.</p>
          <div className="space-y-3">
            {PROMPTS.map((q) => (
              <CopyField key={q} value={q} label="Przykładowe pytanie" event="mcp_copy_prompt" />
            ))}
          </div>
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
            <p className="text-muted-foreground mb-4">
              Jedno narzędzie coś wysyła: odbiór paczki. Agent poprosi Cię o adres, a ja wyślę na
              niego link potwierdzający. Do newslettera nikt Cię przez agenta nie zapisze.
            </p>
            <p className="text-muted-foreground">
              Kanał oddaje dane, nie polecenia. Jeśli w materiałach jest coś do zrobienia, Twój
              agent pokaże Ci to i zapyta, a decyzja zostaje przy Tobie.
            </p>
          </div>
        </section>

        <section className="mt-20 grid gap-12 md:grid-cols-[1fr_1fr] border-t pt-16">
          <div>
            <h2 className="text-2xl font-bold mb-6">Jak to powstało</h2>
            <p className="text-muted-foreground mb-4">
              Serwer zbudowałem z agentami, przy kamerze. Film o tym, jak powstawał, co nie
              zadziałało i ile to kosztowało, wyjdzie na kanale.
            </p>
            <p className="text-muted-foreground">
              Coś nie działa albo brakuje Ci narzędzia? Odpisz na dowolny mail ode mnie.
            </p>
          </div>
          <div id="zapis" className="bg-card p-6 md:p-8 shadow-sm">
            <h2 className="text-2xl font-bold mb-2">Daj znać o nowościach</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Raz w tygodniu krótki mail: co nowego na kanale i na serwerze, plus jedno pytanie.
              Wypisujesz się jednym kliknięciem.
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
