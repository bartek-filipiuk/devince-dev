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
  pl: '26 września 2026',
  en: '26 September 2026',
}

const SELLER = {
  name: 'Bartłomiej Filipiuk Devins',
  address: 'ul. Stacyjna 1, 53-613 Wrocław',
  nip: '596 158 99 01',
  email: 'bartek@devince.dev',
  // Brand under which the business trades; the legal (CEIDG) name is `name`.
  brand: 'Devince',
}

const regulaminPL = `
# Regulamin

**Data ostatniej aktualizacji: ${LEGAL_UPDATED.pl}**

## §1. Postanowienia ogólne i dane Sprzedawcy

1. Niniejszy Regulamin określa zasady korzystania ze sklepu internetowego dostępnego pod adresami **devince.dev**, **apps.devince.dev** oraz **courses.devince.dev** (dalej: „Sklep").
2. Sprzedawcą i usługodawcą jest **${SELLER.name}**, ${SELLER.address}, NIP: **${SELLER.nip}**, wpisany do Centralnej Ewidencji i Informacji o Działalności Gospodarczej (CEIDG) prowadzonej przez ministra właściwego do spraw gospodarki, działający pod marką **${SELLER.brand}** (dalej: „Sprzedawca").
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

1. Ceny podane są w Sklepie w złotych polskich (PLN) lub dolarach amerykańskich (USD) i są cenami całkowitymi (brutto), zawierającymi podatek VAT.
2. Płatności obsługuje operator **Stripe** (Stripe Payments Europe, Ltd.). Sprzedawca nie przechowuje danych karty płatniczej.
3. Umowa zostaje zawarta z chwilą potwierdzenia płatności przez operatora płatności.
4. **Faktury:** Sprzedawca jest **czynnym podatnikiem VAT** i wystawia faktury VAT. Aby otrzymać fakturę na firmę, Klient przesyła dane do faktury (w tym NIP) e-mailem na **${SELLER.email}**. Podanie NIP służy wyłącznie wystawieniu faktury i samo w sobie nie przesądza o charakterze umowy (zob. §11 ust. 2).

## §5. Dostawa (wykonanie umowy)

1. **Produkt cyfrowy:** po zaksięgowaniu płatności Sprzedawca wysyła na podany adres e-mail link do pobrania pliku. Dostarczenie następuje z chwilą udostępnienia pliku do pobrania pod tym linkiem.
2. **Kurs:** po zakupie tworzone jest konto i wysyłany e-mail z linkiem do ustawienia hasła; dostęp do lekcji jest aktywny po zalogowaniu.
3. **Powiadomienia o aktualizacjach (Produkty cyfrowe):** Sprzedawca może wysyłać Klientowi na podany adres e-mail wiadomości serwisowe dotyczące istotnych aktualizacji lub poprawek bezpieczeństwa zakupionego Produktu cyfrowego — w tym nowy, podpisany link umożliwiający pobranie bieżącej wersji. Są to wiadomości serwisowe związane z wykonaniem umowy i bezpieczeństwem zakupionego Produktu (podstawa: art. 6 ust. 1 lit. b i f RODO), a nie informacja handlowa/marketing. Klient może zrezygnować z takich powiadomień, odpisując na otrzymaną wiadomość.

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

## §9. Licencja na Produkty cyfrowe

1. Z chwilą dostarczenia Produktu cyfrowego Sprzedawca udziela Klientowi **niewyłącznej, bezterminowej licencji**, bez ograniczeń terytorialnych, na korzystanie z Produktu w zakresie opisanym w tym paragrafie. Licencja obejmuje także aktualizacje dostarczone na podstawie ust. 7.
2. **Projekt** to jedna strona internetowa lub aplikacja działająca pod jedną domeną. Jeden zakup Produktu uprawnia do jego wykorzystania w jednym Projekcie — własnym albo wykonanym dla klienta Klienta. Każdy kolejny Projekt wymaga odrębnego zakupu.
3. W ramach licencji Klient może (pola eksploatacji):
   - utrwalać i zwielokrotniać Produkt, w tym kopiować go na własne urządzenia i serwery, do repozytoriów kodu i kopii zapasowych;
   - modyfikować Produkt, przystosowywać go, łączyć z innymi utworami i tworzyć na jego podstawie opracowania, w tym z użyciem narzędzi AI (np. przekazując pliki Produktu asystentom programistycznym);
   - wdrażać i publicznie udostępniać Projekt zbudowany z użyciem Produktu (np. uruchomić i opublikować stronę);
   - udostępniać Produkt podwykonawcom i współpracownikom pracującym nad Projektem Klienta, wyłącznie na potrzeby tego Projektu.
4. Klient, dla którego wykonano Projekt, może korzystać z Projektu (w tym z jego kodu) w zakresie potrzebnym do jego utrzymania i dalszego rozwoju, bez prawa wykorzystania Produktu w innych projektach.
5. Zakazane jest:
   - odsprzedawanie, udostępnianie lub rozpowszechnianie Produktu (w całości lub w części) jako szablonu, startera lub innego produktu przeznaczonego do dalszego wykorzystania przez osoby trzecie;
   - publikowanie kodu źródłowego lub plików Produktu (np. w publicznym repozytorium); nie dotyczy to publikacji działającego Projektu;
   - tworzenie z użyciem Produktu produktu konkurencyjnego (np. szablonu, kursu lub zestawu startowego o tym samym przeznaczeniu);
   - usuwanie informacji o prawach autorskich zamieszczonych w plikach Produktu;
   - udostępnianie linku do pobrania osobom trzecim.
6. Postanowienia tego paragrafu nie ograniczają uprawnień wynikających z art. 75 ust. 2 i 3 ustawy o prawie autorskim i prawach pokrewnych.
7. **Aktualizacje:** przez **12 miesięcy** od zakupu Sprzedawca udostępnia poprawki błędów i poprawki bezpieczeństwa Produktu (zob. §5 ust. 3). Nowy link do pobrania bieżącej wersji Klient otrzymuje na żądanie wysłane e-mailem na **${SELLER.email}**. Nie ogranicza to obowiązku dostarczania aktualizacji wobec Konsumenta wynikającego z art. 43k ustawy o prawach konsumenta.
8. **Wsparcie:** pytania dotyczące Produktu można zadawać na kanale Discord (§13); Sprzedawca nie zobowiązuje się do udzielenia odpowiedzi ani do terminu odpowiedzi, chyba że opis produktu stanowi inaczej. Nie dotyczy to reklamacji, które rozpatrywane są zgodnie z §7.
9. **Trwałość licencji:** Sprzedawca zrzeka się prawa do wypowiedzenia licencji (art. 68 ustawy o prawie autorskim i prawach pokrewnych), z wyjątkiem sytuacji, w której Klient narusza warunki licencji i mimo wezwania do zaprzestania naruszeń, z wyznaczeniem terminu nie krótszego niż 14 dni, nie zaprzestał ich w tym terminie.
10. Licencja nie przenosi autorskich praw majątkowych. Prawa własności intelektualnej do Produktów cyfrowych i Kursów przysługują Sprzedawcy lub jego licencjodawcom; komponenty open source zawarte w Produkcie podlegają swoim licencjom (§10 ust. 3). Materiały Kursu Klient może oglądać i wykorzystywać zdobytą wiedzę w dowolnych projektach, ale nie może kopiować ani udostępniać tych materiałów osobom trzecim.

## §10. Charakter Produktów cyfrowych i Kursów

1. Produkty cyfrowe i Kursy są materiałami i narzędziami do **samodzielnego użycia** przez Klienta. Klient sam decyduje o ich zastosowaniu, konfiguracji i wdrożeniu oraz odpowiada za własne dane, konta, klucze dostępowe i serwery. Zakup nie obejmuje usługi wdrożenia, chyba że opis produktu stanowi inaczej.
2. **Koszty podmiotów trzecich:** korzystanie z Produktu może wymagać usług innych dostawców (np. hosting, domena, API modeli AI, płatne narzędzia). Koszty tych usług ponosi Klient na podstawie umów z ich dostawcami; Sprzedawca nie ma wpływu na ich ceny i warunki.
3. **AI i open source:** Produkty mogą zawierać komponenty open source (na licencjach wskazanych w plikach Produktu) i mogą być przeznaczone do pracy z narzędziami AI. Część materiałów mogła powstać przy pomocy narzędzi AI i została przejrzana przez Sprzedawcę. Wyniki generowane przez narzędzia AI są niedeterministyczne i wymagają weryfikacji przez Klienta.
4. **Rezultaty:** Sprzedawca nie gwarantuje określonych rezultatów biznesowych (np. sprzedaży, ruchu, pozycji w wyszukiwarce) ani tego, że oprogramowanie będzie wolne od jakichkolwiek błędów w każdym środowisku.
5. Szablony dokumentów (np. prawnych) zawarte w Produktach są wzorami i nie stanowią porady prawnej.
6. Postanowienia tego paragrafu opisują przedmiot i cechy świadczenia. Nie wyłączają ani nie ograniczają uprawnień Konsumenta (§11), w szczególności odpowiedzialności Sprzedawcy za zgodność Produktu cyfrowego i Kursu z umową (§7).

## §11. Konsument

1. Postanowienia Regulaminu nie wyłączają ani nie ograniczają praw Konsumenta wynikających z bezwzględnie obowiązujących przepisów, w szczególności ustawy o prawach konsumenta i Kodeksu cywilnego. Postanowienie sprzeczne z takimi przepisami nie wiąże Konsumenta, a w jego miejsce stosuje się te przepisy.
2. Przepisy dotyczące Konsumenta (m.in. prawo odstąpienia, zgodność z umową, niedozwolone postanowienia umowne) stosuje się także do osoby fizycznej zawierającej umowę bezpośrednio związaną z jej działalnością gospodarczą, gdy z treści umowy wynika, że nie ma ona dla niej charakteru zawodowego, wynikającego w szczególności z przedmiotu wykonywanej działalności, udostępnionego w CEIDG (art. 385⁵ Kodeksu cywilnego, art. 38a ustawy o prawach konsumenta).

## §12. Klienci będący przedsiębiorcami (B2B)

1. Ten paragraf stosuje się wyłącznie do Klientów niebędących Konsumentami, w tym do przedsiębiorców, dla których umowa ma charakter zawodowy (§11 ust. 2 nie ma zastosowania). W stosunku do nich postanowienia tego paragrafu mają pierwszeństwo przed innymi postanowieniami Regulaminu.
2. Odpowiedzialność Sprzedawcy z tytułu rękojmi jest wyłączona (art. 558 § 1 Kodeksu cywilnego).
3. Całkowita odpowiedzialność Sprzedawcy wobec Klienta jest ograniczona do wysokości ceny zapłaconej za Produkt cyfrowy lub Kurs, którego dotyczy roszczenie. Sprzedawca nie odpowiada za utracone korzyści.
4. Ograniczenia z ust. 2 i 3 nie dotyczą szkody wyrządzonej umyślnie.
5. Reklamacje należy zgłaszać e-mailem w terminie **30 dni** od dnia dostarczenia Produktu cyfrowego lub udostępnienia Kursu.
6. Prawo odstąpienia od umowy (§6) nie przysługuje.
7. Spory rozstrzyga sąd właściwy dla siedziby Sprzedawcy.

## §13. Zasady korzystania z Discorda

1. Sprzedawca może udostępniać Klientom kanały na platformie **Discord** (Discord Inc.). Udział jest dobrowolny i wymaga konta w Discordzie oraz akceptacji jego regulaminu.
2. Na kanałach obowiązuje kultura wypowiedzi. Zakazane jest w szczególności: spamowanie i reklama bez zgody Sprzedawcy, publikowanie treści bezprawnych lub obraźliwych, udostępnianie plików Produktów cyfrowych i materiałów Kursów, publikowanie danych osobowych innych osób oraz podszywanie się pod inne osoby.
3. W razie naruszenia zasad Sprzedawca może usunąć wiadomość i udzielić upomnienia, a przy naruszeniu rażącym lub powtarzającym się — usunąć uczestnika z kanału. Usunięcie z Discorda nie wpływa na licencję (§9) ani na dostęp do zakupionych Produktów cyfrowych i Kursów.
4. Wiadomości publikowane na kanałach są widoczne dla innych uczestników. Nie publikuj tam danych wrażliwych, haseł ani kluczy dostępowych.
5. Discord jest kanałem wsparcia bez zobowiązania do odpowiedzi (§9 ust. 8); reklamacje składa się e-mailem (§7).

## §14. Dane osobowe

Zasady przetwarzania danych osobowych określa **Polityka Prywatności** dostępna w Sklepie.

## §15. Prawo właściwe i postanowienia końcowe

1. Umowy zawierane są w języku polskim lub angielskim. W sprawach nieuregulowanych zastosowanie ma prawo polskie; niniejsze postanowienie nie pozbawia Konsumenta ochrony wynikającej z bezwzględnie obowiązujących przepisów prawa państwa jego zwykłego pobytu.
2. Sprzedawca może zmienić Regulamin z ważnych przyczyn; zmiana nie dotyczy zamówień złożonych przed jej wejściem w życie. O zmianie Sprzedawca informuje w Sklepie; w przypadku usług ciągłych (Kurs) Klient ma prawo wypowiedzenia umowy.
3. Regulamin obowiązuje od dnia ${LEGAL_UPDATED.pl}.
`

const regulaminEN = `
# Terms of Service

**Last updated: ${LEGAL_UPDATED.en}**

## §1. General provisions and Seller details

1. These Terms govern the use of the online store available at **devince.dev**, **apps.devince.dev** and **courses.devince.dev** (the "Store").
2. The seller and service provider is **${SELLER.name}**, ${SELLER.address}, Poland, Tax ID (NIP): **${SELLER.nip}**, registered in the Polish Central Register of Business Activity (CEIDG), trading under the **${SELLER.brand}** brand (the "Seller").
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

1. Prices are shown in Polish złoty (PLN) or US dollars (USD) and are total (gross) prices including VAT.
2. Payments are handled by **Stripe** (Stripe Payments Europe, Ltd.). The Seller does not store payment card data.
3. The contract is concluded when the payment provider confirms payment.
4. **Invoices:** the Seller is an **active VAT payer** and issues VAT invoices. To receive a company invoice, the Customer sends the invoice details (including the tax ID / NIP) by e-mail to **${SELLER.email}**. Providing a tax ID serves only to issue the invoice and does not by itself determine the nature of the contract (see §11(2)).

## §5. Delivery (performance)

1. **Digital Product:** after payment is confirmed, the Seller sends a download link to the e-mail provided. Delivery occurs when the file is made available at that link.
2. **Course:** after purchase an account is created and an e-mail with a password-setup link is sent; lessons become accessible after logging in.
3. **Update notifications (Digital Products):** the Seller may send the Customer service e-mails about important updates or security fixes to a purchased Digital Product — including a new, signed link to download the current version. These are service messages relating to performance of the contract and the security of the purchased Product (legal basis: Art. 6(1)(b) and (f) GDPR), not commercial/marketing communication. The Customer may opt out of such notifications by replying to the message.

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

## §9. Licence to Digital Products

1. Upon delivery of a Digital Product the Seller grants the Customer a **non-exclusive, perpetual licence**, without territorial limits, to use the Product to the extent described in this section. The licence also covers updates supplied under paragraph 7.
2. A **Project** is one website or application running under one domain. One purchase of a Product entitles the Customer to use it in one Project — their own or one built for the Customer's client. Each further Project requires a separate purchase.
3. Under the licence the Customer may (fields of exploitation):
   - record and reproduce the Product, including copying it to their own devices and servers, code repositories and backups;
   - modify and adapt the Product, combine it with other works and create derivative works, including with AI tools (e.g. passing Product files to coding assistants);
   - deploy and publicly make available a Project built with the Product (e.g. launch and publish a website);
   - share the Product with subcontractors and collaborators working on the Customer's Project, solely for that Project.
4. A client for whom a Project was built may use that Project (including its code) as needed to maintain and further develop it, without the right to use the Product in other projects.
5. It is prohibited to:
   - resell, share or distribute the Product (in whole or in part) as a template, starter or any other product intended for further use by third parties;
   - publish the Product's source code or files (e.g. in a public repository); this does not apply to publishing a working Project;
   - use the Product to create a competing product (e.g. a template, course or starter kit for the same purpose);
   - remove copyright notices contained in the Product's files;
   - share the download link with third parties.
6. This section does not limit the rights under Art. 75(2) and (3) of the Polish Act on Copyright and Related Rights.
7. **Updates:** for **12 months** from purchase the Seller provides bug fixes and security fixes for the Product (see §5(3)). The Customer receives a new link to download the current version on request by e-mail to **${SELLER.email}**. This does not limit the obligation to supply updates to a Consumer under Art. 43k of the Consumer Rights Act.
8. **Support:** questions about the Product can be asked on the Discord channel (§13); the Seller does not undertake to reply or to reply within any time, unless the product description says otherwise. This does not apply to complaints, which are handled under §7.
9. **Permanence of the licence:** the Seller waives the right to terminate the licence (Art. 68 of the Act on Copyright and Related Rights), except where the Customer breaches the licence terms and, after being called on to stop with a deadline of no less than 14 days, has not stopped within that deadline.
10. The licence does not transfer economic copyright. Intellectual property rights to the Digital Products and Courses belong to the Seller or its licensors; open-source components contained in a Product are subject to their own licences (§10(3)). The Customer may watch Course materials and use the knowledge gained in any project, but may not copy or share those materials with third parties.

## §10. Nature of the Digital Products and Courses

1. Digital Products and Courses are materials and tools for the Customer's **independent use**. The Customer decides how to apply, configure and deploy them and is responsible for their own data, accounts, access keys and servers. The purchase does not include a deployment service unless the product description says otherwise.
2. **Third-party costs:** using a Product may require services of other providers (e.g. hosting, a domain, AI model APIs, paid tools). Their costs are borne by the Customer under contracts with those providers; the Seller has no influence over their prices and terms.
3. **AI and open source:** Products may contain open-source components (under the licences indicated in the Product's files) and may be intended to work with AI tools. Some materials may have been created with the help of AI tools and were reviewed by the Seller. Output generated by AI tools is non-deterministic and must be verified by the Customer.
4. **Results:** the Seller does not guarantee specific business results (e.g. sales, traffic, search rankings) or that the software will be free of any errors in every environment.
5. Document templates (e.g. legal ones) contained in Products are templates and do not constitute legal advice.
6. This section describes the subject matter and characteristics of the performance. It does not exclude or limit the rights of a Consumer (§11), in particular the Seller's liability for the conformity of the Digital Product and Course with the contract (§7).

## §11. Consumers

1. These Terms do not exclude or limit a Consumer's rights under mandatory law, in particular the Consumer Rights Act and the Civil Code. A provision contrary to such law does not bind the Consumer and is replaced by that law.
2. Provisions concerning Consumers (incl. the right of withdrawal, conformity with the contract, prohibited contractual clauses) also apply to a natural person concluding a contract directly related to their business where the contract shows that it is not of a professional nature for them, as follows in particular from the subject of their business disclosed in CEIDG (Art. 385⁵ of the Civil Code, Art. 38a of the Consumer Rights Act).

## §12. Business customers (B2B)

1. This section applies only to Customers who are not Consumers, including businesses for whom the contract is of a professional nature (§11(2) does not apply). For them, this section prevails over other provisions of these Terms.
2. The Seller's liability under the statutory warranty (rękojmia) is excluded (Art. 558 § 1 of the Civil Code).
3. The Seller's total liability to the Customer is limited to the price paid for the Digital Product or Course the claim relates to. The Seller is not liable for lost profits.
4. The limitations in paragraphs 2 and 3 do not apply to damage caused wilfully.
5. Complaints must be submitted by e-mail within **30 days** of delivery of the Digital Product or of access to the Course being granted.
6. The right of withdrawal (§6) does not apply.
7. Disputes are resolved by the court competent for the Seller's registered place of business.

## §13. Discord rules

1. The Seller may make channels on the **Discord** platform (Discord Inc.) available to Customers. Participation is voluntary and requires a Discord account and acceptance of Discord's terms.
2. Courteous communication is required. In particular it is prohibited to: spam or advertise without the Seller's consent, post unlawful or offensive content, share Digital Product files or Course materials, post other people's personal data, or impersonate others.
3. In case of a breach the Seller may delete the message and issue a warning and, for a serious or repeated breach, remove the participant from the channel. Removal from Discord does not affect the licence (§9) or access to purchased Digital Products and Courses.
4. Messages posted on the channels are visible to other participants. Do not post sensitive data, passwords or access keys there.
5. Discord is a support channel with no obligation to reply (§9(8)); complaints are submitted by e-mail (§7).

## §14. Personal data

Personal-data processing is described in the **Privacy Policy** available in the Store.

## §15. Governing law and final provisions

1. Contracts are concluded in Polish or English. Matters not covered are governed by Polish law; this does not deprive a Consumer of the protection of the mandatory provisions of the law of their habitual residence.
2. The Seller may amend these Terms for valid reasons; amendments do not apply to orders placed before they take effect. Changes are announced in the Store; for continuous services (Course) the Customer may terminate the contract.
3. These Terms are effective from ${LEGAL_UPDATED.en}.
`

const politykaPL = `
# Polityka Prywatności

**Data ostatniej aktualizacji: ${LEGAL_UPDATED.pl}**

## 1. Administrator danych

Administratorem Twoich danych osobowych jest **${SELLER.name}** (marka **${SELLER.brand}**), ${SELLER.address}, NIP: **${SELLER.nip}** (dalej: „Administrator"). Kontakt w sprawach danych osobowych: **${SELLER.email}**. Administrator nie wyznaczył inspektora ochrony danych.

## 2. Cele i podstawy prawne przetwarzania (RODO)

| Cel | Podstawa prawna |
|---|---|
| Realizacja zamówienia, dostarczenie pliku, dostęp do Kursu, obsługa konta | art. 6 ust. 1 lit. b RODO (wykonanie umowy) |
| Wystawianie i przechowywanie faktur, rozliczenia podatkowe | art. 6 ust. 1 lit. c RODO (obowiązek prawny) |
| Newsletter / informacje marketingowe | art. 6 ust. 1 lit. a RODO (zgoda) |
| Powiadomienia operacyjne o zamówieniach (Discord, bez adresu e-mail) oraz statystyka anonimowa (Umami) | art. 6 ust. 1 lit. f RODO (prawnie uzasadniony interes: obsługa i monitorowanie sprzedaży) |
| Korespondencja (e-mail, Discord), w tym z użyciem narzędzi AI | art. 6 ust. 1 lit. b RODO (gdy dotyczy umowy), w pozostałym zakresie art. 6 ust. 1 lit. f RODO (prawnie uzasadniony interes: sprawna obsługa zapytań) |
| Spotkania na żywo i ich nagrania, udostępniane uczestnikom | art. 6 ust. 1 lit. b RODO (wykonanie umowy), w zakresie nagrania głosu uczestnika — art. 6 ust. 1 lit. f RODO (prawnie uzasadniony interes: udostępnienie pełnego nagrania uczestnikom) |
| Społeczność i wsparcie na Discordzie | art. 6 ust. 1 lit. b RODO (wykonanie umowy) oraz lit. f RODO (prawnie uzasadniony interes: prowadzenie społeczności) |
| Zapobieganie oszustwom, bezpieczeństwo, dochodzenie i obrona roszczeń | art. 6 ust. 1 lit. f RODO (prawnie uzasadniony interes) |
| Pliki cookies inne niż niezbędne (jeśli zostaną wdrożone) | art. 6 ust. 1 lit. a RODO (zgoda) |

## 3. Odbiorcy danych (podmioty przetwarzające)

Dane mogą być powierzane następującym podmiotom, z którymi Administrator zawarł umowy powierzenia (art. 28 RODO):

- **Stripe** (Stripe Payments Europe, Ltd., Irlandia) — obsługa płatności; przetwarza dane płatnicze i identyfikacyjne. Stripe może przekazywać dane do **USA** na podstawie **EU–US Data Privacy Framework (DPF)** oraz **standardowych klauzul umownych (SCC)**. Stripe pełni rolę podmiotu przetwarzającego, a w zakresie zapobiegania oszustwom i obowiązków regulacyjnych — odrębnego administratora.
- **Brevo (Sendinblue SAS, Paryż, Francja)** — wysyłka wiadomości e-mail (transakcyjnych i marketingowych); podmiot z siedzibą w **UE**, dane przetwarzane w UE.
- **Hetzner Online GmbH (Niemcy)** — hosting/infrastruktura; podmiot z siedzibą w **UE** (serwery w Niemczech).
- **Discord (Discord Inc., USA)** — (a) wewnętrzny kanał Administratora, na który trafiają **operacyjne powiadomienia o zamówieniach** zawierające wyłącznie identyfikator zamówienia, nazwę produktu i kwotę (**bez adresu e-mail** kupującego); (b) kanały społeczności i wsparcia dla Klientów (zob. sekcja „Discord"). Przekazanie do **USA** odbywa się na podstawie **standardowych klauzul umownych (SCC)** oraz EU–US Data Privacy Framework, o ile ma zastosowanie.
- **Scanye** — narzędzie do obsługi dokumentów księgowych; przetwarza dane zawarte w fakturach (np. nazwa firmy, NIP, adres).
- **GitHub (GitHub Inc., USA)** — jeżeli dostęp do materiałów lub repozytorium odbywa się przez GitHub, przetwarzana jest nazwa użytkownika GitHub i dane z nią powiązane. Przekazanie do **USA** — na podstawie DPF oraz SCC.
- **Dostawca narzędzia do spotkań online** (wideokonferencji) — przy spotkaniach na żywo; nazwa narzędzia jest podawana w zaproszeniu na spotkanie. Jeżeli dostawca przetwarza dane poza EOG, odbywa się to na podstawie DPF lub SCC.
- **Dostawcy narzędzi AI** (modele językowe) — jeżeli korespondencja jest przetwarzana z ich użyciem (zob. sekcja „Narzędzia AI"); przekazanie poza EOG — na podstawie DPF lub SCC.

## Analityka (Umami)

Do statystyki ruchu Administrator używa **samodzielnie hostowanego narzędzia Umami** (pod adresem **stats.67projects.app**). Umami działa **bez plików cookies** i bez identyfikatorów pozwalających na śledzenie między witrynami; zbiera wyłącznie **zanonimizowane, zagregowane** dane (np. liczba odsłon, kraj, typ urządzenia, kliknięcia w przycisk zakupu). Nie korzystamy z analityki firm trzecich (np. Google Analytics) ani z narzędzi reklamowych. Ponieważ analityka jest beznośnikowa i anonimowa, nie wymaga banera zgody na cookies.

## Spotkania na żywo i nagrania

Spotkania na żywo (np. w ramach warsztatu lub kursu) mogą być nagrywane. Nagrywany jest **wyłącznie ekran i głos prowadzącego**; jeżeli zabierasz głos (np. zadajesz pytanie), **Twój głos** może znaleźć się na nagraniu. **Obrazu z kamer uczestników nie nagrywamy.** Jeśli nie chcesz, aby Twój głos znalazł się na nagraniu, możesz zadać pytanie na czacie lub na Discordzie. Nagrania są udostępniane wyłącznie uczestnikom danej edycji i przechowywane przez **12 miesięcy** od spotkania, po czym są usuwane.

## Discord

Na kanałach Discorda przetwarzamy Twoją nazwę użytkownika, awatar i treść publikowanych wiadomości. Wiadomości są widoczne dla innych uczestników kanału. Discord Inc. przetwarza dane Twojego konta także jako **odrębny administrator**, na zasadach własnej polityki prywatności. Nie publikuj na Discordzie danych wrażliwych, haseł ani kluczy dostępowych.

## Narzędzia AI

Korespondencja z Administratorem (e-mail, Discord, reklamacje) może być przetwarzana z użyciem narzędzi AI (np. do przygotowania projektu odpowiedzi lub podsumowania sprawy). Podstawą jest **prawnie uzasadniony interes** Administratora (art. 6 ust. 1 lit. f RODO) — sprawna obsługa zapytań. Odpowiedzi i decyzje w Twojej sprawie (np. rozpatrzenie reklamacji) podejmuje człowiek. Możesz wnieść **sprzeciw** wobec takiego przetwarzania, pisząc na **${SELLER.email}**.

## Osadzone filmy (YouTube)

Na stronach kursów i w lekcjach mogą być osadzone filmy z serwisu **YouTube** (Google Ireland Ltd. / Google LLC). Po załadowaniu strony z takim filmem Twoja przeglądarka łączy się z serwerami Google, które mogą odczytywać i zapisywać pliki cookies oraz przetwarzać Twój adres IP i dane o urządzeniu — na zasadach polityki prywatności Google, jako odrębny administrator. Dane mogą być przekazywane do **USA** (na podstawie DPF).

## Newsletter i marketing (zgoda, double opt-in)

Jeżeli zapiszesz się na newsletter — przy zakupie zaznaczając odrębne, niewymagane pole „Chcę dostawać newsletter" (niezależne od zgody dotyczącej zakupu), poprzez formularz zapisu, albo podając e-mail w zamian za **bezpłatny materiał** (tzw. lead-magnet — darmowa aplikacja lub kurs) — Twój adres e-mail trafia do listy mailingowej obsługiwanej przez **Brevo (Sendinblue SAS)**. Stosujemy **podwójne potwierdzenie zapisu (double opt-in)**: po zapisaniu otrzymasz wiadomość z linkiem potwierdzającym, a Twój adres zostaje dodany do listy **dopiero po kliknięciu** tego linku. Brevo przechowuje audytowalny zapis tej zgody. Przy adresie zapisujemy też atrybuty służące wyłącznie segmentacji wysyłki: **źródło zapisu** (zakup albo lead-magnet), **identyfikator produktu** (slug), oraz **powierzchnię** (apps/courses). Podstawą prawną jest **zgoda (art. 6 ust. 1 lit. a RODO)**. W przypadku lead-magnetu zapis na listę i odblokowanie bezpłatnego materiału następują tym samym kliknięciem potwierdzającym. Zgodę możesz **wycofać w dowolnym momencie** — klikając „wypisz się" w stopce każdej wiadomości lub pisząc na **${SELLER.email}** — bez wpływu na zgodność z prawem przetwarzania przed wycofaniem.

## 4. Przekazywanie do państw trzecich

Co do zasady dane są przetwarzane w Europejskim Obszarze Gospodarczym. Przekazania poza EOG mogą dotyczyć: operatora płatności **Stripe** (USA) — na podstawie DPF oraz SCC; **Discorda** (USA) — powiadomienia o zamówieniach (bez adresu e-mail) i kanały społeczności — na podstawie SCC lub DPF; **GitHuba** (USA), dostawcy narzędzia do spotkań online, dostawców narzędzi AI oraz **YouTube/Google** (USA) — na podstawie DPF lub SCC. Mechanizmy te zapewniają odpowiedni poziom ochrony.

## 5. Okresy przechowywania

- Dokumenty księgowe (faktury): **5 lat**, licząc od końca roku kalendarzowego, w którym upłynął termin płatności podatku.
- Dane zamówienia i konta: przez czas trwania umowy/konta, a następnie do upływu terminów przedawnienia wzajemnych roszczeń.
- Dane na potrzeby newslettera: do czasu wycofania zgody.
- Dane postępu w Kursie: przez czas dostępu, następnie usunięcie lub anonimizacja.
- Nagrania spotkań na żywo: **12 miesięcy** od spotkania.
- Korespondencja: przez czas potrzebny do obsługi sprawy, a następnie do upływu terminów przedawnienia roszczeń.
- Wiadomości na Discordzie: do czasu ich usunięcia przez Ciebie lub przez Administratora albo do zamknięcia kanału.
- Cookie sesji/logowania: do wylogowania lub wygaśnięcia sesji.

## 6. Twoje prawa

Masz prawo do: dostępu do danych (art. 15), sprostowania (art. 16), usunięcia (art. 17), ograniczenia przetwarzania (art. 18), przenoszenia danych (art. 20), sprzeciwu (art. 21) — w szczególności wobec przetwarzania w oparciu o uzasadniony interes oraz wobec marketingu, a także prawo do **cofnięcia zgody** w dowolnym momencie (bez wpływu na zgodność z prawem przetwarzania przed cofnięciem). Prawa realizujesz, kontaktując się na **${SELLER.email}**.

## 7. Skarga do organu nadzorczego

Masz prawo wniesienia skargi do **Prezesa Urzędu Ochrony Danych Osobowych (PUODO)**, ul. Stawki 2, 00-193 Warszawa, jeżeli uznasz, że przetwarzanie Twoich danych narusza RODO.

## 8. Dobrowolność podania danych

Podanie danych jest dobrowolne, ale niezbędne do zawarcia i wykonania umowy (np. dostarczenia pliku, wystawienia faktury). Brak podania danych uniemożliwia realizację zamówienia.

## 9. Pliki cookies

Sklep sam ustawia wyłącznie plik cookie **niezbędny** do działania serwisu: cookie sesji/logowania (dla Kursów), ważny do wylogowania lub wygaśnięcia sesji. Preferencja motywu (jasny/ciemny) jest zapisywana w pamięci lokalnej przeglądarki (localStorage) i nie jest przesyłana do serwera. Cookies niezbędne nie wymagają zgody; informujemy o nich w niniejszej Polityce. W procesie płatności operator Stripe może ustawiać własne, niezbędne cookies (m.in. dla zapobiegania oszustwom). Administrator nie stosuje cookies analitycznych ani marketingowych — używana analityka (Umami, zob. sekcja „Analityka") jest **beznośnikowa** i nie zapisuje cookies. Cookies podmiotów trzecich mogą być ustawiane przez osadzone filmy YouTube (zob. sekcja „Osadzone filmy"). Cookies można zarządzać w ustawieniach przeglądarki.

## 10. Zautomatyzowane podejmowanie decyzji

Administrator nie podejmuje wobec Ciebie decyzji opartych wyłącznie na zautomatyzowanym przetwarzaniu (w tym profilowaniu), które wywoływałyby skutki prawne lub w podobny sposób istotnie na Ciebie wpływały. Operator płatności Stripe może stosować własne mechanizmy oceny ryzyka oszustwa.

## 11. Zmiany Polityki

Polityka może być aktualizowana; obowiązuje od dnia ${LEGAL_UPDATED.pl}.
`

const politykaEN = `
# Privacy Policy

**Last updated: ${LEGAL_UPDATED.en}**

## 1. Data controller

The controller of your personal data is **${SELLER.name}** (the **${SELLER.brand}** brand), ${SELLER.address}, Poland, Tax ID (NIP): **${SELLER.nip}** (the "Controller"). Contact for data matters: **${SELLER.email}**. The Controller has not appointed a Data Protection Officer.

## 2. Purposes and legal bases (GDPR)

| Purpose | Legal basis |
|---|---|
| Order fulfilment, file delivery, Course access, account management | Art. 6(1)(b) GDPR (contract performance) |
| Issuing and storing invoices, tax settlements | Art. 6(1)(c) GDPR (legal obligation) |
| Newsletter / marketing messages | Art. 6(1)(a) GDPR (consent) |
| Operational order notifications (Discord, without e-mail address) and anonymous analytics (Umami) | Art. 6(1)(f) GDPR (legitimate interest: running and monitoring sales) |
| Correspondence (e-mail, Discord), including with AI tools | Art. 6(1)(b) GDPR (where it concerns a contract), otherwise Art. 6(1)(f) GDPR (legitimate interest: handling enquiries efficiently) |
| Live sessions and their recordings, made available to participants | Art. 6(1)(b) GDPR (contract performance); for recording a participant's voice — Art. 6(1)(f) GDPR (legitimate interest: providing complete recordings to participants) |
| Community and support on Discord | Art. 6(1)(b) GDPR (contract performance) and (f) (legitimate interest: running the community) |
| Fraud prevention, security, establishing/defending claims | Art. 6(1)(f) GDPR (legitimate interest) |
| Non-essential cookies (if implemented) | Art. 6(1)(a) GDPR (consent) |

## 3. Recipients (processors)

Data may be entrusted to the following processors, with whom the Controller has data processing agreements (Art. 28 GDPR):

- **Stripe** (Stripe Payments Europe, Ltd., Ireland) — payment processing; processes payment and identification data. Stripe may transfer data to the **USA** under the **EU–US Data Privacy Framework (DPF)** and **Standard Contractual Clauses (SCCs)**. Stripe acts as a processor and, for fraud prevention and regulatory duties, as a separate controller.
- **Brevo (Sendinblue SAS, Paris, France)** — sending e-mails (transactional and marketing); an **EU-based** processor, data processed in the EU.
- **Hetzner Online GmbH (Germany)** — hosting/infrastructure; an **EU-based** processor (servers in Germany).
- **Discord (Discord Inc., USA)** — (a) the Controller's internal channel that receives **operational order notifications** containing only the order ID, product name and amount (**no buyer e-mail address**); (b) community and support channels for Customers (see the "Discord" section). The transfer to the **USA** is based on **Standard Contractual Clauses (SCCs)** and, where applicable, the EU–US Data Privacy Framework.
- **Scanye** — an accounting-document tool; processes data contained in invoices (e.g. company name, tax ID, address).
- **GitHub (GitHub Inc., USA)** — where access to materials or a repository is provided via GitHub, your GitHub username and related data are processed. Transfer to the **USA** — based on the DPF and SCCs.
- **The online meeting (video-conferencing) provider** — for live sessions; the tool is named in the meeting invitation. Where the provider processes data outside the EEA, this is based on the DPF or SCCs.
- **AI tool providers** (language models) — where correspondence is processed with them (see the "AI tools" section); transfers outside the EEA — based on the DPF or SCCs.

## Analytics (Umami)

For traffic statistics the Controller uses **self-hosted Umami** (at **stats.67projects.app**). Umami runs **without cookies** and without cross-site tracking identifiers; it collects only **anonymous, aggregate** data (e.g. page views, country, device type, buy-button clicks). We do not use third-party analytics (e.g. Google Analytics) or advertising tools. Because the analytics is cookieless and anonymous, no cookie-consent banner is required.

## Live sessions and recordings

Live sessions (e.g. as part of a workshop or course) may be recorded. **Only the host's screen and voice** are recorded; if you speak (e.g. ask a question), **your voice** may appear in the recording. **Participants' cameras are not recorded.** If you do not want your voice in the recording, you can ask your question in the chat or on Discord. Recordings are made available only to participants of the given edition and are kept for **12 months** from the session, then deleted.

## Discord

On Discord channels we process your username, avatar and the content of the messages you post. Messages are visible to other channel participants. Discord Inc. also processes your account data as a **separate controller** under its own privacy policy. Do not post sensitive data, passwords or access keys on Discord.

## AI tools

Correspondence with the Controller (e-mail, Discord, complaints) may be processed using AI tools (e.g. to draft a reply or summarise a case). The legal basis is the Controller's **legitimate interest** (Art. 6(1)(f) GDPR) — handling enquiries efficiently. Replies and decisions in your case (e.g. resolving a complaint) are made by a human. You may **object** to such processing by writing to **${SELLER.email}**.

## Embedded videos (YouTube)

Course pages and lessons may embed videos from **YouTube** (Google Ireland Ltd. / Google LLC). When a page with such a video loads, your browser connects to Google's servers, which may read and set cookies and process your IP address and device data — under Google's privacy policy, as a separate controller. Data may be transferred to the **USA** (based on the DPF).

## Newsletter and marketing (consent, double opt-in)

If you subscribe to the newsletter — at checkout by ticking the separate, optional "I want to receive the newsletter" box (independent of the purchase consent), via the signup form, or by giving your e-mail in exchange for **free content** (a lead-magnet — a free app or course) — your e-mail address is added to a mailing list operated by **Brevo (Sendinblue SAS)**. We use **double opt-in**: after subscribing you receive an e-mail with a confirmation link, and your address is added to the list **only after you click** it. Brevo keeps an auditable record of that consent. Alongside the address we store attributes used solely for sending-segmentation: the **subscription source** (purchase or lead-magnet), the **product identifier** (slug), and the **surface** (apps/courses). The legal basis is **consent (Art. 6(1)(a) GDPR)**. For a lead-magnet, joining the list and unlocking the free content happen with the same confirmation click. You may **withdraw consent at any time** — using the "unsubscribe" link in the footer of every message, or by writing to **${SELLER.email}** — without affecting the lawfulness of processing before withdrawal.

## 4. International transfers

As a rule, data is processed within the European Economic Area. Transfers outside the EEA may concern: the payment provider **Stripe** (USA) — based on the DPF and SCCs; **Discord** (USA) — order notifications (without e-mail address) and community channels — based on SCCs or the DPF; **GitHub** (USA), the online meeting provider, AI tool providers and **YouTube/Google** (USA) — based on the DPF or SCCs. These mechanisms ensure an adequate level of protection.

## 5. Retention periods

- Accounting documents (invoices): **5 years**, counted from the end of the calendar year in which the tax payment deadline fell.
- Order and account data: for the duration of the contract/account, then until the limitation periods for mutual claims expire.
- Newsletter data: until consent is withdrawn.
- Course progress data: for the duration of access, then deleted or anonymised.
- Live-session recordings: **12 months** from the session.
- Correspondence: as long as needed to handle the matter, then until the limitation periods for claims expire.
- Discord messages: until deleted by you or the Controller, or until the channel is closed.
- Session/login cookie: until you log out or the session expires.

## 6. Your rights

You have the right to: access (Art. 15), rectification (Art. 16), erasure (Art. 17), restriction (Art. 18), data portability (Art. 20), objection (Art. 21) — in particular to processing based on legitimate interest and to marketing — and the right to **withdraw consent** at any time (without affecting the lawfulness of processing before withdrawal). Exercise your rights by contacting **${SELLER.email}**.

## 7. Complaint to the supervisory authority

You have the right to lodge a complaint with the **President of the Personal Data Protection Office (PUODO)**, ul. Stawki 2, 00-193 Warsaw, Poland, if you consider that the processing of your data infringes the GDPR.

## 8. Whether providing data is required

Providing data is voluntary but necessary to conclude and perform the contract (e.g. to deliver the file, issue an invoice). Not providing it makes order fulfilment impossible.

## 9. Cookies

The Store itself sets only an **essential** cookie: a session/login cookie (for Courses), valid until you log out or the session expires. The theme preference (light/dark) is stored in the browser's local storage (localStorage) and is not sent to the server. Essential cookies do not require consent; we inform you about them in this Policy. During payment, Stripe may set its own essential cookies (e.g. for fraud prevention). The Controller does not use analytics or marketing cookies — the analytics in use (Umami, see the "Analytics" section) is **cookieless** and sets no cookies. Third-party cookies may be set by embedded YouTube videos (see the "Embedded videos" section). Cookies can be managed in your browser settings.

## 10. Automated decision-making

The Controller does not make decisions about you based solely on automated processing (including profiling) that produce legal effects or similarly significantly affect you. The payment provider Stripe may apply its own fraud-risk scoring.

## 11. Changes to this Policy

This Policy may be updated; it is effective from ${LEGAL_UPDATED.en}.
`

export const LEGAL_CONTENT: Record<LegalDoc, Record<Locale, string>> = {
  regulamin: { pl: regulaminPL.trim(), en: regulaminEN.trim() },
  'polityka-prywatnosci': { pl: politykaPL.trim(), en: politykaEN.trim() },
}
