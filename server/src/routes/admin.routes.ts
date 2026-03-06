import { Router } from 'express';
import { auth } from '../middlewares/auth';
import { requireRole } from '../middlewares/rbac';
import {
  getUsers,
  updateUserStatus,
  deleteUser,
  pendingAgents,
  pendingListings,
  getModerationQueue,
  verifyAgentDecision,
  markAgentEarbVerified,
  verifyListing,
  deleteListing,
  resolveKyc,
  resolveBusinessVerifyDecision,
  analytics,
  dashboard,
  audit,
  exportReportsCsv,
  exportAgents,
  exportListings,
  rateMetrics,
  networkAccessStatus,
} from '../controllers/admin.controller';
import {
  adminListPayAccounts,
  adminSetPayAccountStatus,
} from '../controllers/payAccount.controller';
import { adminLimiter } from '../middlewares/rateLimit';
import { requireAdminStepUp } from '../middlewares/adminStepUp';
import { requirePrivilegedNetworkAccess } from '../middlewares/ipAllowlist';
import {
  listAdmin as listRefundRequestsAdmin,
  resolve as resolveRefundRequest,
} from '../controllers/refundRequest.controller';

const router = Router();
router.use(auth, requireRole(['admin']), adminLimiter, requirePrivilegedNetworkAccess('admin'));

router.get('/users', getUsers);
router.patch('/users/:id/status', requireAdminStepUp(), updateUserStatus);
router.delete('/users/:id', requireAdminStepUp(), deleteUser);
router.get('/verification/agents', pendingAgents);
router.get('/verification/listings', pendingListings);
router.get('/moderation/queue', getModerationQueue);
router.patch('/verification/agents/:id', requireAdminStepUp(), verifyAgentDecision);
router.patch('/verification/agents/:id/earb-verified', requireAdminStepUp(), markAgentEarbVerified);
router.patch('/verification/listings/:id', requireAdminStepUp(), verifyListing);
router.delete('/verification/listings/:id', requireAdminStepUp(), deleteListing);
router.patch('/verification/kyc/:userId', requireAdminStepUp(), resolveKyc);
router.patch(
  '/verification/business/:agentId',
  requireAdminStepUp(),
  resolveBusinessVerifyDecision
);
router.get('/analytics/overview', analytics);
router.get('/analytics/dashboard', dashboard);
router.get('/audit', audit);
router.get('/reports/export', requireAdminStepUp(), exportReportsCsv);
router.get('/agents/export', requireAdminStepUp(), exportAgents);
router.get('/listings/export', requireAdminStepUp(), exportListings);
router.get('/pay/accounts', adminListPayAccounts);
router.patch('/pay/accounts/:userId/status', requireAdminStepUp(), adminSetPayAccountStatus);
router.get('/rate-metrics', rateMetrics);
router.get('/refund-requests', listRefundRequestsAdmin);
router.patch('/refund-requests/:id', requireAdminStepUp(), resolveRefundRequest);
router.get('/network-access', networkAccessStatus);

export default router;
