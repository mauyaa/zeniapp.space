/**
 * Unified API re-export — all domain modules accessible from one import.
 *
 * Usage:
 *   import { searchListings, login, fetchUsers } from '../lib/api';
 *   // or
 *   import { api } from '../lib/api';
 */

// Re-export everything from domain modules
export * from './auth';
export * from './listings';
export * from './chat';
export * from './viewings';
export * from './admin';
export * from './user';
export * from './refundRequests';
export * from './notifications';

// Re-export client utilities for advanced use
export { request, getToken, clearTokens, buildQuery } from './client';

// Re-export error class for typed catch blocks
export { ApiError } from '../../types/api';
export type {
  Role,
  ViewingRequest,
  AdminUser,
  PendingListing,
  PendingAgent,
  ModerationQueueItem,
  UserKycStatus,
} from '../../types/api';

// Backwards-compatible `api` object for existing code that uses `api.xxx()`
import * as auth from './auth';
import * as listings from './listings';
import * as chat from './chat';
import * as viewings from './viewings';
import * as admin from './admin';
import * as user from './user';
import * as refundRequests from './refundRequests';
// notifications module is re-exported via `export * from './notifications'` above
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type {} from './notifications';

export const api = {
  // Auth
  login: auth.login,
  loginWithGoogle: auth.loginWithGoogle,
  register: auth.register,
  me: auth.me,
  logout: auth.logout,
  listAuthSessions: auth.listAuthSessions,
  revokeAuthSession: auth.revokeAuthSession,
  revokeAllAuthSessions: auth.revokeAllAuthSessions,
  forgotPassword: auth.forgotPassword,
  resetPassword: auth.resetPassword,
  adminStepUp: auth.adminStepUp,
  adminMfaSetup: auth.adminMfaSetup,
  adminMfaEnable: auth.adminMfaEnable,
  adminMfaDisable: auth.adminMfaDisable,

  // User
  updateAvatar: user.updateAvatar,

  // Listings
  searchListings: listings.searchListings,
  fetchListing: listings.fetchListing,
  fetchSavedListings: listings.fetchSavedListings,
  toggleSaveListing: listings.toggleSaveListing,
  toggleAlertListing: listings.toggleAlertListing,
  recordLead: listings.recordLead,
  uploadImage: listings.uploadImage,
  uploadChatImage: listings.uploadChatImage,
  fetchAgentListings: listings.fetchAgentListings,
  fetchAgentListing: listings.fetchAgentListing,
  createAgentListing: listings.createAgentListing,
  updateAgentListing: listings.updateAgentListing,
  submitAgentListing: listings.submitAgentListing,
  deleteAgentListing: listings.deleteAgentListing,
  reportListing: listings.reportListing,
  fetchInsights: listings.fetchInsights,
  subscribeNewsletter: listings.subscribeNewsletter,
  fetchSavedSearches: listings.fetchSavedSearches,
  createSavedSearch: listings.createSavedSearch,
  deleteSavedSearch: listings.deleteSavedSearch,
  fetchRecommendations: listings.fetchRecommendations,

  // Chat
  fetchConversations: chat.fetchConversations,
  bootstrapConversations: chat.bootstrapConversations,
  createConversation: chat.createConversation,
  updateConversation: chat.updateConversation,
  fetchMessages: chat.fetchMessages,
  postMessage: chat.postMessage,
  markConversationRead: chat.markConversationRead,

  // Viewings
  createViewingRequest: viewings.createViewingRequest,
  fetchMyViewings: viewings.fetchMyViewings,
  confirmViewingCompleted: viewings.confirmViewingCompleted,
  updateViewingStatus: viewings.updateViewingStatus,
  fetchAgentViewings: viewings.fetchAgentViewings,
  updateAgentViewing: viewings.updateAgentViewing,

  // Admin
  fetchPendingListings: admin.fetchPendingListings,
  verifyListing: admin.verifyListing,
  fetchNetworkAccessStatus: admin.fetchNetworkAccessStatus,
  rateMetrics: admin.fetchRateMetrics,

  // Refund requests (Zeni Shield)
  fetchEligibleTransactions: refundRequests.fetchEligibleTransactions,
  createRefundRequest: refundRequests.createRefundRequest,
  fetchMyRefundRequests: refundRequests.fetchMyRefundRequests,
  fetchAdminRefundRequests: refundRequests.fetchAdminRefundRequests,
  resolveRefundRequest: refundRequests.resolveRefundRequest,
};
