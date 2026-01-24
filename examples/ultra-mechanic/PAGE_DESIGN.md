# Specyfikacja Wizualna - Ultra Mechanic

> **KONCEPCJA: "HIGH-PERFORMANCE PRECISION"**
> Inspiracja wyścigami, precyzyjną inżynierią i premium automotive. Design ma wywoływać skojarzenia z pit-stopem F1, luksusowymi warsztatami tuningowymi i wysoką wydajnością. Efekt WOW gwarantowany.

---

## PALETA KOLORÓW (Koncepcja kreatywna)

### Filozofia kolorystyczna
```
INSPIRACJA: Pit-stop Formuły 1 w nocnym wyścigu
- Czerwień hamulców rozgrzanych do czerwoności
- Połysk carbon fiber w świetle reflektorów
- Chrom wydechu odbijający światła toru
- Cyfrowe wskaźniki na desce rozdzielczej
- Precyzja pomiaru z dokładnością do setnych sekundy
```

### Primary - Kolor dominujący
```
KONCEPCJA: Głęboka czerń carbon fiber
SKOJARZENIA:
- Włókno węglowe w supersamochodach (Ferrari, Lamborghini)
- Nocna asfaltowa nawierzchnia toru wyścigowego
- Premium, luksus, ekskluzywność
- Matowa czerń z subtelnym połyskiem

UŻYCIE:
- Główne tła sekcji
- Ramki kart i elementów
- Nagłówki
- Bazy przycisków premium

INTENSYWNOŚĆ: Głęboka, ale nie płaska - ma mieć teksturę carbon fiber
```

### Secondary - Kolor energii
```
KONCEPCJA: Krwisty racing red - czerwień hamulców Brembo
SKOJARZENIA:
- Rozgrzane do czerwoności tarcze hamulcowe
- Logo Ferrari, Alfa Romeo
- Puls adrenaliny, szybkość, moc
- Lampki kontrolne "pilne"
- Neon w nocnym warsztacie tuningowym

UŻYCIE:
- Przyciski CTA (Zadzwoń teraz!)
- Numery pogotowia 24h
- Akcenty, podkreślenia
- Hover states
- Pulsujące elementy awaryjne

INTENSYWNOŚĆ: Intensywna, czysta, przyciągająca wzrok jak światło stopu
```

### Accent - Precyzja
```
KONCEPCJA: Chłodny chrom / szczotkowana stal
SKOJARZENIA:
- Profesjonalne narzędzia Snap-On
- Blat stołu warsztatowego
- Felgi aluminiowe po polerowaniu
- Precyzja, czystość, profesjonalizm
- Metaliczny blask w świetle

UŻYCIE:
- Obramowania elementów
- Linie podziału sekcji
- Ikony narzędzi
- Subtelne gradienty na kartach
- Efekty "metalicznego" połysku

INTENSYWNOŚĆ: Chłodny, metaliczny, elegancki
```

### Tertiary - Energia cyfrowa
```
KONCEPCJA: Neonowy żółty jak wskaźnik RPM
SKOJARZENIA:
- Świecące cyfry na prędkościomierzu
- Żółta strefa obrotomierza przed red-line
- Światła ostrzegawcze premium
- Energia, gotowość, czujność

UŻYCIE:
- Liczniki animowane
- Wskaźniki postępu
- Delikatne akcenty na ciemnym tle
- Elementy "cyfrowe"

INTENSYWNOŚĆ: Jasny, elektryczny, ale używany oszczędnie
```

### Tła
```
GŁÓWNE TŁO - LIGHT MODE:
- Bardzo jasny szary z teksturą szczotkowanego aluminium
- Subtelny wzór carbon weave (przeplatanka włókna)
- Czyste, profesjonalne, premium

GŁÓWNE TŁO - DARK MODE:
- Głęboka czerń z teksturą carbon fiber
- Subtelny diagonalny wzór przeplatanki
- NIE płaska czerń - ma mieć głębię i teksturę

TŁO SEKCJI AKCENTOWYCH:
- Dark: Gradient od czerni do bardzo ciemnej czerwieni (ledwo widoczny)
- Light: Gradient od białego do bardzo jasnego szarego

TŁO KART:
- Glass effect z czerwoną poświatą na ciemnym
- Matowe białe z chromową ramką na jasnym
- Efekt "unoszenia się" nad tłem
```

### Semantyczne
```
SUKCES: Zieleń flagi wyścigu - czysta, wyraźna "GO!"
WARNING: Żółta flaga - uwaga, ostrożnie
ERROR: Czerwona flaga - stop, problem
INFO: Niebieski jak światło diagnostyki OBD
```

---

## TYPOGRAFIA

### Fonty
```
NAGŁÓWKI:
- Styl: Agresywny, kanciasty, motorsport
- Inspiracja: Orbitron, Audiowide, Rajdhani, Exo 2
- Cechy: Futurystyczny ale czytelny, techno-feel
- Letter-spacing: Lekko rozstrzelony, uppercase na H1
- Weight: Extra Bold / Black

BODY TEXT:
- Styl: Geometryczny, nowoczesny, czytelny
- Inspiracja: Barlow, Titillium Web, Exo 2, Rajdhani
- Cechy: Doskonała czytelność, lekko techniczny vibe
- Weight: Regular dla body, Medium dla emphasis

LICZBY / STATYSTYKI:
- Styl: Racing / Dashboard feel
- Inspiracja: Orbitron, DS-Digital, Racing Sans One
- Cechy: Jak cyfry na prędkościomierzu
- Weight: Bold, monospace proportions
- Feature: Tabular numbers dla liczników

CTA BUTTONS:
- Styl: Bold, uppercase, tracking wide
- Inspiracja: Pit board / racing signage
- Cechy: Mocny, pewny, nakazujący
```

### Hierarchia
```
H1: Racing headline - Bardzo duży, uppercase, może mieć czerwony accent
H2: Tytuły sekcji - Bold, z akcentem (czerwona linia pod spodem)
H3: Tytuły kart - Semibold, techniczny feel
Body: Standardowy tekst - Regular, high line-height dla czytelności
Small: Dane techniczne - Light, monospacjowy feel
Numbers: Jak na desce rozdzielczej - Bold, tabular
```

---

## EFEKTY WIZUALNE (WOW Factor)

### Carbon Fiber Pattern
```
GDZIE: Tła sekcji, karty, hero background
JAK:
- Subtelny wzór przeplatanki włókna węglowego
- Diagonal 45° orientation
- Bardzo niska opacity (5-8%) żeby nie przytłaczać
- Efekt premium, high-end automotive

CSS:
- Background pattern z SVG lub CSS gradient
- Animowany subtle shimmer przy scrollu (optional)
```

### Racing Stripes
```
GDZIE: Dividers między sekcjami, akcenty na kartach
JAK:
- Klasyczne racing stripes (2 linie czerwone na czarnym)
- Lub pojedyncza czerwona linia z gradient fade
- Kierunek: Diagonalny lub poziomy
- Efekt szybkości, ruchu

WARIANTY:
- Hero: Dwie równoległe linie od góry do dołu
- Cards: Czerwona linia na lewej krawędzi
- Sections: Gradient line jako separator
```

### Gauge / Speedometer Elements
```
GDZIE: Statystyki, liczniki, progress indicators
JAK:
- Okrągłe gauge z liczbą w środku
- Partial circle progress (jak RPM meter)
- Czerwona "danger zone" na końcu skali
- Animacja: Wskazówka / liczba rośnie do wartości

ELEMENTY:
- "16 lat" jako gauge wypełniony w 80%
- "4.8" jako prawie pełny okrąg z gwiazdkami
- "24h" jako zegar/tarcza
- RPM-style counter animation na liczbach
```

### Red Glow Effects
```
GDZIE: Ważne przyciski, emergency CTA, hover states
JAK:
- Box-shadow z czerwonym kolorem, blur 20-30px
- Opacity: 30-50%
- Efekt: Jakby hamulce świeciły w ciemności
- Pulsowanie dla emergency (pogotowie 24h)

INTENSYWNOŚĆ:
- CTA buttons: Subtelny glow zawsze, intensywny na hover
- Emergency: Delikatne pulsowanie (nie irytujące)
- Cards: Red glow na lewej krawędzi przy hover
```

### Precision Crosshair / Reticle
```
GDZIE: Background decoration w hero, sekcja "precyzja"
JAK:
- Subtelny celownik / krzyż precyzji
- Cienkie linie, bardzo niska opacity (3-5%)
- Techniczno-inżynieryjny vibe
- Może być animowany (obrót, pulsowanie)

STYL:
- Koła koncentryczne z podziałką
- Linie krzyżujące się pod 90°
- Małe "kalibracyjne" znaczki
```

### Glass Morphism (Premium variant)
```
GDZIE: Karty usług, testimoniale, navigation
JAK:
- Tło: Bardzo ciemne z 10% opacity
- Blur: Silny (20-32px) dla premium feel
- Border: 1px gradient od chrome do transparent
- Efekt: Jak szklany wyświetlacz HUD w samochodzie

SZCZEGÓŁY:
- Na ciemnych sekcjach: czerwona poświata w tle karty
- Na jasnych: chromowa/metaliczna ramka
- Hover: Zwiększony glow, lift effect
```

### Animacje i interakcje
```
RPM COUNTER (Hero stats):
- Liczby rosną jak na obrotomierzu
- Start od 0, szybko do celu
- "Bounce" na końcu jak wskazówka
- Trigger: Gdy element widoczny

GAUGE FILL (Progress circles):
- Okrąg wypełnia się od 0 do wartości
- Czerwona strefa na końcu (dla wysokich wartości)
- Smooth easing, 1.5-2s duration

CARD HOVER:
- Lift (translateY -8px) - większy niż standard
- Red glow pojawia się / intensyfikuje
- Border zmienia się na gradient czerwony
- Shadow: Zwiększony + czerwony tint
- Transition: Smooth, 0.3s cubic-bezier

BUTTON PULSE:
- Przycisk pogotowia 24h
- Subtelny pulse czerwonego glow
- Nie irytujący, ale zauważalny
- 2s interval

SCROLL REVEAL:
- Fade in + slide from left (nawiązanie do ruchu)
- Stagger: Elementy pojawiają się sekwencyjnie
- Faster timing niż typowe (0.4s) - dynamiczniej
```

### Elementy dekoracyjne
```
RACING LINE DECORATION:
- Czerwona linia biegnąca przez stronę
- Jak ślad hamowania na torze
- Subtelna, nie dominująca
- Może mieć gradient fade na końcach

TECHNICAL GRID:
- Delikatna siatka inżynieryjna w tle
- Blueprint-style, bardzo niska opacity
- Daje efekt precyzji, planowania

CHROME DIVIDERS:
- Linie między sekcjami
- Gradient: transparent → chrome → transparent
- Subtelny metaliczny połysk

ICONS:
- Styl: Line icons, 2px stroke, ostre kąty
- Rozmiar: 24px standard, 40px featured
- Kolor: Chrome/red zależnie od kontekstu
- Hover: Fill z czerwonym
```

---

## PLACEHOLDER IMAGES

### Hero Background
```
OBRAZ: "Night Pit Stop"
OPIS: Profesjonalny warsztat nocą. Samochód na podnośniku (BMW lub Audi),
podświetlony od dołu czerwonym światłem. Mechanik w czarnym kombinezonie
pracuje przy kole. W tle ściana narzędzi na czerwonych panelach.
Dym/mgła dla atmosfery. Oświetlenie: dramatyczne, kontrastowe.
MOOD: Premium, profesjonalny, dramatyczny
ŹRÓDŁO: Unsplash/Pexels szukaj: "car workshop night", "automotive garage dark"
OVERLAY: 70% dark gradient dla czytelności tekstu
```

### Workshop Interior
```
OBRAZ: "Precision Workspace"
OPIS: Czyste, uporządkowane stanowisko pracy. Narzędzia Snap-On na
czerwonym wózku warsztatowym. Komputer diagnostyczny na stole.
Samochód częściowo widoczny w tle. Podłoga epoksydowa, szara.
MOOD: Porządek, profesjonalizm, precyzja
ŹRÓDŁO: "professional auto repair shop", "clean garage workshop"
```

### Team Photo
```
OBRAZ: "The Crew"
OPIS: 6-8 mechaników w czarnych kombinezonach z czerwonymi akcentami.
Stoją przed warsztatem, ręce skrzyżowane lub trzymają narzędzia.
Oświetlenie: naturalne dzienne + światła warsztatu z tyłu.
Uśmiechnięci ale profesjonalni.
MOOD: Zespół, kompetencja, zaufanie
ALTERNATYWA: Pojedyncze zdjęcia każdego członka zespołu, spójny styl
```

### Diagnostic Equipment
```
OBRAZ: "Tech Edge"
OPIS: Nowoczesny sprzęt diagnostyczny. Laptop z oprogramowaniem OBD,
kable podłączone do samochodu. Ekran pokazuje dane techniczne.
Niebieskie/czerwone światło ekranu odbija się na metalowych częściach.
MOOD: Technologia, nowoczesność, precyzja diagnostyczna
ŹRÓDŁO: "car diagnostic computer", "automotive scan tool"
```

### Service Action Shots
```
OBRAZ 1: "Brake Service"
OPIS: Zbliżenie na czerwone zaciski hamulcowe Brembo podczas wymiany.
Ręce mechanika w czarnych rękawicach. Detal na precyzję pracy.

OBRAZ 2: "Engine Bay"
OPIS: Otwarty silnik, mechanik z diagnostyką. Chromowane elementy,
czyste przewody. Skupienie na profesjonalizmie.

OBRAZ 3: "Wheel Alignment"
OPIS: Samochód na geometrii 3D. Czerwone lasery celowników.
Technologiczny vibe, precyzja pomiaru.

OBRAZ 4: "Under the Hood"
OPIS: Dramatyczne ujęcie z dołu samochodu na podnośniku.
Mechanik pracuje przy zawieszeniu. Czerwone/ciepłe światło robocze.
```

### Atmosphere/Detail Shots
```
OBRAZ: "Tool Wall"
OPIS: Ściana z narzędziami, idealny porządek. Klucze posortowane
rozmiarem. Czerwone/czarne tło panelu. Każde narzędzie na swoim miejscu.
MOOD: Organizacja, profesjonalizm, dbałość o szczegóły

OBRAZ: "Clean Floor"
OPIS: Epoksydowa podłoga warsztatu, idealnie czysta. Częściowo
widoczne koła samochodu. Refleksy świateł na powierzchni.
MOOD: Czystość, premium, szacunek do klienta

OBRAZ: "Night Sign"
OPIS: Szyld "Ultra Mechanic" podświetlony czerwonym neonem w nocy.
Deszcz lub mokra nawierzchnia dla refleksów.
MOOD: Rozpoznawalność, dostępność 24h, nowoczesność
```

---

## STRUKTURA STRON

### NAWIGACJA (Header)
```
STYL: Sticky, glass morphism premium, ciemna
WYSOKOŚĆ: 70-80px (większa niż standard = premium feel)
LOGO: Po lewej, "Ultra Mechanic" w racing foncie + czerwony akcent

MENU ITEMS:
1. Strona główna
2. Usługi (może dropdown z kategoriami)
3. O nas
4. Opinie
5. Kontakt

CTA W NAWIGACJI:
- "ZADZWOŃ" - czerwony button z pulsującym glow
- Numer telefonu widoczny na desktop
- Ikona telefonu na mobile

EFEKTY:
- Blur zwiększa się przy scrollu
- Red bottom border (1px) pojawia się po scrollu
- Logo może mieć animację na hover
```

---

## STRONA GŁÓWNA (Home)

### SEKCJA 1: Hero
```
BLOCK: GlassHero

LAYOUT:
- Full viewport height (100vh)
- Split layout: Content (60%) | Visual (40%)
- Lub centered z backgroundem

BACKGROUND:
- Zdjęcie warsztatu nocą
- Dark overlay (70-80%)
- Carbon fiber pattern overlay (5% opacity)
- Racing stripe accent (czerwona linia diagonalnie)

HEADLINE:
"PRECYZJA. MOC. ZAUFANIE."
- Uppercase, racing font
- Bardzo duży (48-64px mobile, 72-96px desktop)
- Czerwony accent na jednym słowie (np. "MOC")
- Animacja: Każde słowo pojawia się osobno

SUBHEADLINE:
"Profesjonalny serwis samochodowy we Wrocławiu"
- Mniejszy font, regular weight
- Chrome/silver color
- Poniżej: "16 lat • 4.8/5 Google • 127+ klientów" z ikonkami

STATS ROW (pod headline):
Trzy gauge indicators:
- [GAUGE] "16" lat doświadczenia
- [GAUGE] "4.8" ocena Google
- [GAUGE] "24h" pomoc drogowa
Animowane counter + gauge fill

PRIMARY CTA:
"UMÓW WIZYTĘ"
- Duży button, czerwony gradient
- Uppercase, tracking wide
- Icon: Kalendarz lub strzałka
- Hover: Red glow intensyfikuje się

SECONDARY CTA:
"POGOTOWIE 24h: 600 123 456"
- Outline button z czerwoną ramką
- Pulsujący glow (subtelny)
- Click-to-call
- Icon: Telefon

DECORATIVE ELEMENTS:
- Subtelne racing stripes w tle
- Technical grid overlay (bardzo niska opacity)
- Precision crosshair decoration w rogu
```

### SEKCJA 2: Trust Indicators (Speed Stats)
```
BLOCK: Features (compact racing variant)

LAYOUT:
- 4 kolumny, full width
- Ciemne tło z carbon fiber texture
- Każda statystyka to "gauge card"

ELEMENTY (z gauge animations):
1. RPM Gauge: "16+" lat na rynku
2. Speed Gauge: "127+" zadowolonych klientów
3. Star Gauge: "4.8" średnia ocena
4. Clock Gauge: "24/7" pomoc drogowa

STYL:
- Każdy element to okrągły gauge z liczbą
- Progress circle animowany
- Czerwona "hot zone" na końcu
- Liczba animuje jak obrotomierz
- Label pod spodem w chrome color

EFEKT: Jak tablica przyrządów w samochodzie
```

### SEKCJA 3: Usługi (Grid)
```
BLOCK: Features

LAYOUT:
- Section headline centered
- Grid 3x2 (desktop), 2x3 (tablet), 1x6 (mobile)
- Jasne tło dla kontrastu (lub karty na ciemnym)

HEADLINE:
"PEŁEN ZAKRES USŁUG"
- Czerwona linia pod tekstem
- Subheadline: "Jeden warsztat - wszystkie potrzeby Twojego auta"

KARTY USŁUG (6):
1. DIAGNOSTYKA KOMPUTEROWA
   - Icon: Monitor/chip
   - Opis: "Profesjonalny odczyt błędów wszystkich marek"
   - Accent: Czerwona linia po lewej

2. SILNIKI I NAPĘD
   - Icon: Engine/cog
   - Opis: "Naprawy silników, rozrząd, turbo"

3. HAMULCE I ZAWIESZENIE
   - Icon: Brake disc
   - Opis: "Klocki, tarcze, amortyzatory, geometria"

4. KLIMATYZACJA
   - Icon: Snowflake
   - Opis: "Nabijanie, naprawa, odgrzybianie"

5. SERWIS OPON
   - Icon: Tire/wheel
   - Opis: "Wymiana, wyważanie, przechowywanie"

6. POMOC DROGOWA 24h
   - Icon: Tow truck
   - Opis: "Holowanie w promieniu 50km"
   - WYRÓŻNIONA: Czerwone tło, pulsująca

STYL KART:
- Glass effect na ciemnym / white shadow na jasnym
- Czerwona lewa krawędź (racing stripe)
- Icon w chromie, zmiana na czerwony przy hover
- Hover: Lift + red glow + scale(1.02)

CTA POD GRIDEM:
"SPRAWDŹ WSZYSTKIE USŁUGI →"
- Link w czerwonym kolorze
- Arrow animowana przy hover
```

### SEKCJA 4: Dlaczego Ultra Mechanic
```
BLOCK: Content + Features hybrid

LAYOUT:
- Ciemne tło
- 2 kolumny lub 4 cards
- Racing stripe divider na górze

HEADLINE:
"DLACZEGO KLIENCI WYBIERAJĄ NAS?"
- "WYBIERAJĄ" w czerwonym

FEATURES (4 karty):
1. UCZCIWE CENY
   - Icon: Price tag / coins
   - "Znasz cenę przed naprawą. Bez ukrytych opłat."
   - Detail: "Kosztorys SMS-em przed każdą usługą"

2. EKSPRESOWA REALIZACJA
   - Icon: Lightning / stopwatch
   - "Większość napraw tego samego dnia."
   - Detail: "Pit-stop efficiency"

3. GWARANCJA JAKOŚCI
   - Icon: Shield / checkmark
   - "12 miesięcy gwarancji na usługi i części."
   - Detail: "Oryginalne części lub zamienniki premium"

4. DOŚWIADCZENIE
   - Icon: Trophy / medal
   - "16 lat i tysiące naprawionych aut."
   - Detail: "Certyfikowani specjaliści VAG, BMW, Mercedes"

STYL:
- Duże ikony (48px) w czerwonym
- Karty glass z chromową ramką
- Hover: Ikona scale + rotate slight
- Counter dla doświadczenia ("16" animowane)
```

### SEKCJA 5: Opinie
```
BLOCK: Testimonials

LAYOUT:
- Jasne tło
- Karuzela 3 opinii (desktop), 1 (mobile)
- Google badge wyróżniony

HEADLINE:
"CO MÓWIĄ KLIENCI"
- Google logo + "4.8/5 z 127 opinii"
- 5 gwiazdek w czerwonym

TESTIMONIALS (3):
Każda karta:
- 5 gwiazdek na górze (red filled)
- Cytat w cudzysłowie (decorative " w czerwonym)
- Imię i inicjał nazwiska
- Data opinii
- Google icon small

STYL:
- Karty white z shadow, rounded corners
- Red quote mark decoration (40px, opacity 20%)
- Smooth slide transition
- Arrows w chromie, hover red

TRUST BADGE POD KARUZELĄ:
- "Sprawdź nas na Google Maps →"
- Google logo + stars
```

### SEKCJA 6: CTA Finalne
```
BLOCK: ContactCTA

LAYOUT:
- Ciemne tło z gradient red accent
- Centered content
- Racing stripes jako decoration

HEADLINE:
"TWOJE AUTO POTRZEBUJE POMOCY?"
- Duży, bold

SUBHEADLINE:
"Zadzwoń teraz lub zostaw numer - oddzwonimy w 15 minut"

CTA BUTTONS:
1. PRIMARY: "ZADZWOŃ: 71 123 45 67"
   - Duży czerwony button
   - Phone icon
   - Red glow
   - Click-to-call

2. SECONDARY: "ZOSTAW NUMER"
   - Outline button
   - Form modal trigger
   - Message icon

EMERGENCY BANNER (pod przyciskami):
"POGOTOWIE 24/7: 600 123 456"
- Wyróżniony box z pulsującym czerwonym border
- Tow truck icon
- Zawsze widoczny, akcent całej sekcji

HOURS QUICK INFO:
- Ikony dni + godziny w jednej linii
- Compact, informacyjne
```

---

## STRONA: USŁUGI

### Struktura
```
HERO (compact):
- "NASZE USŁUGI"
- Subheadline: "Kompleksowy serwis wszystkich marek"
- Czerwona linia dekoracyjna

CENNIK USŁUG:
- Accordion lub cards grid
- Kategorie: 7 sekcji (jak w PAGE_DESCRIPTION)
- Każda usługa: nazwa + krótki opis + "od XX zł" + czas

STYL:
- Jasne tło, karty white
- Kategoria = header z ikoną
- Ceny w czerwonym, bold
- Czas w chrome/gray

CTA:
"Nie znalazłeś usługi? Zadzwoń!"
```

---

## STRONA: O NAS

### Struktura
```
HERO:
- "O ULTRA MECHANIC"
- Zdjęcie zespołu lub warsztatu

SEKCJA: Historia
- Timeline: 2008 → dziś
- Milestone cards z datami
- Liczniki: Auta naprawione, lata, klienci

SEKCJA: Zespół
- Grid zdjęć/avatarów
- Każda osoba: Imię, stanowisko, specjalizacja
- Hover: Rozwinięcie z doświadczeniem

SEKCJA: Warsztat
- Gallery slider ze zdjęciami
- Sprzęt i certyfikaty
- Premium equipment badges

SEKCJA: Wartości
- 3-4 wartości w racing card style
- Ikony + krótkie opisy
```

---

## STRONA: OPINIE

### Struktura
```
HERO:
- "OPINIE KLIENTÓW"
- Big stats: 4.8/5 • 127 opinii • 94% poleca
- Google badge prominent

FILTERS:
- Wszystkie / 5 stars / 4+ stars
- Sortowanie: Najnowsze / Najwyższe

LISTA OPINII:
- Cards grid lub list
- Wszystkie 6 opinii z Google (z PAGE_DESCRIPTION)
- Odpowiedzi właściciela w innym kolorze

CTA:
"Byłeś u nas? Oceń nas na Google!"
- Google icon + link
```

---

## STRONA: KONTAKT

### Struktura
```
LAYOUT: 2 kolumny - Formularz | Info + Mapa

FORMULARZ:
- Pola: Imię, Telefon (required), Email, Marka auta, Usługa (select), Wiadomość
- Button: "WYŚLIJ ZAPYTANIE" - czerwony
- Checkbox RODO

INFO:
- Adres z Google Maps link
- Telefon główny (click-to-call, red highlight)
- Telefon pogotowia (pulsujący)
- Email
- Godziny (tabela)

MAPA:
- Google Maps embed
- Custom marker w czerwonym
- Link: "Nawiguj do warsztatu"

EMERGENCY BANNER:
- Na górze lub dole
- "POGOTOWIE 24h" box
```

---

## FOOTER

### Struktura
```
LAYOUT: 4 kolumny + bottom bar
STYL: Ciemne tło z carbon texture

KOLUMNA 1: Brand
- Logo Ultra Mechanic
- Tagline: "Precyzja. Moc. Zaufanie."
- Social icons (red on hover)

KOLUMNA 2: Menu
- Quick links do podstron

KOLUMNA 3: Usługi
- Top 6 usług jako linki

KOLUMNA 4: Kontakt
- Adres, telefon, email, godziny
- Telefon pogotowia wyróżniony

BOTTOM BAR:
- Copyright
- Polityka prywatności
- "Made by [agency]"
- Racing stripe thin line na górze
```

---

## RESPONSIVE DESIGN

### Breakpoints
```
MOBILE: < 640px
- Single column layouts
- Hamburger menu z full-screen overlay
- Mniejsze gauge elements
- Touch-friendly (48px min touch targets)
- Sticky "Zadzwoń" button na dole

TABLET: 640px - 1024px
- 2-column grids
- Reduced animations
- Simplified gauges

DESKTOP: > 1024px
- Full layouts
- All animations active
- Hover effects enabled
```

### Mobile-First Priorities
```
- Click-to-call prominentne
- Emergency number zawsze widoczny
- Szybki dostęp do formularza
- Godziny otwarcia łatwo dostępne
- Mapa z nawigacją
```

---

## ACCESSIBILITY

### Wymagania
```
- Contrast ratio: AA minimum (4.5:1 dla tekstu)
- Czerwień testowana na tle ciemnym i jasnym
- Alt text na wszystkich obrazach
- Keyboard navigation pełna
- Focus indicators widoczne (czerwone)
- Reduced motion: Wyłączenie animacji
- Screen reader friendly
```

---

## PERFORMANCE

### Optymalizacje
```
- Lazy loading obrazów i tła
- Animacje używają transform/opacity tylko
- will-change dla gauge animations
- Preload critical fonts
- Reduced motion media query honorowane
- Carbon fiber pattern jako CSS, nie obraz
- SVG icons zamiast font icons
```

---

## PODSUMOWANIE - WOW FACTORS

1. **Racing/Motorsport DNA** - Cała strona oddycha high-performance
2. **Animated Gauges** - Statystyki jak na desce rozdzielczej
3. **Red Glow Effects** - Dramatyczne, premium akcenty
4. **Carbon Fiber Textures** - Luksusowy, automotive feel
5. **Precision Typography** - Racing fonts = natychmiastowe rozpoznanie branży
6. **Racing Stripes** - Dynamika i ruch w statycznych elementach
7. **Emergency Pulse** - Pogotowie 24h przyciąga uwagę bez irytacji
8. **Counter Animations** - Liczby rosną jak RPM = engagement
9. **Chrome/Steel Accents** - Autentyczność, profesjonalizm
10. **Technical Grid Overlays** - Precyzja inżynieryjna
