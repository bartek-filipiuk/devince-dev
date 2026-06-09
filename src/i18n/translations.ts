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
