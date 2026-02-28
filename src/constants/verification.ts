/**
 * Verification criteria and protocol for KYC (users) and Agent onboarding.
 * Used across Profile, Agent Verification, and Admin Verification for consistent messaging.
 */

/** When KYC is required vs optional. */
export const KYC_POLICY = {
  requiredFor: [
    'Completing property or land purchases',
    'Making payments (deposits, viewing fees, land payments)',
    'Receiving payouts as an agent',
  ],
  notRequiredFor: [
    'Browsing listings and exploring the marketplace',
    'Viewing property details',
    'Saving listings and contacting agents',
    'Creating an account and signing in',
  ],
} as const;

/** Criteria admins use to accept or reject user KYC. */
export const KYC_ACCEPTANCE_CRITERIA = [
  'Document is a valid government-issued ID (national ID, passport, or equivalent).',
  'Photo and key details (name, ID number, expiry if applicable) are clearly visible and legible.',
  'Image is unaltered; no cropping that obscures critical information.',
  'File format is JPEG, PNG, or WebP; max 5MB.',
  'Name on document is consistent with the account profile where applicable.',
] as const;

/** Criteria admins use to accept or reject agent applications. */
export const AGENT_ACCEPTANCE_CRITERIA = [
  'Applicant has a valid EARB (Estate Agents Registration Board) registration number for Kenya.',
  'EARB registration is verified against the official EARB portal before approval.',
  'Identity evidence (ID or license image) is clear, valid, and matches the account.',
  'Business verification documents (if submitted) support legitimate agency or brokerage activity.',
  'No duplicate or fraudulent agent accounts; one agent per legitimate entity.',
] as const;

/** Step-by-step protocol: User → Agent. */
export const AGENT_ONBOARDING_PROTOCOL = [
  { step: 1, title: 'Start as a user', description: 'Create a Zeni account and use the platform as a buyer or renter. Browse listings, save favorites, and message agents.' },
  { step: 2, title: 'Apply to become an agent', description: 'From your profile or the agent application flow, submit a request to join as an agent. You will need your EARB registration number and identity documents.' },
  { step: 3, title: 'Submit evidence', description: 'Upload your EARB details and verification evidence (ID, license). Our team will review your application.' },
  { step: 4, title: 'Admin review', description: 'An admin verifies your EARB number against the official portal and reviews your documents. This usually takes 1–2 business days.' },
  { step: 5, title: 'Approved as agent', description: 'Once accepted, your account is upgraded to agent access. You can list properties, manage viewings, and use agent tools.' },
] as const;

/** Short label for when KYC is required (for UI). */
export const KYC_REQUIRED_LABEL = 'Required to buy, pay for land, or receive payouts. Not required to browse or view listings.';
