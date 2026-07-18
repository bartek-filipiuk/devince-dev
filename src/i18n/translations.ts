import type { Locale } from './config'

const translations = {
  pl: {
    // Navigation
    'nav.home': 'Strona główna',
    'nav.posts': 'Blog',
    'nav.events': 'Wydarzenia',
    'nav.courses': 'Kursy',
    'nav.workshops': 'Warsztaty',
    'nav.contact': 'Kontakt',

    // Common
    'common.readMore': 'Czytaj więcej',
    'common.viewAll': 'Zobacz wszystkie',
    'common.loading': 'Ładowanie...',
    'common.error': 'Wystąpił błąd',
    'common.notFound': 'Nie znaleziono',
    'common.free': 'Bezpłatne',
    'common.registerNow': 'Zarejestruj się',
    'common.joinOnline': 'Dołącz online',
    'common.learnMore': 'Dowiedz się więcej',

    // Events
    'events.title': 'Wydarzenia',
    'events.description': 'Odkryj nadchodzące wydarzenia i dołącz do nas.',
    'events.noEvents': 'Brak zaplanowanych wydarzeń.',
    'events.freeEvent': 'Bezpłatne wydarzenie',
    'events.aboutEvent': 'O wydarzeniu',
    'events.dateTime': 'Data i czas',
    'events.location': 'Lokalizacja',
    'events.onlineEvent': 'Wydarzenie online',
    'events.capacity': 'Liczba miejsc',
    'events.maxParticipants': 'Maks. {count} uczestników',
    'events.registrationDeadline': 'Termin rejestracji',

    // Courses
    'courses.title': 'Kursy',
    'courses.description': 'Przeglądaj nasze kursy i zacznij się uczyć.',
    'courses.noCourses': 'Brak dostępnych kursów.',
    'courses.freeCourse': 'Bezpłatny kurs',
    'courses.aboutCourse': 'O kursie',
    'courses.duration': 'Czas trwania',
    'courses.level': 'Poziom',
    'courses.startDate': 'Data rozpoczęcia',
    'courses.delivery': 'Forma',
    'courses.instructor': 'Prowadzący',
    'courses.levels.beginner': 'Początkujący',
    'courses.levels.intermediate': 'Średniozaawansowany',
    'courses.levels.advanced': 'Zaawansowany',
    'courses.delivery.online': 'Online',
    'courses.delivery.offline': 'Stacjonarnie',
    'courses.delivery.hybrid': 'Hybrydowo',

    // Workshops
    'workshops.title': 'Warsztaty',
    'workshops.description': 'Dołącz do naszych praktycznych warsztatów.',
    'workshops.noWorkshops': 'Brak zaplanowanych warsztatów.',
    'workshops.freeWorkshop': 'Bezpłatne warsztaty',
    'workshops.aboutWorkshop': 'O warsztatach',

    // Contact
    'contact.title': 'Kontakt',
    'contact.description': 'Skontaktuj się z nami.',
    'contact.getInTouch': 'Skontaktuj się',
    'contact.address': 'Adres',
    'contact.email': 'Email',
    'contact.phone': 'Telefon',

    // Newsletter
    'newsletter.title': 'Newsletter',
    'newsletter.description': 'Zapisz się do naszego newslettera.',
    'newsletter.placeholder': 'Twój adres email',
    'newsletter.subscribe': 'Zapisz się',
    'newsletter.subscribing': 'Zapisywanie...',
    'newsletter.success': 'Sprawdź swoją skrzynkę email, aby potwierdzić subskrypcję.',
    'newsletter.confirmed.title': 'Subskrypcja potwierdzona!',
    'newsletter.confirmed.message': 'Dziękujemy za potwierdzenie subskrypcji newslettera.',

    'newsletter.subscribeTitle': 'Zapisz się do naszego newslettera',
    'newsletter.successMessage': 'Subskrypcja udana!',
    'newsletter.failed': 'Subskrypcja nie powiodła się',
    'newsletter.errorRetry': 'Wystąpił błąd. Spróbuj ponownie.',
    'newsletter.confirmed.returnHome': 'Powrót do strony głównej',
    'newsletter.confirmed.metaTitle': 'Subskrypcja newslettera potwierdzona',
    'newsletter.confirmed.metaDescription': 'Twoja subskrypcja newslettera została potwierdzona.',

    // Footer
    'footer.navigation': 'Nawigacja',
    'footer.contact': 'Kontakt',
    'footer.followUs': 'Obserwuj nas',
    'footer.allRightsReserved': 'Wszelkie prawa zastrzeżone.',
    'footer.legal': 'Informacje prawne',

    // Legal
    'legal.terms': 'Regulamin',
    'legal.privacy': 'Polityka Prywatności',
    'legal.updated': 'Ostatnia aktualizacja',

    // Header
    'header.search': 'Szukaj',
    'header.openMenu': 'Otwórz menu',
    'header.closeMenu': 'Zamknij menu',

    // Search
    'search.title': 'Szukaj',
    'search.placeholder': 'Szukaj...',
    'search.noResults': 'Brak wyników',
    'search.submit': 'Szukaj',
    'search.pageNoResults': 'Brak wyników.',
    'search.metaTitle': 'Devince Wyszukiwarka',

    // Posts
    'posts.title': 'Blog',
    'posts.metaTitle': 'Devince Blog',

    // Projects
    'projects.title': 'Projekty',
    'projects.description': 'Zbiór moich prac i projektów dodatkowych.',
    'projects.noProjects': 'Nie znaleziono projektów.',
    'projects.metaTitle': 'Projekty | Portfolio',
    'projects.metaDescription': 'Zbiór moich prac i projektów dodatkowych.',

    // Pagination
    'pagination.previous': 'Poprzednia',
    'pagination.next': 'Następna',
    'pagination.goToPrevious': 'Przejdź do poprzedniej strony',
    'pagination.goToNext': 'Przejdź do następnej strony',
    'pagination.morePages': 'Więcej stron',
    'pagination.label': 'paginacja',

    // Page range
    'pageRange.docsPlural': 'Dokumenty',
    'pageRange.docsSingular': 'Dokument',
    'pageRange.postsPlural': 'Wpisy',
    'pageRange.postsSingular': 'Wpis',
    'pageRange.noResults': 'Wyszukiwanie nie dało wyników.',
    'pageRange.showing': 'Wyświetlanie {range} z {total} {label}',

    // Not found
    'notFound.message': 'Nie można znaleźć tej strony.',
    'notFound.goHome': 'Wróć do strony głównej',

    // Post
    'post.untitledCategory': 'Kategoria bez nazwy',
    'post.author': 'Autor',
    'post.datePublished': 'Data publikacji',

    // Card
    'card.untitledCategory': 'Kategoria bez nazwy',

    // Project
    'project.noImage': 'Brak obrazu',
    'project.liveSite': 'Zobacz na żywo',

    // Program
    'program.type.course': 'Kurs',
    'program.type.workshop': 'Warsztat',
    'program.type.event': 'Wydarzenie',
    'program.format.online': 'Online',
    'program.format.physical': 'Stacjonarnie',
    'program.format.hybrid': 'Hybrydowo',
    'program.pricing.free': 'Bezpłatnie',
    'program.pricing.paid': 'Płatne',
    'program.label.date': 'Data',
    'program.label.duration': 'Czas trwania',
    'program.label.format': 'Format',
    'program.label.location': 'Lokalizacja',
    'program.label.price': 'Cena',
    'program.noImage': 'Brak obrazu',

    // SEO
    'seo.defaultDescription': 'Strona zbudowana w oparciu o Payload i Next.js.',

    // Contact (page)
    'contact.notConfigured':
      'Dane kontaktowe nie zostały skonfigurowane. Zaktualizuj ustawienia witryny w panelu administracyjnym.',
    'contact.findUs': 'Znajdź nas',
    'contact.mapPlaceholder': 'Tutaj można dodać mapę lub dodatkowe informacje.',
    'contact.followUs': 'Obserwuj nas',
    'contact.pageTitle': 'Skontaktuj się z nami',
    'contact.metaTitle': 'Kontakt',
    'contact.metaDescription':
      'Skontaktuj się z nami. Znajdź nasze dane kontaktowe i lokalizację.',

    // ── Apps subdomain (apps.devince.dev) ──
    // Layout / chrome
    'apps.meta.title': 'Devince · apps',
    'apps.meta.titleTemplate': '%s · Devince apps',
    'apps.meta.description': 'Aplikacje i pliki do pobrania — Devince.',
    'apps.skip': 'Przejdź do treści',
    'apps.nav.brand': 'Devince',
    'apps.nav.suffix': '· apps',
    'apps.footer.tagline': 'aplikacje i pliki do pobrania',
    'apps.theme.light': 'Jasny',
    'apps.theme.dark': 'Ciemny',

    // Storefront
    'apps.store.meta': 'Sklep',
    'apps.store.eyebrow': 'sklep',
    'apps.store.title': 'Aplikacje i pliki',
    'apps.store.lead': 'Gotowe narzędzia, szablony i pliki do pobrania — kup raz, korzystaj bez limitu.',
    'apps.store.empty': 'Wkrótce — pracujemy nad pierwszymi produktami.',
    'apps.store.from': 'od',
    'apps.store.view': 'Zobacz',

    // Product page
    'apps.product.metaNotFound': 'Produkt nie znaleziony · Devince',
    'apps.product.eyebrow': 'produkt',
    'apps.product.buy': 'Kup teraz',
    'apps.product.gallery': 'Zrzuty ekranu',
    'apps.product.galleryLink': 'Zobacz zrzuty ekranu',
    'apps.gallery.back': 'Wróć do produktu',
    'apps.product.processing': 'Przekierowuję…',
    'apps.product.error': 'Nie udało się rozpocząć płatności. Spróbuj ponownie.',
    'apps.product.note': 'Po zakupie wyślemy link do pobrania na Twój e-mail.',
    'apps.product.consent':
      'Wyrażam zgodę na natychmiastowe rozpoczęcie dostarczania treści cyfrowej (pobranie pliku) i przyjmuję do wiadomości, że z chwilą wykonania umowy (udostępnienia pliku) tracę prawo odstąpienia od umowy.',
    'apps.checkout.newsletter': 'Chcę dostawać newsletter (oddzielne od zakupu).',
    'apps.product.chooseLicense': 'Wybierz licencję',
    'apps.product.recommended': 'Polecany',

    // Lead magnet (free-for-email) — shared form copy (apps + courses)
    'leadMagnet.emailLabel': 'Twój e-mail',
    'leadMagnet.emailPlaceholder': 'ty@example.com',
    'leadMagnet.submit': 'Odbierz za darmo',
    'leadMagnet.processing': 'Wysyłam…',
    'leadMagnet.note':
      'Podaj e-mail → potwierdź zapis w mailu → dostajesz dostęp i dołączasz do listy. Bez płatności.',
    'leadMagnet.success': '📧 Sprawdź mail i potwierdź zapis, żeby odebrać dostęp.',
    'leadMagnet.error': 'Coś poszło nie tak. Spróbuj ponownie za chwilę.',
    'leadMagnet.invalidEmail': 'Podaj poprawny adres e-mail.',
    'leadMagnet.unavailable': 'Darmowy dostęp jest chwilowo niedostępny. Wróć później.',
    'leadMagnet.freeBadge': 'Za darmo',

    // Lead magnet confirm landing (/claim/confirmed)
    'claim.meta': 'Potwierdzenie dostępu',
    'claim.granted.eyebrow': 'dostęp odblokowany',
    'claim.granted.title': '✅ Dostęp odblokowany',
    'claim.granted.body':
      'Wszystko gotowe! Wysłaliśmy Ci maila z linkiem dostępowym — sprawdź skrzynkę (i folder spam).',
    'claim.used.eyebrow': 'link już wykorzystany',
    'claim.used.title': 'Ten link został już użyty',
    'claim.used.body':
      'Dostęp został już przyznany wcześniej. Sprawdź swoją skrzynkę — wysłaliśmy maila z linkiem dostępowym. W razie problemów odpisz na tego maila.',
    'claim.invalid.eyebrow': 'link nieprawidłowy',
    'claim.invalid.title': 'Link jest nieprawidłowy',
    'claim.invalid.body':
      'Ten link dostępowy jest nieprawidłowy lub niekompletny. Upewnij się, że skopiował się w całości z maila potwierdzającego, albo spróbuj zapisać się jeszcze raz.',

    // Success page
    'apps.success.meta': 'Dziękujemy',
    'apps.success.eyebrow': 'zakup potwierdzony',
    'apps.success.title': 'Dziękujemy za zakup!',
    'apps.success.body': 'Wysłaliśmy link do pobrania na Twój adres e-mail. Sprawdź też folder spam.',

    // Download page
    'apps.download.meta': 'Pobieranie',
    'apps.download.eyebrow': 'pobieranie',
    'apps.download.invalid': 'Link jest nieprawidłowy.',
    'apps.download.invalidBody':
      'Jeśli właśnie kupiłeś produkt — sprawdź, czy link z maila skopiował się w całości. W razie problemów odpisz na maila z zakupem.',
    'apps.download.expired': 'Link wygasł.',
    'apps.download.expiredBody': 'Odpisz na maila z potwierdzeniem zakupu, a wyślemy nowy.',
    'apps.download.limit': 'Limit pobrań został wyczerpany.',
    'apps.download.limitBody': 'Odpisz na maila z potwierdzeniem zakupu, a wyślemy nowy.',
    'apps.download.remaining': 'pozostało pobrań:',
    'apps.download.contact':
      'Brak plików do pobrania — skontaktuj się z nami odpisując na maila z potwierdzeniem zakupu.',
    'apps.download.fileHeading': 'Pliki do pobrania',

    // Not found
    'apps.notFound.eyebrow': 'błąd',
    'apps.notFound.title': '404 — nie ma takiej strony.',
    'apps.notFound.body': 'Strona, której szukasz, nie istnieje lub została przeniesiona.',
    'apps.notFound.cta': 'Wróć do sklepu',
    'apps.footer.back': 'Wróć do sklepu',

    // ── Courses subdomain (courses.devince.dev) ──
    // Layout / chrome
    'courses.meta.title': 'Devince · kursy',
    'courses.meta.description': 'Kursy budowane na żywo z Claude Code.',
    'courses.skip': 'Przejdź do treści',
    'courses.nav.brand': 'Devince',
    'courses.nav.suffix': '· kursy',
    'courses.nav.courses': 'Kursy',
    'courses.nav.account': 'Konto',
    'courses.nav.start': 'Zacznij kurs',
    'courses.footer.tagline': 'Devince — kursy budowane na żywo z Claude Code',
    'courses.footer.stats': '24 etapy · 10 faz · 2 hard-gate’y',
    'courses.theme.light': 'Jasny',
    'courses.theme.dark': 'Ciemny',
    'courses.pagination.prev': 'Poprzednia',
    'courses.pagination.next': 'Następna',
    'courses.pagination.label': 'Paginacja kursów',

    // Checkout success ("check your email")
    'courses.success.meta': 'Dziękujemy',
    'courses.success.eyebrow': 'zakup potwierdzony',
    'courses.success.title': 'Dziękujemy za zakup!',
    'courses.success.body':
      'Sprawdź mail — wysłaliśmy link, żeby ustawić hasło i wejść do kursu. Zajrzyj też do folderu spam.',
    'courses.success.back': 'Wróć do kursów',

    // Storefront
    'courses.store.eyebrow': 'Kursy',
    'courses.store.title': 'Płatne kursy',
    'courses.store.lead': 'Przeglądaj kursy budowane na żywo z Claude Code.',
    'courses.store.empty': 'Brak dostępnych kursów.',
    'courses.store.paid': 'Płatny',
    'courses.store.phases': 'faz',
    'courses.store.stages': 'etapów',
    'courses.store.details': 'Szczegóły',
    'courses.store.statusInProgress': 'W trakcie',
    'courses.store.statusCompleted': 'Ukończony',
    'courses.store.featured': 'Polecany',

    // Syllabus
    'courses.syllabus.metaNotFound': 'Kurs nie znaleziony · Devince',
    'courses.syllabus.eyebrow': 'Kurs · flow produkcyjny',
    'courses.syllabus.metaPhases': 'faz',
    'courses.syllabus.metaStages': 'etapów',
    'courses.syllabus.metaTime': 'szac. czas',
    'courses.syllabus.metaGates': 'hard-gate',
    'courses.syllabus.cta': 'Zacznij',
    'courses.syllabus.spineLabel': 'Przegląd faz',
    'courses.syllabus.spineAxis': 'oś',
    'courses.syllabus.stageShort': 'et.',
    'courses.syllabus.outcomes': 'Czego się nauczysz',
    'courses.syllabus.outcomesEyebrow': 'Efekty',
    'courses.syllabus.curriculum': 'Program',
    'courses.syllabus.curriculumEyebrow': 'Program',
    'courses.syllabus.curriculumNote':
      'Każdy etap to osobna lekcja: po co istnieje, co robisz, Definition of Done, skille i zależności. Twarde bramki oznaczone są jako',
    'courses.syllabus.curriculumNoteAfter': '— są nieskippowalne.',
    'courses.syllabus.phase': 'Faza',
    'courses.syllabus.stageSingular': 'etap',
    'courses.syllabus.stagePlural': 'etapy',
    'courses.syllabus.soon': 'Wkrótce',
    'courses.syllabus.ctaBandTitle': 'Gotowy, żeby zacząć?',
    'courses.syllabus.ctaBandBody':
      'Przejdź cały pipeline od pomysłu do wdrożenia — krok po kroku, z twardymi bramkami, które pilnują jakości.',
    'courses.syllabus.buy': 'Kup dostęp',
    'courses.syllabus.continue': 'Kontynuuj',

    // Checkout (consent gate)
    'courses.checkout.consent':
      'Wyrażam zgodę na rozpoczęcie dostępu do treści cyfrowych przed upływem terminu odstąpienia i przyjmuję do wiadomości utratę prawa do odstąpienia (art. 38 pkt 13).',
    'courses.checkout.processing': 'Przekierowuję…',
    'courses.checkout.error': 'Nie udało się rozpocząć płatności. Spróbuj ponownie.',
    'courses.checkout.consentRequired': 'Zaznacz najpierw zgodę powyżej, aby przejść do płatności.',
    'courses.checkout.newsletter': 'Chcę dostawać newsletter (oddzielne od zakupu).',

    // Badges
    'courses.badge.gate': 'hard-gate',
    'courses.badge.hybrid': 'hybrid · IRL',
    'courses.badge.decision': 'decision',

    // Info cards
    'courses.infocards.audience': 'Dla kogo',
    'courses.infocards.requirements': 'Czego potrzebujesz',

    // Lesson view
    'courses.lesson.nav': 'Program kursu',
    'courses.lesson.navStages': 'Etapy kursu',
    'courses.lesson.stageSingular': 'etap',
    'courses.lesson.stagePlural': 'etapów',
    'courses.lesson.stageShort': 'et.',
    'courses.lesson.syllabus': 'Sylabus',
    'courses.lesson.phase': 'Faza',
    'courses.lesson.stage': 'Etap',
    'courses.lesson.recording': 'nagranie lekcji',
    'courses.lesson.minutes': 'min',
    'courses.lesson.pagerLabel': 'Nawigacja między lekcjami',
    'courses.lesson.why': 'Po co',
    'courses.lesson.what': 'Co robisz',
    'courses.lesson.dod': 'Definition of Done',
    'courses.lesson.skills': 'Skille w tej lekcji',
    'courses.lesson.deps': 'Zależności',
    'courses.lesson.prev': 'Poprzedni',
    'courses.lesson.next': 'Następny',
    'courses.lesson.start': 'Początek',
    'courses.lesson.end': 'Koniec',

    // Courses — cohort gating (kłódki + ekran blokady)
    'courses.lesson.locked': 'Zablokowana',
    'courses.lesson.lockedEyebrow': 'Lekcja zablokowana',
    'courses.lesson.lockedFallback': 'Lekcja jeszcze zablokowana',
    'courses.lesson.lockedCta': 'Wróć do kursu',

    // Courses — pro UX (lesson reading + progress)
    'courses.lesson.onThisPage': 'Na tej stronie',
    'courses.lesson.markComplete': 'Ukończ i dalej',
    'courses.lesson.markCompleteLast': 'Oznacz jako ukończone',
    'courses.lesson.completed': 'Ukończono',
    'courses.lesson.undo': 'Odznacz',
    'courses.lesson.readMin': 'min czytania',
    'courses.lesson.copy': 'Kopiuj',
    'courses.lesson.copied': 'Skopiowano',
    'courses.progress.label': 'Postęp',
    'courses.progress.unit': 'lekcji',
    'courses.syllabus.resume': 'Wróć do nauki',
    'courses.syllabus.allDone': 'Ukończono kurs',
    'courses.syllabus.totalTimeUnit': 'h',
    'courses.auth.resume': 'Wróć do nauki',
    'courses.auth.notStarted': 'Rozpocznij',

    // Auth
    'courses.auth.eyebrow': 'Konto',
    'courses.auth.loginTitle': 'Zaloguj się',
    'courses.auth.accountTitle': 'Twoje kursy',
    'courses.auth.email': 'Email',
    'courses.auth.password': 'Hasło',
    'courses.auth.submit': 'Zaloguj się',
    'courses.auth.submitting': 'Logowanie…',
    'courses.auth.forgot': 'Nie pamiętasz hasła?',
    'courses.auth.invalidCredentials': 'Nieprawidłowy email lub hasło.',
    'courses.auth.logout': 'Wyloguj',
    'courses.auth.loggingOut': 'Wylogowywanie…',
    'courses.auth.empty': 'Nie masz jeszcze żadnych kursów.',
    'courses.auth.courseEyebrow': 'Kurs',
    'courses.auth.openSyllabus': 'Otwórz sylabus',
    // Set password (post-purchase activation)
    'courses.auth.setPasswordTitle': 'Ustaw hasło',
    'courses.auth.confirmPassword': 'Powtórz hasło',
    'courses.auth.startCourse': 'Rozpocznij kurs',
    'courses.auth.activating': 'Aktywowanie…',
    'courses.auth.passwordMismatch': 'Hasła nie są identyczne.',
    'courses.auth.invalidToken': 'Link aktywacyjny wygasł lub jest nieprawidłowy.',
    'courses.auth.missingToken': 'Nieprawidłowy lub brakujący link aktywacyjny.',
    'courses.auth.sendNewLink': 'Wyślij nowy link',
    'courses.auth.genericError': 'Coś poszło nie tak. Spróbuj ponownie.',
    // Forgot password
    'courses.auth.forgotPasswordTitle': 'Resetuj hasło',
    'courses.auth.sendLink': 'Wyślij link',
    'courses.auth.sending': 'Wysyłanie…',
    'courses.auth.resetSent': 'Jeśli konto istnieje, wyślemy link do zresetowania hasła.',
    'courses.auth.backToLogin': 'Wróć do logowania',

    // Not found
    'courses.notFound.title': 'Kurs nie znaleziony · Devince',
    'courses.notFound.cta': 'Wróć do kursów',

    // Roadmap
    'roadmap.meta': 'Roadmapa',
    'roadmap.title': 'Roadmapa produktu',
    'roadmap.lead': 'Co już działa i co budujemy dalej.',
    'roadmap.empty': 'Wkrótce pojawią się tu plany rozwoju.',
    'roadmap.status.planned': 'Planowane',
    'roadmap.status.in_progress': 'W trakcie',
    'roadmap.status.done': 'Gotowe',
    'roadmap.track.general': 'Ogólne',
    'roadmap.track.apps': 'Apps',
    'roadmap.track.courses': 'Kursy',
    'apps.nav.roadmap': 'Roadmap',
    'courses.nav.roadmap': 'Roadmap',
  },
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.posts': 'Blog',
    'nav.events': 'Events',
    'nav.courses': 'Courses',
    'nav.workshops': 'Workshops',
    'nav.contact': 'Contact',

    // Common
    'common.readMore': 'Read more',
    'common.viewAll': 'View all',
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.notFound': 'Not found',
    'common.free': 'Free',
    'common.registerNow': 'Register Now',
    'common.joinOnline': 'Join Online',
    'common.learnMore': 'Learn more',

    // Events
    'events.title': 'Events',
    'events.description': 'Discover upcoming events and join us.',
    'events.noEvents': 'No events scheduled at the moment.',
    'events.freeEvent': 'Free Event',
    'events.aboutEvent': 'About This Event',
    'events.dateTime': 'Date & Time',
    'events.location': 'Location',
    'events.onlineEvent': 'Online Event',
    'events.capacity': 'Capacity',
    'events.maxParticipants': 'Max {count} participants',
    'events.registrationDeadline': 'Registration Deadline',

    // Courses
    'courses.title': 'Courses',
    'courses.description': 'Browse our courses and start learning today.',
    'courses.noCourses': 'No courses available at the moment.',
    'courses.freeCourse': 'Free Course',
    'courses.aboutCourse': 'About This Course',
    'courses.duration': 'Duration',
    'courses.level': 'Level',
    'courses.startDate': 'Start Date',
    'courses.delivery': 'Delivery',
    'courses.instructor': 'Instructor',
    'courses.levels.beginner': 'Beginner',
    'courses.levels.intermediate': 'Intermediate',
    'courses.levels.advanced': 'Advanced',
    'courses.delivery.online': 'Online',
    'courses.delivery.offline': 'In-Person',
    'courses.delivery.hybrid': 'Hybrid',

    // Workshops
    'workshops.title': 'Workshops',
    'workshops.description': 'Join our hands-on workshops and learn new skills.',
    'workshops.noWorkshops': 'No workshops scheduled at the moment.',
    'workshops.freeWorkshop': 'Free Workshop',
    'workshops.aboutWorkshop': 'About This Workshop',

    // Contact
    'contact.title': 'Contact',
    'contact.description': 'Get in touch with us.',
    'contact.getInTouch': 'Get in Touch',
    'contact.address': 'Address',
    'contact.email': 'Email',
    'contact.phone': 'Phone',

    // Newsletter
    'newsletter.title': 'Newsletter',
    'newsletter.description': 'Subscribe to our newsletter.',
    'newsletter.placeholder': 'Your email address',
    'newsletter.subscribe': 'Subscribe',
    'newsletter.subscribing': 'Subscribing...',
    'newsletter.success': 'Please check your email to confirm your subscription.',
    'newsletter.confirmed.title': 'Subscription Confirmed!',
    'newsletter.confirmed.message': 'Thank you for confirming your newsletter subscription.',

    'newsletter.subscribeTitle': 'Subscribe to our newsletter',
    'newsletter.successMessage': 'Successfully subscribed!',
    'newsletter.failed': 'Subscription failed',
    'newsletter.errorRetry': 'An error occurred. Please try again.',
    'newsletter.confirmed.returnHome': 'Return to Home',
    'newsletter.confirmed.metaTitle': 'Newsletter Subscription Confirmed',
    'newsletter.confirmed.metaDescription': 'Your newsletter subscription has been confirmed.',

    // Footer
    'footer.navigation': 'Navigation',
    'footer.contact': 'Contact',
    'footer.followUs': 'Follow Us',
    'footer.allRightsReserved': 'All rights reserved.',
    'footer.legal': 'Legal',

    // Legal
    'legal.terms': 'Terms of Service',
    'legal.privacy': 'Privacy Policy',
    'legal.updated': 'Last updated',

    // Header
    'header.search': 'Search',
    'header.openMenu': 'Open menu',
    'header.closeMenu': 'Close menu',

    // Search
    'search.title': 'Search',
    'search.placeholder': 'Search...',
    'search.noResults': 'No results found',
    'search.submit': 'submit',
    'search.pageNoResults': 'No results found.',
    'search.metaTitle': 'Devince Search',

    // Posts
    'posts.title': 'Posts',
    'posts.metaTitle': 'Devince Posts',

    // Projects
    'projects.title': 'Projects',
    'projects.description': 'A collection of my work and side projects.',
    'projects.noProjects': 'No projects found.',
    'projects.metaTitle': 'Projects | Portfolio',
    'projects.metaDescription': 'A collection of my work and side projects.',

    // Pagination
    'pagination.previous': 'Previous',
    'pagination.next': 'Next',
    'pagination.goToPrevious': 'Go to previous page',
    'pagination.goToNext': 'Go to next page',
    'pagination.morePages': 'More pages',
    'pagination.label': 'pagination',

    // Page range
    'pageRange.docsPlural': 'Docs',
    'pageRange.docsSingular': 'Doc',
    'pageRange.postsPlural': 'Posts',
    'pageRange.postsSingular': 'Post',
    'pageRange.noResults': 'Search produced no results.',
    'pageRange.showing': 'Showing {range} of {total} {label}',

    // Not found
    'notFound.message': 'This page could not be found.',
    'notFound.goHome': 'Go home',

    // Post
    'post.untitledCategory': 'Untitled category',
    'post.author': 'Author',
    'post.datePublished': 'Date Published',

    // Card
    'card.untitledCategory': 'Untitled category',

    // Project
    'project.noImage': 'No image',
    'project.liveSite': 'Live Site',

    // Program
    'program.type.course': 'Course',
    'program.type.workshop': 'Workshop',
    'program.type.event': 'Event',
    'program.format.online': 'Online',
    'program.format.physical': 'In-Person',
    'program.format.hybrid': 'Hybrid',
    'program.pricing.free': 'Free',
    'program.pricing.paid': 'Paid',
    'program.label.date': 'Date',
    'program.label.duration': 'Duration',
    'program.label.format': 'Format',
    'program.label.location': 'Location',
    'program.label.price': 'Price',
    'program.noImage': 'No image',

    // SEO
    'seo.defaultDescription': 'An open-source website built with Payload and Next.js.',

    // Contact (page)
    'contact.notConfigured':
      'Contact information not configured. Please update Site Settings in the admin panel.',
    'contact.findUs': 'Find Us',
    'contact.mapPlaceholder': 'Map or additional information can be added here.',
    'contact.followUs': 'Follow Us',
    'contact.pageTitle': 'Contact Us',
    'contact.metaTitle': 'Contact Us',
    'contact.metaDescription': 'Get in touch with us. Find our contact information and location.',

    // ── Apps subdomain (apps.devince.dev) ──
    // Layout / chrome
    'apps.meta.title': 'Devince · apps',
    'apps.meta.titleTemplate': '%s · Devince apps',
    'apps.meta.description': 'Apps and downloadable files — Devince.',
    'apps.skip': 'Skip to content',
    'apps.nav.brand': 'Devince',
    'apps.nav.suffix': '· apps',
    'apps.footer.tagline': 'apps and downloadable files',
    'apps.theme.light': 'Light',
    'apps.theme.dark': 'Dark',

    // Storefront
    'apps.store.meta': 'Store',
    'apps.store.eyebrow': 'store',
    'apps.store.title': 'Apps & files',
    'apps.store.lead': 'Ready-made tools, templates and downloadable files — buy once, use without limits.',
    'apps.store.empty': 'Coming soon — we are working on our first products.',
    'apps.store.from': 'from',
    'apps.store.view': 'View',

    // Product page
    'apps.product.metaNotFound': 'Product not found · Devince',
    'apps.product.eyebrow': 'product',
    'apps.product.buy': 'Buy now',
    'apps.product.gallery': 'Screenshots',
    'apps.product.galleryLink': 'View screenshots',
    'apps.gallery.back': 'Back to product',
    'apps.product.processing': 'Redirecting…',
    'apps.product.error': 'Could not start the payment. Please try again.',
    'apps.product.note': 'After purchase we will send a download link to your email.',
    'apps.product.consent':
      'I consent to the immediate start of delivery of the digital content (file download) and acknowledge that, once the contract is performed (the file is made available), I lose the right of withdrawal.',
    'apps.checkout.newsletter': 'I want to receive the newsletter (separate from the purchase).',
    'apps.product.chooseLicense': 'Choose a license',
    'apps.product.recommended': 'Recommended',

    // Lead magnet (free-for-email) — shared form copy (apps + courses)
    'leadMagnet.emailLabel': 'Your email',
    'leadMagnet.emailPlaceholder': 'you@example.com',
    'leadMagnet.submit': 'Get it free',
    'leadMagnet.processing': 'Sending…',
    'leadMagnet.note':
      'Enter your email → confirm in the email → you get access and join the list. No payment.',
    'leadMagnet.success': '📧 Check your email and confirm to unlock your access.',
    'leadMagnet.error': 'Something went wrong. Please try again in a moment.',
    'leadMagnet.invalidEmail': 'Please enter a valid email address.',
    'leadMagnet.unavailable': 'Free access is temporarily unavailable. Please check back later.',
    'leadMagnet.freeBadge': 'Free',

    // Lead magnet confirm landing (/claim/confirmed)
    'claim.meta': 'Access confirmation',
    'claim.granted.eyebrow': 'access unlocked',
    'claim.granted.title': '✅ Access unlocked',
    'claim.granted.body':
      'All set! We have emailed you an access link — check your inbox (and the spam folder).',
    'claim.used.eyebrow': 'link already used',
    'claim.used.title': 'This link has already been used',
    'claim.used.body':
      'Access was already granted earlier. Check your inbox — we emailed you an access link. If you have any trouble, just reply to that email.',
    'claim.invalid.eyebrow': 'invalid link',
    'claim.invalid.title': 'This link is invalid',
    'claim.invalid.body':
      'This access link is invalid or incomplete. Make sure it was copied in full from the confirmation email, or try signing up again.',

    // Success page
    'apps.success.meta': 'Thank you',
    'apps.success.eyebrow': 'purchase confirmed',
    'apps.success.title': 'Thank you for your purchase!',
    'apps.success.body': 'We have sent a download link to your email address. Check your spam folder too.',

    // Download page
    'apps.download.meta': 'Download',
    'apps.download.eyebrow': 'download',
    'apps.download.invalid': 'This link is invalid.',
    'apps.download.invalidBody':
      'If you have just bought a product — check that the link from the email was copied in full. If you still have problems, reply to your purchase email.',
    'apps.download.expired': 'This link has expired.',
    'apps.download.expiredBody': 'Reply to your purchase confirmation email and we will send a new one.',
    'apps.download.limit': 'The download limit has been reached.',
    'apps.download.limitBody': 'Reply to your purchase confirmation email and we will send a new one.',
    'apps.download.remaining': 'downloads left:',
    'apps.download.contact':
      'No files to download — get in touch by replying to your purchase confirmation email.',
    'apps.download.fileHeading': 'Files to download',

    // Not found
    'apps.notFound.eyebrow': 'error',
    'apps.notFound.title': '404 — no such page.',
    'apps.notFound.body': 'The page you are looking for does not exist or has been moved.',
    'apps.notFound.cta': 'Back to store',
    'apps.footer.back': 'Back to store',

    // ── Courses subdomain (courses.devince.dev) ──
    // Layout / chrome
    'courses.meta.title': 'Devince · courses',
    'courses.meta.description': 'Courses built live with Claude Code.',
    'courses.skip': 'Skip to content',
    'courses.nav.brand': 'Devince',
    'courses.nav.suffix': '· courses',
    'courses.nav.courses': 'Courses',
    'courses.nav.account': 'Account',
    'courses.nav.start': 'Start a course',
    'courses.footer.tagline': 'Devince — courses built live with Claude Code',
    'courses.footer.stats': '24 stages · 10 phases · 2 hard gates',
    'courses.theme.light': 'Light',
    'courses.theme.dark': 'Dark',
    'courses.pagination.prev': 'Previous',
    'courses.pagination.next': 'Next',
    'courses.pagination.label': 'Course pagination',

    // Checkout success ("check your email")
    'courses.success.meta': 'Thank you',
    'courses.success.eyebrow': 'purchase confirmed',
    'courses.success.title': 'Thank you for your purchase!',
    'courses.success.body':
      'Check your email — we sent a link to set your password and enter the course. Check your spam folder too.',
    'courses.success.back': 'Back to courses',

    // Storefront
    'courses.store.eyebrow': 'Courses',
    'courses.store.title': 'Paid courses',
    'courses.store.lead': 'Browse courses built live with Claude Code.',
    'courses.store.empty': 'No courses available.',
    'courses.store.paid': 'Paid',
    'courses.store.phases': 'phases',
    'courses.store.stages': 'stages',
    'courses.store.details': 'Details',
    'courses.store.statusInProgress': 'In progress',
    'courses.store.statusCompleted': 'Completed',
    'courses.store.featured': 'Featured',

    // Syllabus
    'courses.syllabus.metaNotFound': 'Course not found · Devince',
    'courses.syllabus.eyebrow': 'Course · production flow',
    'courses.syllabus.metaPhases': 'phases',
    'courses.syllabus.metaStages': 'stages',
    'courses.syllabus.metaTime': 'est. time',
    'courses.syllabus.metaGates': 'hard-gate',
    'courses.syllabus.cta': 'Start',
    'courses.syllabus.spineLabel': 'Phases overview',
    'courses.syllabus.spineAxis': 'axis',
    'courses.syllabus.stageShort': 'st.',
    'courses.syllabus.outcomes': 'What you will learn',
    'courses.syllabus.outcomesEyebrow': 'Outcomes',
    'courses.syllabus.curriculum': 'Curriculum',
    'courses.syllabus.curriculumEyebrow': 'Curriculum',
    'courses.syllabus.curriculumNote':
      'Each stage is a separate lesson: why it exists, what you do, the Definition of Done, skills and dependencies. Hard gates are marked as',
    'courses.syllabus.curriculumNoteAfter': '— they cannot be skipped.',
    'courses.syllabus.phase': 'Phase',
    'courses.syllabus.stageSingular': 'stage',
    'courses.syllabus.stagePlural': 'stages',
    'courses.syllabus.soon': 'Soon',
    'courses.syllabus.ctaBandTitle': 'Ready to begin?',
    'courses.syllabus.ctaBandBody':
      'Go through the entire pipeline from idea to deployment — step by step, with hard gates that keep quality in check.',
    'courses.syllabus.buy': 'Buy access',
    'courses.syllabus.continue': 'Continue',

    // Checkout (consent gate)
    'courses.checkout.consent':
      'I consent to early access to the digital content before the withdrawal period expires and acknowledge that I lose my right of withdrawal (Art. 38(13)).',
    'courses.checkout.processing': 'Redirecting…',
    'courses.checkout.error': 'Could not start the payment. Please try again.',
    'courses.checkout.consentRequired': 'Please tick the consent box above to continue to payment.',
    'courses.checkout.newsletter': 'I want to receive the newsletter (separate from the purchase).',

    // Badges
    'courses.badge.gate': 'hard-gate',
    'courses.badge.hybrid': 'hybrid · IRL',
    'courses.badge.decision': 'decision',

    // Info cards
    'courses.infocards.audience': 'Who it is for',
    'courses.infocards.requirements': 'What you need',

    // Lesson view
    'courses.lesson.nav': 'Course program',
    'courses.lesson.navStages': 'Course stages',
    'courses.lesson.stageSingular': 'stage',
    'courses.lesson.stagePlural': 'stages',
    'courses.lesson.stageShort': 'st.',
    'courses.lesson.syllabus': 'Syllabus',
    'courses.lesson.phase': 'Phase',
    'courses.lesson.stage': 'Stage',
    'courses.lesson.recording': 'lesson recording',
    'courses.lesson.minutes': 'min',
    'courses.lesson.pagerLabel': 'Navigation between lessons',
    'courses.lesson.why': 'Why',
    'courses.lesson.what': 'What you do',
    'courses.lesson.dod': 'Definition of Done',
    'courses.lesson.skills': 'Skills in this lesson',
    'courses.lesson.deps': 'Dependencies',
    'courses.lesson.prev': 'Previous',
    'courses.lesson.next': 'Next',
    'courses.lesson.start': 'Start',
    'courses.lesson.end': 'End',

    // Courses — cohort gating (locks + lock screen)
    'courses.lesson.locked': 'Locked',
    'courses.lesson.lockedEyebrow': 'Lesson locked',
    'courses.lesson.lockedFallback': 'This lesson is still locked',
    'courses.lesson.lockedCta': 'Back to the course',

    // Courses — pro UX (lesson reading + progress)
    'courses.lesson.onThisPage': 'On this page',
    'courses.lesson.markComplete': 'Complete & continue',
    'courses.lesson.markCompleteLast': 'Mark as complete',
    'courses.lesson.completed': 'Completed',
    'courses.lesson.undo': 'Mark as not done',
    'courses.lesson.readMin': 'min read',
    'courses.lesson.copy': 'Copy',
    'courses.lesson.copied': 'Copied',
    'courses.progress.label': 'Progress',
    'courses.progress.unit': 'lessons',
    'courses.syllabus.resume': 'Resume',
    'courses.syllabus.allDone': 'Course completed',
    'courses.syllabus.totalTimeUnit': 'h',
    'courses.auth.resume': 'Resume',
    'courses.auth.notStarted': 'Start',

    // Auth
    'courses.auth.eyebrow': 'Account',
    'courses.auth.loginTitle': 'Sign in',
    'courses.auth.accountTitle': 'Your courses',
    'courses.auth.email': 'Email',
    'courses.auth.password': 'Password',
    'courses.auth.submit': 'Sign in',
    'courses.auth.submitting': 'Signing in…',
    'courses.auth.forgot': 'Forgot your password?',
    'courses.auth.invalidCredentials': 'Invalid email or password.',
    'courses.auth.logout': 'Sign out',
    'courses.auth.loggingOut': 'Signing out…',
    'courses.auth.empty': 'You do not have any courses yet.',
    'courses.auth.courseEyebrow': 'Course',
    'courses.auth.openSyllabus': 'Open syllabus',
    // Set password (post-purchase activation)
    'courses.auth.setPasswordTitle': 'Set your password',
    'courses.auth.confirmPassword': 'Confirm password',
    'courses.auth.startCourse': 'Start the course',
    'courses.auth.activating': 'Activating…',
    'courses.auth.passwordMismatch': 'Passwords do not match.',
    'courses.auth.invalidToken': 'This activation link has expired or is invalid.',
    'courses.auth.missingToken': 'Invalid or missing activation link.',
    'courses.auth.sendNewLink': 'Send a new link',
    'courses.auth.genericError': 'Something went wrong. Please try again.',
    // Forgot password
    'courses.auth.forgotPasswordTitle': 'Reset your password',
    'courses.auth.sendLink': 'Send link',
    'courses.auth.sending': 'Sending…',
    'courses.auth.resetSent': 'If an account exists, we will send a password reset link.',
    'courses.auth.backToLogin': 'Back to sign in',

    // Not found
    'courses.notFound.title': 'Course not found · Devince',
    'courses.notFound.cta': 'Back to courses',

    // Roadmap
    'roadmap.meta': 'Roadmap',
    'roadmap.title': 'Product roadmap',
    'roadmap.lead': "What's live and what we're building next.",
    'roadmap.empty': 'Plans will appear here soon.',
    'roadmap.status.planned': 'Planned',
    'roadmap.status.in_progress': 'In progress',
    'roadmap.status.done': 'Done',
    'roadmap.track.general': 'General',
    'roadmap.track.apps': 'Apps',
    'roadmap.track.courses': 'Courses',
    'apps.nav.roadmap': 'Roadmap',
    'courses.nav.roadmap': 'Roadmap',
  },
} as const

export const translationsForTest = translations

export type TranslationKey = keyof (typeof translations)['pl']

export function getTranslation(locale: Locale, key: TranslationKey): string {
  return translations[locale][key] || translations['pl'][key] || key
}

export function t(locale: Locale, key: TranslationKey, params?: Record<string, string | number>): string {
  let translation = getTranslation(locale, key)

  if (params) {
    Object.entries(params).forEach(([paramKey, value]) => {
      translation = translation.replace(`{${paramKey}}`, String(value))
    })
  }

  return translation
}
