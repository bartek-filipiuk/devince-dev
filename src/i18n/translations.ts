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

    // Footer
    'footer.navigation': 'Nawigacja',
    'footer.contact': 'Kontakt',
    'footer.followUs': 'Obserwuj nas',
    'footer.allRightsReserved': 'Wszelkie prawa zastrzeżone.',

    // Search
    'search.title': 'Szukaj',
    'search.placeholder': 'Szukaj...',
    'search.noResults': 'Brak wyników',
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

    // Footer
    'footer.navigation': 'Navigation',
    'footer.contact': 'Contact',
    'footer.followUs': 'Follow Us',
    'footer.allRightsReserved': 'All rights reserved.',

    // Search
    'search.title': 'Search',
    'search.placeholder': 'Search...',
    'search.noResults': 'No results found',
  },
} as const

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
