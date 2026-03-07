/**
 * Shared constants for Zeni landing page (menu, services, FAQ, etc.)
 */

export const MENU_ITEMS = [
  { label: 'Home', href: '#hero', type: 'anchor' as const },
  { label: 'Listings', href: '#projects', type: 'anchor' as const },
  { label: 'Neighborhoods', href: '#neighborhoods', type: 'anchor' as const },
  { label: 'Philosophy', href: '#about', type: 'anchor' as const },
  { label: 'Services', href: '#services', type: 'anchor' as const },
  { label: 'Insights', href: '#insights', type: 'anchor' as const },
  { label: 'FAQ', href: '#faq', type: 'anchor' as const },
  { label: 'Login', href: '/login', type: 'route' as const },
  { label: 'Sign Up', href: '/register', type: 'route' as const },
];

export const SERVICES = [
  {
    id: '01',
    title: 'Map-First Search',
    desc: "Search across Kenya on the map. Filter by KES price, beds, and amenities—see what's really available.",
  },
  {
    id: '02',
    title: 'Verified Agents',
    desc: 'Every agent is identity-checked and vetted. No fake listings or imposters on Zeni.',
  },
  {
    id: '03',
    title: 'Kenya Market Data',
    desc: 'Real-time KES price trends and demand by neighborhood so you invest with clarity.',
  },
  {
    id: '04',
    title: 'Secure Viewings',
    desc: 'Book and track viewings in-app. Confirmations and reminders so every visit is accountable.',
  },
];

export const AREAS_WE_COVER = [
  'Westlands',
  'Kilimani',
  'Karen',
  'Lavington',
  'Riverside',
  'Ngong Road',
];

export const TOOLBOX = [
  {
    title: 'Map-first discovery',
    desc: 'Draw your zone, compare amenities, and spot pricing clusters fast.',
  },
  {
    title: 'Verified agents',
    desc: 'Identity checks and performance history before anyone goes live.',
  },
  { title: 'Viewing wallet', desc: 'Schedule tours, share itineraries, and track confirmations.' },
  { title: 'Market signals', desc: 'Price movement, rental yield, and demand trends in one view.' },
  { title: 'Document vault', desc: 'Store leases, offers, and inspection notes in one place.' },
  {
    title: 'Offer room',
    desc: 'Compare options, counter with clarity, and close with confidence.',
  },
];

export const JOURNEYS = [
  {
    title: 'Buy a home',
    label: 'Buyers',
    steps: [
      'Set your budget and must-haves',
      'Verify listings and compare neighborhoods',
      'Schedule viewings with secure check-ins',
    ],
    cta: 'Start buying',
    href: '/register',
  },
  {
    title: 'Rent with clarity',
    label: 'Renters',
    steps: [
      'Search verified rentals',
      'Track viewings and approvals',
      'Move in with clear payment records',
    ],
    cta: 'Find rentals',
    href: '/explore',
  },
  {
    title: 'List your property',
    label: 'Owners',
    steps: [
      'Submit documents for review',
      'Get listing photography and pricing guidance',
      'Manage tenants and maintenance in one place',
    ],
    cta: 'List a property',
    href: '/register',
  },
];



/** Shared CTA link class names for landing page (avoids repeating long Tailwind strings). */
export const CTA_LINK_CLASSES = {
  outline:
    'magnetic border border-[var(--zeni-black)] px-8 py-3 font-mono text-xs uppercase tracking-widest hover:bg-[var(--zeni-green)] hover:text-white transition-colors',
  outlineLg:
    'magnetic border border-[var(--zeni-black)] px-8 py-4 text-xs font-mono uppercase tracking-widest hover:bg-[var(--zeni-green)] hover:text-white transition-all text-center',
  primary:
    'magnetic font-mono text-xs uppercase tracking-widest bg-[var(--zeni-green)] text-white px-5 py-2.5 rounded hover:opacity-90 transition-opacity',
  primaryBlock:
    'magnetic font-mono text-xs uppercase tracking-[0.15em] px-6 py-3.5 rounded-xl bg-[var(--zeni-green)] text-white hover:opacity-90 transition-opacity',
  orangeUnderline:
    'magnetic inline-block text-xs uppercase tracking-[0.2em] zeni-orange-text line-below hover:opacity-90 transition-opacity',
} as const;

export const FAQS = [
  {
    q: 'How do you verify listings in Kenya?',
    a: 'We verify agent identity, property documents, and title deeds, and match listings to on-site details before they go live.',
  },
  {
    q: 'Do I need to pay to use ZENI?',
    a: 'No. ZENI is completely free to use — browsing, saving, scheduling viewings, and messaging agents are all at no cost.',
  },
  {
    q: 'How are viewings scheduled?',
    a: 'Schedule in-app and receive confirmations, reminders, and location details for safe, tracked viewings.',
  },
  {
    q: 'Can I save listings and get alerts?',
    a: 'Yes. Save listings and get alerts when prices change or similar homes in your chosen areas appear.',
  },
  {
    q: 'What areas do you cover?',
    a: 'We focus on Kenya—starting with Kenya (Westlands, Kilimani, Karen, Lavington, Riverside, Ngong Road) and expanding across the country as we verify more supply.',
  },
  {
    q: 'How do I list my property?',
    a: 'Create an account, upload your documents and photos, and our team will guide you on KES pricing and listing prep.',
  },
];
