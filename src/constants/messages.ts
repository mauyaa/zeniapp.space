/**
 * Standard user-facing error and success messages for consistency and future i18n.
 */

export const errors = {
  generic: 'Something went wrong. Please try again.',
  network: 'Connection problem. Check your network and try again.',
  auth: {
    missingAgent: 'This listing has no assigned agent yet.',
    cannotSendViewing: 'Cannot send viewing request without an agent.',
    cannotStartChat: 'Could not start conversation. Try again in a moment.',
    cannotRequestViewing: 'Cannot request viewing for this listing.',
  },
  save: {
    listing: 'Could not update this listing right now.',
    search: 'Could not save search. Try a shorter name.',
  },
  request: {
    viewing: 'Could not submit your viewing request.',
    failed: 'Request failed.',
  },
  share: {
    copied: 'Listing link copied to clipboard.',
    failed: 'Could not copy link.',
  },
  load: {
    sessions: 'Could not load sessions.',
    conversations: 'Failed to load conversations.',
    messages: 'Failed to load messages.',
    leadStage: 'Lead stage update failed.',
  },
} as const;

export const success = {
  generic: 'Done.',
  viewing: 'Viewing requested. The agent will confirm shortly.',
  viewingShort: 'Viewing requested.',
  searchSaved: 'Search saved. You can open it later from Saved.',
  linkCopied: 'Link copied.',
  evidenceSubmitted: 'Evidence submitted for review.',
} as const;
