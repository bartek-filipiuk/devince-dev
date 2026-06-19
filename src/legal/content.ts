/**
 * Legal documents (Regulamin + Polityka Prywatności), PL + EN, rendered by the
 * /[locale]/regulamin and /[locale]/polityka-prywatnosci routes.
 *
 * Content is markdown (rendered to the page). Seller data is embedded.
 *
 * IMPORTANT (pending review): these are production-grade drafts written from a
 * current PL/EU legal research pass (consumer rights act incl. 2023 digital-content
 * rules + 2023/2673 withdrawal-function, UŚUDE, RODO). The owner will have a Polish
 * e-commerce lawyer confirm: (a) course = treść vs usługa cyfrowa + matching
 * withdrawal/refund rule, (b) VAT/OSS price presentation, (c) final wording of the
 * 19.06.2026 withdrawal-function clause. Do NOT treat as legal advice.
 *
 * Art. 38 pkt 13 loss-of-withdrawal-right for the downloadable product is
 * IMPLEMENTED: the apps checkout has a separate unchecked consent checkbox
 * (apps.product.consent) that gates the buy button; /api/apps/checkout enforces
 * it server-side; the consent timestamp is stored on the DownloadGrant
 * (withdrawalConsentAt) and echoed back in the download email as the
 * durable-medium confirmation (see sendDownloadLinkEmail). Wording here in §6.2
 * must stay consistent with that checkbox + email copy.
 */

import type { Locale } from '@/i18n'

export type LegalDoc = 'regulamin' | 'polityka-prywatnosci'

export const LEGAL_TITLES: Record<LegalDoc, Record<Locale, string>> = {
  regulamin: { pl: 'Regulamin', en: 'Terms of Service' },
  'polityka-prywatnosci': { pl: 'Polityka Prywatności', en: 'Privacy Policy' },
}

export const LEGAL_UPDATED: Record<Locale, string> = {
  pl: '18 czerwca 2026',
  en: '18 June 2026',
}

const SELLER = {
  name: 'Bartłomiej Filipiuk Devins',
  address: 'ul. Stacyjna 1, 53-613 Wrocław',
  nip: '596 158 99 01',
  email: 'bartek@devince.dev',
}

const regulaminPL = `
# Regulamin

**Data ostatniej aktualizacji: ${LEGAL_UPDATED.pl}**

## §1. Postanowienia ogólne i dane Sprzedawcy

1. Niniejszy Regulamin określa zasady korzystania ze sklepu internetowego dostępnego pod adresami **devince.dev**, **apps.devince.dev** oraz **courses.devince.dev** (dalej: „Sklep").
2. Sprzedawcą i usługodawcą jest **${SELLER.name}**, ${SELLER.address}, NIP: **${SELLER.nip}**, wpisany do Centralnej Ewidencji i Informacji o Działalności Gospodarczej (CEIDG) prowadzonej przez ministra właściwego do spraw gospodarki (dalej: „Sprzedawca").
3. Kontakt ze Sprzedawcą, w tym adres do składania reklamacji i oświadczeń o odstąpieniu od umowy: e-mail **${SELLER.email}**, adres korespondencyjny: ${SELLER.address}.
4. Regulamin jest udostępniany nieodpłatnie przed zawarciem umowy, w sposób umożliwiający jego pozyskanie, odtworzenie, utrwalenie i wydrukowanie.
5. **Definicje:** *Konsument* — osoba fizyczna zawierająca umowę niezwiązaną bezpośrednio z jej działalnością gospodarczą lub zawodową (oraz osoba fizyczna prowadząca działalność, dla której umowa nie ma charakteru zawodowego — „przedsiębiorca na prawach konsumenta"); *Produkt cyfrowy* — plik lub treść cyfrowa dostarczana bez nośnika materialnego (np. paczka „skill"); *Kurs* — usługa/treść cyfrowa polegająca na udostępnieniu dostępu do lekcji online; *Treść cyfrowa* i *Usługa cyfrowa* — w rozumieniu ustawy o prawach konsumenta.

## §2. Usługi świadczone drogą elektroniczną

1. Sprzedawca świadczy drogą elektroniczną usługi: przeglądanie Sklepu, złożenie zamówienia, dostarczenie Produktu cyfrowego (poprzez podpisany, wygasający link do pobrania wysyłany na adres e-mail) oraz — w przypadku Kursów — prowadzenie konta i udostępnianie lekcji online.
2. Zakup Produktu cyfrowego nie wymaga założenia konta. Dostęp do Kursu wymaga konta tworzonego automatycznie po zakupie (hasło ustawiane przez link wysyłany e-mailem).
3. Zakazane jest dostarczanie przez Klienta treści o charakterze bezprawnym.

## §3. Wymagania techniczne

Do korzystania ze Sklepu niezbędne są: urządzenie z dostępem do Internetu, aktualna przeglądarka internetowa, aktywne konto poczty elektronicznej; do otwarcia Produktu cyfrowego — oprogramowanie obsługujące jego format; do Kursu — konto w Sklepie. Link do pobrania Produktu cyfrowego jest ważny przez czas ograniczony (7 dni) oraz ma ograniczoną liczbę pobrań (5).

## §4. Ceny i płatności

1. Ceny podane są w Sklepie w złotych polskich (PLN) lub dolarach amerykańskich (USD) i są cenami całkowitymi (zawierają należne podatki, o ile mają zastosowanie).
2. Płatności obsługuje operator **Stripe** (Stripe Payments Europe, Ltd.). Sprzedawca nie przechowuje danych karty płatniczej.
3. Umowa zostaje zawarta z chwilą potwierdzenia płatności przez operatora płatności.

## §5. Dostawa (wykonanie umowy)

1. **Produkt cyfrowy:** po zaksięgowaniu płatności Sprzedawca wysyła na podany adres e-mail link do pobrania pliku. Dostarczenie następuje z chwilą udostępnienia pliku do pobrania pod tym linkiem.
2. **Kurs:** po zakupie tworzone jest konto i wysyłany e-mail z linkiem do ustawienia hasła; dostęp do lekcji jest aktywny po zalogowaniu.

## §6. Prawo odstąpienia od umowy (Konsument)

1. Konsument może w terminie **14 dni** odstąpić od umowy zawartej na odległość bez podania przyczyny, składając oświadczenie (np. e-mailem na ${SELLER.email}); można skorzystać ze wzoru formularza stanowiącego załącznik nr 2 do ustawy o prawach konsumenta. Termin liczy się od dnia zawarcia umowy.
2. **Produkt cyfrowy — utrata prawa odstąpienia (art. 38 pkt 13 ustawy o prawach konsumenta):** prawo odstąpienia **nie przysługuje**, jeżeli Sprzedawca rozpoczął dostarczanie treści cyfrowej niedostarczanej na nośniku materialnym **za uprzednią wyraźną zgodą Konsumenta**, który **przyjął do wiadomości, że traci prawo odstąpienia** z chwilą pełnego wykonania umowy (udostępnienia pliku), a Sprzedawca przekazał potwierdzenie zgody na trwałym nośniku (e-mail). Zgodę tę Konsument wyraża przed zakupem poprzez zaznaczenie odrębnego oświadczenia.
3. **Kurs:** jeżeli Konsument zażądał rozpoczęcia świadczenia (uzyskania dostępu) przed upływem terminu odstąpienia i odstąpi od umowy, ma obowiązek zapłaty za świadczenia spełnione do chwili odstąpienia (proporcjonalnie). W przypadkach, w których prawo odstąpienia nadal przysługuje, Sprzedawca udostępnia funkcję umożliwiającą złożenie oświadczenia o odstąpieniu online; oświadczenie można też złożyć e-mailem.
4. W razie skutecznego odstąpienia Sprzedawca zwraca płatność w terminie 14 dni.

## §7. Reklamacje — niezgodność treści/usługi cyfrowej z umową

1. Sprzedawca odpowiada za zgodność Produktu cyfrowego oraz Kursu z umową na zasadach określonych w rozdziale 5b ustawy o prawach konsumenta (art. 43h–43q).
2. W razie niezgodności Konsument może żądać doprowadzenia do zgodności z umową; a jeżeli jest to niemożliwe, nieskuteczne lub niezgodność jest istotna — obniżenia ceny albo odstąpienia od umowy (przy czym odstąpienie nie przysługuje, gdy niezgodność jest nieistotna).
3. Domniemywa się, że niezgodność istniejąca w chwili dostarczenia ujawniona w okresie **2 lat** istniała w chwili dostarczenia (dla treści dostarczanej w sposób ciągły — przez okres dostarczania).
4. Reklamację należy złożyć e-mailem na **${SELLER.email}**, podając dane zamówienia, opis niezgodności i żądanie. Sprzedawca ustosunkuje się do reklamacji w terminie **14 dni**. W przypadku obniżenia ceny zwrot różnicy następuje w terminie 14 dni.

## §8. Pozasądowe rozwiązywanie sporów

1. Konsument może skorzystać z pozasądowych (polubownych) sposobów rozpatrywania reklamacji i dochodzenia roszczeń, w szczególności:
   - mediacji lub stałego sądu polubownego przy **Wojewódzkim Inspektoracie Inspekcji Handlowej we Wrocławiu**,
   - pomocy **powiatowego (miejskiego) rzecznika konsumentów** lub organizacji społecznej działającej na rzecz konsumentów.
2. Informacje o pozasądowym rozwiązywaniu sporów oraz rejestr podmiotów uprawnionych dostępne są na stronach Urzędu Ochrony Konkurencji i Konsumentów: **polubowne.uokik.gov.pl** oraz **prawakonsumenta.uokik.gov.pl**.
3. Konsumenci z innych państw UE mogą uzyskać pomoc Europejskiego Centrum Konsumenckiego (**konsument.gov.pl**).

## §9. Licencja i prawa do Produktów cyfrowych

1. Z chwilą dostarczenia Produktu cyfrowego Sprzedawca udziela Klientowi **niewyłącznej, nieprzenoszalnej licencji** na korzystanie z Produktu na własny użytek.
2. Zakazane jest: dalsza dystrybucja, odsprzedaż, sublicencjonowanie, udostępnianie pliku lub linku do pobrania osobom trzecim, usuwanie oznaczeń oraz obchodzenie zabezpieczeń.
3. Wszelkie prawa własności intelektualnej do Produktów cyfrowych i Kursów przysługują Sprzedawcy lub jego licencjodawcom.

## §10. Dane osobowe

Zasady przetwarzania danych osobowych określa **Polityka Prywatności** dostępna w Sklepie.

## §11. Prawo właściwe i postanowienia końcowe

1. Umowy zawierane są w języku polskim lub angielskim. W sprawach nieuregulowanych zastosowanie ma prawo polskie; niniejsze postanowienie nie pozbawia Konsumenta ochrony wynikającej z bezwzględnie obowiązujących przepisów prawa państwa jego zwykłego pobytu.
2. Sprzedawca może zmienić Regulamin z ważnych przyczyn; zmiana nie dotyczy zamówień złożonych przed jej wejściem w życie. O zmianie Sprzedawca informuje w Sklepie; w przypadku usług ciągłych (Kurs) Klient ma prawo wypowiedzenia umowy.
3. Regulamin obowiązuje od dnia ${LEGAL_UPDATED.pl}.
`

const regulaminEN = `
# Terms of Service

**Last updated: ${LEGAL_UPDATED.en}**

## §1. General provisions and Seller details

1. These Terms govern the use of the online store available at **devince.dev**, **apps.devince.dev** and **courses.devince.dev** (the "Store").
2. The seller and service provider is **${SELLER.name}**, ${SELLER.address}, Poland, Tax ID (NIP): **${SELLER.nip}**, registered in the Polish Central Register of Business Activity (CEIDG) (the "Seller").
3. Contact, including the address for complaints and withdrawal declarations: e-mail **${SELLER.email}**, postal address: ${SELLER.address}, Poland.
4. These Terms are made available free of charge before the contract is concluded, in a way that allows them to be saved, reproduced and printed.
5. **Definitions:** *Consumer* — a natural person entering into a contract not directly related to their business or profession (and a sole trader for whom the contract is not of a professional nature); *Digital Product* — a file or digital content supplied without a tangible medium (e.g. a "skill" bundle); *Course* — a digital service/content granting access to online lessons; *Digital content* and *Digital service* — within the meaning of the Polish Consumer Rights Act.

## §2. Electronically supplied services

1. The Seller electronically provides: browsing the Store, placing an order, delivering the Digital Product (via a signed, expiring download link sent by e-mail) and — for Courses — account management and access to online lessons.
2. Buying a Digital Product does not require an account. Course access requires an account created automatically after purchase (password set via an e-mailed link).
3. Customers must not supply any unlawful content.

## §3. Technical requirements

You need: a device with Internet access, a current web browser, an active e-mail account; to open the Digital Product — software supporting its format; for a Course — a Store account. The download link for a Digital Product is valid for a limited time (7 days) and a limited number of downloads (5).

## §4. Prices and payments

1. Prices are shown in Polish złoty (PLN) or US dollars (USD) and are total prices (including applicable taxes, if any).
2. Payments are handled by **Stripe** (Stripe Payments Europe, Ltd.). The Seller does not store payment card data.
3. The contract is concluded when the payment provider confirms payment.

## §5. Delivery (performance)

1. **Digital Product:** after payment is confirmed, the Seller sends a download link to the e-mail provided. Delivery occurs when the file is made available at that link.
2. **Course:** after purchase an account is created and an e-mail with a password-setup link is sent; lessons become accessible after logging in.

## §6. Right of withdrawal (Consumer)

1. A Consumer may withdraw from a distance contract within **14 days** without giving a reason, by submitting a declaration (e.g. by e-mail to ${SELLER.email}); the model withdrawal form (Annex 2 to the Consumer Rights Act) may be used. The period runs from the day the contract is concluded.
2. **Digital Product — loss of the right of withdrawal (Art. 38(13) of the Consumer Rights Act):** the right of withdrawal **does not apply** where the Seller has begun supplying digital content not on a tangible medium **with the Consumer's prior express consent**, the Consumer having **acknowledged the loss of the right of withdrawal** upon full performance (making the file available), and the Seller having provided confirmation of that consent on a durable medium (e-mail). The Consumer gives this consent before purchase by ticking a separate statement.
3. **Course:** if the Consumer requested that performance (access) begin before the withdrawal period ends and then withdraws, they must pay for what was performed up to withdrawal (pro-rata). Where the right of withdrawal still applies, the Seller provides a function to submit the withdrawal declaration online; it may also be sent by e-mail.
4. On effective withdrawal, the Seller refunds the payment within 14 days.

## §7. Complaints — non-conformity of digital content/service

1. The Seller is liable for the conformity of the Digital Product and Course with the contract under Chapter 5b of the Consumer Rights Act (Art. 43h–43q).
2. In case of non-conformity the Consumer may demand that conformity be brought about; and where that is impossible, ineffective, or the non-conformity is material — a price reduction or withdrawal (withdrawal is excluded where the non-conformity is immaterial).
3. Non-conformity revealed within **2 years** of delivery (or, for continuously-supplied content, throughout the supply period) is presumed to have existed at delivery.
4. Complaints should be sent by e-mail to **${SELLER.email}**, stating order data, a description of the non-conformity and the demand. The Seller will respond within **14 days**. Any price-difference refund is made within 14 days.

## §8. Out-of-court dispute resolution

1. A Consumer may use out-of-court (amicable) methods of handling complaints and pursuing claims, in particular mediation or the permanent arbitration court at the **Provincial Inspectorate of Trade Inspection in Wrocław**, or help from a **district (municipal) consumer ombudsman** or a consumer organisation.
2. Information and the register of authorised entities are available on the website of the Polish Office of Competition and Consumer Protection (UOKiK): **polubowne.uokik.gov.pl** and **prawakonsumenta.uokik.gov.pl**.
3. Consumers from other EU states may seek help from the European Consumer Centre (**konsument.gov.pl**).

## §9. Licence and rights to Digital Products

1. Upon delivery, the Seller grants the Customer a **non-exclusive, non-transferable licence** to use the Product for their own use.
2. Prohibited: redistribution, resale, sublicensing, sharing the file or download link with third parties, removing notices, or circumventing protective measures.
3. All intellectual property rights to the Digital Products and Courses belong to the Seller or its licensors.

## §10. Personal data

Personal-data processing is described in the **Privacy Policy** available in the Store.

## §11. Governing law and final provisions

1. Contracts are concluded in Polish or English. Matters not covered are governed by Polish law; this does not deprive a Consumer of the protection of the mandatory provisions of the law of their habitual residence.
2. The Seller may amend these Terms for valid reasons; amendments do not apply to orders placed before they take effect. Changes are announced in the Store; for continuous services (Course) the Customer may terminate the contract.
3. These Terms are effective from ${LEGAL_UPDATED.en}.
`

const politykaPL = `
# Polityka Prywatności

**Data ostatniej aktualizacji: ${LEGAL_UPDATED.pl}**

## 1. Administrator danych

Administratorem Twoich danych osobowych jest **${SELLER.name}**, ${SELLER.address}, NIP: **${SELLER.nip}** (dalej: „Administrator"). Kontakt w sprawach danych osobowych: **${SELLER.email}**. Administrator nie wyznaczył inspektora ochrony danych.

## 2. Cele i podstawy prawne przetwarzania (RODO)

| Cel | Podstawa prawna |
|---|---|
| Realizacja zamówienia, dostarczenie pliku, dostęp do Kursu, obsługa konta | art. 6 ust. 1 lit. b RODO (wykonanie umowy) |
| Wystawianie i przechowywanie faktur, rozliczenia podatkowe | art. 6 ust. 1 lit. c RODO (obowiązek prawny) |
| Newsletter / informacje marketingowe | art. 6 ust. 1 lit. a RODO (zgoda) |
| Powiadomienia operacyjne o zamówieniach (Discord) oraz statystyka anonimowa (Umami) | art. 6 ust. 1 lit. f RODO (prawnie uzasadniony interes: obsługa i monitorowanie sprzedaży) |
| Zapobieganie oszustwom, bezpieczeństwo, dochodzenie i obrona roszczeń | art. 6 ust. 1 lit. f RODO (prawnie uzasadniony interes) |
| Pliki cookies inne niż niezbędne (jeśli zostaną wdrożone) | art. 6 ust. 1 lit. a RODO (zgoda) |

## 3. Odbiorcy danych (podmioty przetwarzające)

Dane mogą być powierzane następującym podmiotom, z którymi Administrator zawarł umowy powierzenia (art. 28 RODO):

- **Stripe** (Stripe Payments Europe, Ltd., Irlandia) — obsługa płatności; przetwarza dane płatnicze i identyfikacyjne. Stripe może przekazywać dane do **USA** na podstawie **EU–US Data Privacy Framework (DPF)** oraz **standardowych klauzul umownych (SCC)**. Stripe pełni rolę podmiotu przetwarzającego, a w zakresie zapobiegania oszustwom i obowiązków regulacyjnych — odrębnego administratora.
- **Brevo (Sendinblue SAS, Paryż, Francja)** — wysyłka wiadomości e-mail (transakcyjnych i marketingowych); podmiot z siedzibą w **UE**, dane przetwarzane w UE.
- **Hetzner Online GmbH (Niemcy)** — hosting/infrastruktura; podmiot z siedzibą w **UE** (serwery w Niemczech).
- **Discord (Discord Inc., USA)** — wewnętrzny kanał Administratora, na który trafiają **operacyjne powiadomienia o zamówieniach** (zawierające adres e-mail kupującego, nazwę produktu i kwotę). Służą wyłącznie bieżącej obsłudze i monitorowaniu sprzedaży. Przekazanie do **USA** odbywa się na podstawie **standardowych klauzul umownych (SCC)**.

## Analityka (Umami)

Do statystyki ruchu Administrator używa **samodzielnie hostowanego narzędzia Umami** (pod adresem **stats.67projects.app**). Umami działa **bez plików cookies** i bez identyfikatorów pozwalających na śledzenie między witrynami; zbiera wyłącznie **zanonimizowane, zagregowane** dane (np. liczba odsłon, kraj, typ urządzenia, kliknięcia w przycisk zakupu). Nie korzystamy z analityki firm trzecich (np. Google Analytics) ani z narzędzi reklamowych. Ponieważ analityka jest beznośnikowa i anonimowa, nie wymaga banera zgody na cookies.

## Newsletter i marketing (zgoda, double opt-in)

Jeżeli zapiszesz się na newsletter — przy zakupie zaznaczając odrębne, niewymagane pole „Chcę dostawać newsletter" (niezależne od zgody dotyczącej zakupu), poprzez formularz zapisu, albo podając e-mail w zamian za **bezpłatny materiał** (tzw. lead-magnet — darmowa aplikacja lub kurs) — Twój adres e-mail trafia do listy mailingowej obsługiwanej przez **Brevo (Sendinblue SAS)**. Stosujemy **podwójne potwierdzenie zapisu (double opt-in)**: po zapisaniu otrzymasz wiadomość z linkiem potwierdzającym, a Twój adres zostaje dodany do listy **dopiero po kliknięciu** tego linku. Brevo przechowuje audytowalny zapis tej zgody. Przy adresie zapisujemy też atrybuty służące wyłącznie segmentacji wysyłki: **źródło zapisu** (zakup albo lead-magnet), **identyfikator produktu** (slug), oraz **powierzchnię** (apps/courses). Podstawą prawną jest **zgoda (art. 6 ust. 1 lit. a RODO)**. W przypadku lead-magnetu zapis na listę i odblokowanie bezpłatnego materiału następują tym samym kliknięciem potwierdzającym. Zgodę możesz **wycofać w dowolnym momencie** — klikając „wypisz się" w stopce każdej wiadomości lub pisząc na **${SELLER.email}** — bez wpływu na zgodność z prawem przetwarzania przed wycofaniem.

## 4. Przekazywanie do państw trzecich

Co do zasady dane są przetwarzane w Europejskim Obszarze Gospodarczym. Przekazania poza EOG dotyczą: operatora płatności **Stripe** (USA) — na podstawie DPF oraz SCC; oraz kanału powiadomień **Discord** (USA), na który trafiają operacyjne powiadomienia o zamówieniach (w tym adres e-mail kupującego) — na podstawie SCC. Oba zapewniają odpowiedni poziom ochrony.

## 5. Okresy przechowywania

- Dokumenty księgowe (faktury): **5 lat**, licząc od końca roku kalendarzowego, w którym upłynął termin płatności podatku.
- Dane zamówienia i konta: przez czas trwania umowy/konta, a następnie do upływu terminów przedawnienia wzajemnych roszczeń.
- Dane na potrzeby newslettera: do czasu wycofania zgody.
- Dane postępu w Kursie: przez czas dostępu, następnie usunięcie lub anonimizacja.

## 6. Twoje prawa

Masz prawo do: dostępu do danych (art. 15), sprostowania (art. 16), usunięcia (art. 17), ograniczenia przetwarzania (art. 18), przenoszenia danych (art. 20), sprzeciwu (art. 21) — w szczególności wobec przetwarzania w oparciu o uzasadniony interes oraz wobec marketingu, a także prawo do **cofnięcia zgody** w dowolnym momencie (bez wpływu na zgodność z prawem przetwarzania przed cofnięciem). Prawa realizujesz, kontaktując się na **${SELLER.email}**.

## 7. Skarga do organu nadzorczego

Masz prawo wniesienia skargi do **Prezesa Urzędu Ochrony Danych Osobowych (PUODO)**, ul. Stawki 2, 00-193 Warszawa, jeżeli uznasz, że przetwarzanie Twoich danych narusza RODO.

## 8. Dobrowolność podania danych

Podanie danych jest dobrowolne, ale niezbędne do zawarcia i wykonania umowy (np. dostarczenia pliku, wystawienia faktury). Brak podania danych uniemożliwia realizację zamówienia.

## 9. Pliki cookies

Sklep wykorzystuje wyłącznie pliki cookies **niezbędne** do działania serwisu: cookie sesji/logowania (dla Kursów) oraz cookie zapamiętujące preferencję motywu (jasny/ciemny). Cookies niezbędne nie wymagają zgody; informujemy o nich w niniejszej Polityce. W procesie płatności operator Stripe może ustawiać własne, niezbędne cookies (m.in. dla zapobiegania oszustwom). Administrator nie stosuje cookies analitycznych ani marketingowych — używana analityka (Umami, zob. sekcja „Analityka") jest **beznośnikowa** i nie zapisuje cookies. Cookies można zarządzać w ustawieniach przeglądarki.

## 10. Zautomatyzowane podejmowanie decyzji

Administrator nie podejmuje wobec Ciebie decyzji opartych wyłącznie na zautomatyzowanym przetwarzaniu (w tym profilowaniu), które wywoływałyby skutki prawne lub w podobny sposób istotnie na Ciebie wpływały. Operator płatności Stripe może stosować własne mechanizmy oceny ryzyka oszustwa.

## 11. Zmiany Polityki

Polityka może być aktualizowana; obowiązuje od dnia ${LEGAL_UPDATED.pl}.
`

const politykaEN = `
# Privacy Policy

**Last updated: ${LEGAL_UPDATED.en}**

## 1. Data controller

The controller of your personal data is **${SELLER.name}**, ${SELLER.address}, Poland, Tax ID (NIP): **${SELLER.nip}** (the "Controller"). Contact for data matters: **${SELLER.email}**. The Controller has not appointed a Data Protection Officer.

## 2. Purposes and legal bases (GDPR)

| Purpose | Legal basis |
|---|---|
| Order fulfilment, file delivery, Course access, account management | Art. 6(1)(b) GDPR (contract performance) |
| Issuing and storing invoices, tax settlements | Art. 6(1)(c) GDPR (legal obligation) |
| Newsletter / marketing messages | Art. 6(1)(a) GDPR (consent) |
| Operational order notifications (Discord) and anonymous analytics (Umami) | Art. 6(1)(f) GDPR (legitimate interest: running and monitoring sales) |
| Fraud prevention, security, establishing/defending claims | Art. 6(1)(f) GDPR (legitimate interest) |
| Non-essential cookies (if implemented) | Art. 6(1)(a) GDPR (consent) |

## 3. Recipients (processors)

Data may be entrusted to the following processors, with whom the Controller has data processing agreements (Art. 28 GDPR):

- **Stripe** (Stripe Payments Europe, Ltd., Ireland) — payment processing; processes payment and identification data. Stripe may transfer data to the **USA** under the **EU–US Data Privacy Framework (DPF)** and **Standard Contractual Clauses (SCCs)**. Stripe acts as a processor and, for fraud prevention and regulatory duties, as a separate controller.
- **Brevo (Sendinblue SAS, Paris, France)** — sending e-mails (transactional and marketing); an **EU-based** processor, data processed in the EU.
- **Hetzner Online GmbH (Germany)** — hosting/infrastructure; an **EU-based** processor (servers in Germany).
- **Discord (Discord Inc., USA)** — the Controller's internal channel that receives **operational order notifications** (containing the buyer's e-mail address, product name and amount). Used solely to run and monitor sales in real time. The transfer to the **USA** is based on **Standard Contractual Clauses (SCCs)**.

## Analytics (Umami)

For traffic statistics the Controller uses **self-hosted Umami** (at **stats.67projects.app**). Umami runs **without cookies** and without cross-site tracking identifiers; it collects only **anonymous, aggregate** data (e.g. page views, country, device type, buy-button clicks). We do not use third-party analytics (e.g. Google Analytics) or advertising tools. Because the analytics is cookieless and anonymous, no cookie-consent banner is required.

## Newsletter and marketing (consent, double opt-in)

If you subscribe to the newsletter — at checkout by ticking the separate, optional "I want to receive the newsletter" box (independent of the purchase consent), via the signup form, or by giving your e-mail in exchange for **free content** (a lead-magnet — a free app or course) — your e-mail address is added to a mailing list operated by **Brevo (Sendinblue SAS)**. We use **double opt-in**: after subscribing you receive an e-mail with a confirmation link, and your address is added to the list **only after you click** it. Brevo keeps an auditable record of that consent. Alongside the address we store attributes used solely for sending-segmentation: the **subscription source** (purchase or lead-magnet), the **product identifier** (slug), and the **surface** (apps/courses). The legal basis is **consent (Art. 6(1)(a) GDPR)**. For a lead-magnet, joining the list and unlocking the free content happen with the same confirmation click. You may **withdraw consent at any time** — using the "unsubscribe" link in the footer of every message, or by writing to **${SELLER.email}** — without affecting the lawfulness of processing before withdrawal.

## 4. International transfers

As a rule, data is processed within the European Economic Area. Transfers outside the EEA concern: the payment provider **Stripe** (USA) — based on the DPF and SCCs; and the **Discord** notification channel (USA), which receives operational order notifications (including the buyer's e-mail) — based on SCCs. Both ensure an adequate level of protection.

## 5. Retention periods

- Accounting documents (invoices): **5 years**, counted from the end of the calendar year in which the tax payment deadline fell.
- Order and account data: for the duration of the contract/account, then until the limitation periods for mutual claims expire.
- Newsletter data: until consent is withdrawn.
- Course progress data: for the duration of access, then deleted or anonymised.

## 6. Your rights

You have the right to: access (Art. 15), rectification (Art. 16), erasure (Art. 17), restriction (Art. 18), data portability (Art. 20), objection (Art. 21) — in particular to processing based on legitimate interest and to marketing — and the right to **withdraw consent** at any time (without affecting the lawfulness of processing before withdrawal). Exercise your rights by contacting **${SELLER.email}**.

## 7. Complaint to the supervisory authority

You have the right to lodge a complaint with the **President of the Personal Data Protection Office (PUODO)**, ul. Stawki 2, 00-193 Warsaw, Poland, if you consider that the processing of your data infringes the GDPR.

## 8. Whether providing data is required

Providing data is voluntary but necessary to conclude and perform the contract (e.g. to deliver the file, issue an invoice). Not providing it makes order fulfilment impossible.

## 9. Cookies

The Store uses only **essential** cookies: a session/login cookie (for Courses) and a cookie remembering the theme preference (light/dark). Essential cookies do not require consent; we inform you about them in this Policy. During payment, Stripe may set its own essential cookies (e.g. for fraud prevention). The Controller does not use analytics or marketing cookies — the analytics in use (Umami, see the "Analytics" section) is **cookieless** and sets no cookies. Cookies can be managed in your browser settings.

## 10. Automated decision-making

The Controller does not make decisions about you based solely on automated processing (including profiling) that produce legal effects or similarly significantly affect you. The payment provider Stripe may apply its own fraud-risk scoring.

## 11. Changes to this Policy

This Policy may be updated; it is effective from ${LEGAL_UPDATED.en}.
`

export const LEGAL_CONTENT: Record<LegalDoc, Record<Locale, string>> = {
  regulamin: { pl: regulaminPL.trim(), en: regulaminEN.trim() },
  'polityka-prywatnosci': { pl: politykaPL.trim(), en: politykaEN.trim() },
}
