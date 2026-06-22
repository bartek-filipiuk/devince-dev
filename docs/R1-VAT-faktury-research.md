# R1 — Faktury VAT: stan, ryzyko i pytania do księgowej

> **Cel dokumentu:** podkładka do konsultacji z księgową/doradcą podatkowym **przed** budową automatycznego fakturowania na devince (apps.devince.dev + courses.devince.dev).
> Stan na: **2026-06-21**. To NIE jest porada podatkowa — wymaga potwierdzenia przez doradcę.
> Powiązane: `docs/ROADMAP.md` (R1), `src/legal/content.ts` (Regulamin + Polityka prywatności).

## Kontekst sprzedawcy

- **Bartłomiej Filipiuk Devins**, JDG (CEIDG), ul. Stacyjna 1, 53-613 Wrocław, **NIP 596 158 99 01**.
- **Status VAT: czynny podatnik VAT.**
- Sprzedaż: produkty **cyfrowe** — kursy online (dostęp) + pliki do pobrania (boilerplate/apki). Płatność: **Stripe Checkout**, jednorazowa (karta, BLIK). Bez konta kupującego.
- Odbiorcy: PL, inne kraje **UE**, oraz **spoza UE**; zarówno **B2C** (konsumenci), jak i **B2B** (firmy).

## Stan techniczny DZIŚ — faktur brak

Po przeglądzie kodu (`api/apps/checkout`, `api/courses/checkout`, `api/stripe/webhook`, `utilities/brevo.ts`):

- Checkout tworzy `checkout.sessions.create` **bez** `invoice_creation`, **bez** `tax_id_collection`, **bez** `automatic_tax`/Stripe Tax, **bez** `customer_creation`.
- Webhook po opłaceniu wysyła tylko **link do pobrania / dostęp do kursu** (mail Brevo). **Żadnej faktury, żadnego NIP, żadnego rozliczenia VAT.**
- Czyli: **nie zbieramy nawet danych do faktury** (NIP, nazwa, adres firmy) i nic nie jest wystawiane automatycznie.

## Ekspozycja prawna (do domknięcia)

1. **Regulamin/Polityka już deklarują wystawianie faktur** (`src/legal/content.ts`: „Wystawianie i przechowywanie faktur", retencja dokumentów księgowych 5 lat). Prawnie obiecujemy fakturę — technicznie nic jej nie tworzy.
2. **KSeF — obowiązek już trwa.** Ustawa z 5.08.2025 (Dz.U. 2025 poz. 1203): od **1 kwietnia 2026** wszyscy podatnicy z siedzibą w PL (w tym JDG, czynni i zwolnieni). Faktury **B2B muszą iść jako ustrukturyzowany XML (FA(2)) do KSeF**. Kary zawieszone do 31.12.2026, ale **obowiązek już obowiązuje**. **B2C — z KSeF zwolnione (dobrowolne).**
3. **Pytanie otwarte:** czy były już sprzedaże **B2B** po 1.04.2026 bez faktury w KSeF? Jeśli tak — do domknięcia z księgową.

## Dlaczego sama faktura Stripe NIE wystarczy (dla czynnego VAT)

- Faktura generowana przez Stripe (`invoice_creation`) **nie spełnia art. 106e ustawy o VAT**: brak poprawnego rozbicia netto/VAT/brutto wg polskich stawek, brak polskich oznaczeń (ZW/NP/0% WDT/odwrotne obciążenie), numeracja w formacie Stripe (`PREFIX-NR`), nie polska numeracja ciągła.
- **Stripe nie integruje się z KSeF** i nigdy nie wpuści PDF-a (KSeF przyjmuje tylko XML).
- Sam Stripe traktuje swoje PDF-y jako „payment confirmation", nie dokument księgowy. Konsensus polskich księgowych: **oficjalną fakturę trzeba wystawić w polskim systemie**, dokument Stripe = co najwyżej potwierdzenie płatności / źródło danych.

## Proponowana najlżejsza ZGODNA architektura (do akceptacji)

```
Stripe Checkout (płatność + NIP via tax_id_collection [+ Stripe Tax na VAT])
        │  webhook checkout.session.completed
        ▼
Fakturownia API  →  oficjalna faktura VAT (numeracja PL, VAT, KSeF dla B2B)
        │
        ▼
mail do kupującego z linkiem do faktury (PDF)  +  archiwizacja
```

- **Fakturownia** (REST API): tworzy zgodną fakturę, wysyła do **KSeF** (`gov_save_and_send`), obsługuje **OSS** (EU B2C), **reverse-charge** (EU B2B), waluty EUR/USD z VAT w PLN, faktury EN. Alternatywa: **inFakt**.
- **Stripe Tax** (opcjonalnie, krok 2): liczy VAT poprawnie (23% PL, stawki docelowe EU B2C, reverse-charge EU B2B, brak poza UE). **Nie składa** deklaracji — JPK_VAT i OSS (VIU-DO) robi księgowa. Wymaga rejestracji (PL VAT + Union OSS) w Dashboard.
- **Uwaga techniczna:** `tax_id_collection` w Stripe sprawdza tylko **format** NIP, walidacja **VIES** jest asynchroniczna po zakupie → trzeba dorobić reconciliację (reverse-charge zastosowany na format, a legalne 0% wymaga ważnego numeru).

## PYTANIA DO KSIĘGOWEJ (to przesądza budowę)

1. **Stawka VAT dla naszych produktów cyfrowych.** Kursy online (nagrane, automatyczny dostęp) i pliki do pobrania — czy to **usługa elektroniczna 23%**? Czy któryś produkt łapie się na zwolnienie/inną stawkę (np. usługi kształcenia art. 43 ust. 1 pkt 29 — raczej NIE dla automatycznych nagrań, ale prosimy o potwierdzenie)? **To fundament — bez tego nie ustawimy stawek.**
2. **Faktura Stripe jako dokument pomocniczy.** Potwierdzić: oficjalną fakturę wystawiamy w Fakturowni (lub inFakt), a PDF Stripe traktujemy tylko jako potwierdzenie płatności — OK?
3. **Numeracja.** Czy sprzedaż online ma mieć **osobną serię numeracji** w Fakturowni, czy wspólną z resztą działalności? Jak uniknąć kolizji z fakturami wystawianymi poza systemem?
4. **B2C — automatycznie czy na żądanie?** Czy wystawiamy fakturę **każdemu konsumentowi automatycznie**, czy **tylko na żądanie** (kupujący ma 3 miesiące na zgłoszenie)? To zmienia UX checkoutu.
5. **Kasa fiskalna / paragon.** Sprzedaż B2C usług cyfrowych z **pełną zapłatą elektroniczną** — czy jest **zwolnienie z kasy fiskalnej** (poz. 37/38 rozporządzenia o zwolnieniach), czy potrzebujemy kasy/paragonu?
6. **OSS / sprzedaż EU B2C.** Czy przekroczyliśmy już **10 000 €/rok** sprzedaży transgranicznej EU B2C (próg OSS)? Czy rejestrujemy **OSS teraz**, czy do progu liczymy **23% PL**? Czy włączamy Stripe Tax + rejestrację OSS (VIU-R)?
7. **KSeF B2B.** Potwierdzić obowiązek od 1.04.2026 dla nas i czy **były już sprzedaże B2B** do domknięcia. Czy faktury B2B do **firm zagranicznych** (EU/poza EU) też idą do KSeF (wg researchu: tak, bo decyduje siedziba sprzedawcy).
8. **Reverse-charge EU B2B.** Warunki zastosowania (ważny VAT-ID w VIES), oznaczenie „odwrotne obciążenie", obsługa przypadku gdy VIES odrzuci numer po zakupie.
9. **Dane sprzedawcy na fakturze.** Potwierdzić pełną nazwę, adres, NIP, ewentualny rachunek, stopki/oznaczenia wymagane na fakturze.

## Decyzja po konsultacji

Po odpowiedziach księgowej wracamy do wyboru ścieżki R1:
- **lean-R1**: Fakturownia z webhooka (23% PL na start) + zbieranie NIP na checkoucie + mail z fakturą → później Stripe Tax/OSS + KSeF-reconciliacja.
- vs pełny zakres od razu (Stripe Tax + OSS + KSeF B2B + reverse-charge async).

Budujemy wg zasad repo: `brainstorming → spec → plan → subagent-driven build`, branch od `main`, PR, bez deployu.

## Źródła (dostęp 2026-06-21)

- KSeF terminy: https://ksef.podatki.gov.pl/informacje-ogolne-ksef-20/podstawy-prawne-oraz-kluczowe-terminy/ · Dz.U. 2025 poz. 1203: https://dziennikustaw.gov.pl/DU/2025/1203 · KSeF konsumenci: https://ksef.podatki.gov.pl/konsumenci-i-osoby-fizyczne/
- Art. 106e: https://lexlege.pl/ustawa-o-podatku-od-towarow-i-uslug/art-106e
- Stripe Tax: https://docs.stripe.com/tax/how-tax-works · EU: https://docs.stripe.com/tax/supported-countries/european-union · Tax IDs: https://docs.stripe.com/tax/checkout/tax-ids · Filing: https://docs.stripe.com/tax/filing
- Stripe Invoicing: https://docs.stripe.com/invoicing/customize
- Fakturownia API: https://app.fakturownia.pl/api · KSeF: https://github.com/fakturownia/API/blob/master/KSeF.md · inFakt API: https://docs.infakt.pl/
- OSS: https://vat-one-stop-shop.ec.europa.eu/one-stop-shop_en · biznes.gov.pl: https://www.biznes.gov.pl/pl/portal/00270 · OSS rejestracja: https://www.podatki.gov.pl/vat/wyjasnienia/rejestracja-do-procedury-unijnej-oraz-nieunijnej-oss-i-procedury-importu-ioss-180424/
