/**
 * Translations for key screens (English + Swahili).
 * Keys are namespaced: refunds.*, viewings.*, common.*
 */

export type Locale = 'en' | 'sw';

export const translations: Record<Locale, Record<string, string>> = {
  en: {
    'refunds.title': 'Refund requests',
    'refunds.subtitle': 'Request a refund for a payment. Zeni Support will review and mediate.',
    'refunds.requestRefund': 'Request refund',
    'refunds.myRequests': 'My refund requests',
    'refunds.noRequests': 'No refund requests yet',
    'refunds.noRequestsHint': 'If a payment should be refunded, use "Request refund" above. Zeni acts as mediator so you get a fair outcome.',
    'refunds.pending': 'Under review',
    'refunds.approved': 'Approved',
    'refunds.rejected': 'Rejected',
    'viewings.title': 'Your viewing schedule',
    'viewings.subtitle': 'Track upcoming property visits, manage confirmations, and connect with agents.',
    'viewings.bookViewing': 'Book a viewing',
    'viewings.confirmCompleted': 'Confirm viewing completed',
    'viewings.noViewings': 'No viewings yet',
    'viewings.feeHeld': 'Fee held',
    'viewings.feeReleased': 'Fee released',
    'common.back': 'Back',
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
  },
  sw: {
    'refunds.title': 'Maombi ya kurudishwa kwa pesa',
    'refunds.subtitle': 'Omba kurudishwa kwa malipo. Zeni Support itakagua na kutatua.',
    'refunds.requestRefund': 'Omba kurudishwa',
    'refunds.myRequests': 'Maombi yangu',
    'refunds.noRequests': 'Hakuna maombi bado',
    'refunds.noRequestsHint': 'Ikiwa malipo yanapaswa kurudishwa, tumia "Omba kurudishwa" hapa juu. Zeni ni mpatanishi ili upate matokeo sawa.',
    'refunds.pending': 'Inakaguliwa',
    'refunds.approved': 'Imekubaliwa',
    'refunds.rejected': 'Imekataliwa',
    'viewings.title': 'Ratiba yako ya kutazama',
    'viewings.subtitle': 'Fuata ziara zilizo karibu, simamia uthibitisho, na wasiliana na wakala.',
    'viewings.bookViewing': 'Andika kutazama',
    'viewings.confirmCompleted': 'Thibitisha kutazama kumekwisha',
    'viewings.noViewings': 'Hakuna kutazama bado',
    'viewings.feeHeld': 'Ada imehifadhiwa',
    'viewings.feeReleased': 'Ada imetolewa',
    'common.back': 'Rudi',
    'common.loading': 'Inapakia...',
    'common.save': 'Hifadhi',
    'common.cancel': 'Ghairi',
  },
};

export function getTranslation(locale: Locale, key: string): string {
  return translations[locale]?.[key] ?? translations.en[key] ?? key;
}
