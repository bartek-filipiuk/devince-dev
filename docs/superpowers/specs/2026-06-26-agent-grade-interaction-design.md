# Spec — Agent-grade interaction ("drive your platform with your AI")

> Status: **zatwierdzony design** (brainstorming, 2026-06-26). Następny krok: epic + taski w CRM ACB, potem build (devince-first → backport).
> Robione **przed RAG-iem** — warstwa read/discovery to też fundament pod „ask the product".

## Cel i north-star

Sprzedawalna platforma (`course-platform-starter`) i devince mają już mocny silnik agentowy (external REST API z create/update/delete + działający MCP server). Problem nie jest „brak funkcji", tylko **(1) niewidoczność tego co mamy** i **(2) brak warstwy read/discovery**. Ta inicjatywa robi z tego klasę.

**North-star (= „done" epiku):** kupujący w ~2 min po deployu podłącza swoje AI (`claude mcp add` albo REST + skill) i **konwersacyjnie buduje/edytuje cały kurs** (program + lekcje + landing + cena) **oraz produkt download** — a agent **odczytuje i weryfikuje** własną pracę (list / by-id), **bez skrobania HTML** i **bez docsów spoza repo**.

## Ustalenia z audytu (2 równoległe agenty, 2026-06-26)

**Mamy (pełna parzystość paczka↔devince):** external REST API (`/api/external/*`, Bearer, timing-safe) z create/update/delete dla programs/lessons/products/app-assets/media/posts/projects + landing/layout; markdown→Lexical; PL/EN. Działający standalone MCP server (Streamable HTTP, własny Dockerfile/compose, 9–11 narzędzi). Paczka leak-free.

**Luki, które adresujemy:**
- Brak read/list/GET (poza 3 globalami) → agent ślepy, skrobie HTML. **To samo blokuje RAG.**
- Brak self-describing discovery (agent nie introspekuje API).
- MCP bez `lessons` i `products` (dwie najważniejsze kolekcje tylko przez REST).
- MCP server niewidoczny w docsach paczki (0 wzmianek, brak `.mcp.json.example`, brak quickstartu).
- `docs/EXTERNAL_API.md` opisuje tylko posts/projects/media (brak całej powierzchni kursowej); pełny doc żyje w skillu poza paczką.
- `EXTERNAL_API_TOKEN` w `.env.example` zakomentowany (API domyślnie 503); FEATURES.md kłamie „full CRUD".

## Zakres (wybór właściciela)

**B: powierzchnia + fundament read.** Discovery = **lekki self-describing manifest + endpointy read** (OpenAPI odłożone jako ewentualny follow-up). **Polityka: devince-first → backport do paczki** (backport jest częścią „done" każdego silnikowego taska). Docs/skill/quickstart/MCP-packaging robione po stronie paczki; devince dostaje odświeżenie docsów przy okazji.

## Design — 7 tasków, 2 fazy

### Faza 1 — Fundament read & discovery (devince → backport) — odblokowuje też RAG

**T1. Endpointy read (list + by-id).**
`GET /api/external/<zasób>` (lista: paginacja `page`/`limit`, opcjonalny filtr po slug/status) + `GET /api/external/<zasób>/:idOrSlug` (pojedynczy) dla **programs, lessons, products, posts, projects** (+ lista dla media, app-assets). Zwracają te same kształty, które agent zapisuje (reuse istniejących serializerów). Bearer auth jak reszta. Honorują `?locale=`. TDD + integ.
*Done:* agent po `POST` może odczytać dokument i wylistować kolekcję, żeby znaleźć `idOrSlug`; backport do paczki.

**T2. Manifest self-describing.**
`GET /api/external` → maszynowo-czytelny JSON: lista zasobów, ich metody (GET/POST/PATCH/PUT/DELETE), pola wymagane/opcjonalne, dozwolone enumy (`type`, `pricing`, `accessMode`, `format`), typy bloków landing/layout, link do auth. Jedno źródło, z którego agent uczy się API bez docsów. Generowany z istniejących definicji pól/typów (nie ręczna lista, żeby nie gnił).
*Done:* `curl GET /api/external` (bez auth lub z auth — do decyzji w planie) zwraca opis pozwalający agentowi zbudować poprawny `POST /programs` bez zewnętrznych docsów; backport.

**T3. MCP parytet + read.**
Dodać narzędzia `create_lesson`/`update_lesson`, `create_product`/`update_product` oraz lekkie narzędzie read (`get`/`list` po zasobie i idOrSlug). Cienkie wrappery nad REST (istniejący wzorzec `ApiClient.fetch`). Zaktualizować `docs/MCP_SERVER.md` (lista narzędzi).
*Done:* agent na samym MCP zbuduje pełny kurs (program+lekcje+cena) i produkt oraz zweryfikuje wynik; backport do paczki (`mcp-server/`).

### Faza 2 — Uwidocznić & udokumentować (paczka; devince docs przy okazji)

**T4. Odświeżyć kanoniczne docs API.**
Przepisać `docs/EXTERNAL_API.md` (paczka) + devince `docs/EXTERNAL-CONTENT-API.md` na **pełną powierzchnię**: programs/lessons/products/app-assets/landing/layout + nowe read/manifest. Poprawić fałszywe „full CRUD" w `FEATURES.md`. Zależy od T1+T2 (dokumentujesz to, co istnieje).

**T5. Uwidocznić MCP server (paczka).**
`mcp-server/README.md` + **`.mcp.json.example`** (odgitignorować przykład, commitnąć) + one-liner `claude mcp add --transport http <name> https://mcp.<domena>/mcp --header "Authorization: Bearer <token>"` + sekcja w `DEPLOYMENT.md`. Odzwierciedlić nowe narzędzia z T3. Zależy od T3.

**T6. Shipować skill `course-content` + recipes w paczce.**
Genericized clone `~/.claude/skills/devince-content/` (strip Coolify/devince): auth, route table, field reference, gotchas, recipes end-to-end (płatny kurs / lead-magnet / cena / landing / produkt-download / EN / **weryfikacja przez nowe read**). Zależy od T1+T2 (recipes używają read/manifest).

**T7. Quickstart „Podłącz swoje AI w 2 min" + fix tokenu.**
Sekcja w `README`/`SETUP.md`: deploy → wygeneruj+ustaw `EXTERNAL_API_TOKEN` → (opcj.) deploy MCP → `claude mcp add` → „stwórz kurs". Usunąć tarcie zakomentowanego tokenu (mocno udokumentować; quickstart go ustawia). Zależy od T5+T6.

### Graf zależności
- T4 ⟵ T1, T2
- T5 ⟵ T3
- T6 ⟵ T1, T2
- T7 ⟵ T5, T6

## ⛔ Poza zakresem (→ osobny epic „Engine hardening", tier C)
idempotency/upsert (re-run bez duplikatów) · walidacja 400-zamiast-500 + koniec silent field-drop · sprawdzanie istnienia referencji (`downloadFiles`, `coverImage`, `dependencies`) · spójne `{data}` envelope (DELETE) · fix locale w lesson-create · bezpieczne array/locale (landing/layout/tiers) · przycisk „generuj token" w panelu admina · pełny OpenAPI 3.1. Zapiszę jako notatkę/epic, żeby nie zginęło.

## Weryfikacja (per task: TDD + integ + build; całość: north-star)
Akceptacja epiku = scenariusz north-star przechodzi end-to-end na paczce: świeży deploy → `claude mcp add` → konwersacyjnie „stwórz płatny kurs z 3 lekcjami i landingiem + produkt download" → agent listuje/odczytuje i potwierdza wynik, korzystając wyłącznie z shipowanych docsów/skilla/manifestu.

## Polityka boilerplate
Build w **devince first**; backport do `course-platform-starter` jako część „done" silnikowych tasków. Docs/skill/quickstart — natywnie w paczce.
