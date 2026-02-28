import { Router } from 'express';
import { payLogin, payRefresh, payLogout, payMe, payStepUp, paySessions, payLogoutAll } from '../controllers/payAuth.controller';
import {
  initiateTransaction,
  listTransactions,
  transactionById,
  receiptById,
  reconcileAdmin,
  resolveAdmin,
  refundAdmin,
  insightsAdmin
} from '../controllers/payPortal.controller';
import { payAuth, requirePayRole, requireStepUp } from '../middlewares/payAuth';
import { payInitiateLimiter, payLoginLimiter, payRefreshLimiter, payAdminLimiter } from '../middlewares/rateLimit';
import { getPayAccountController, updatePayAccountController } from '../controllers/payAccount.controller';
import { requirePrivilegedNetworkAccess } from '../middlewares/ipAllowlist';

const router = Router();

router.post('/auth/login', payLoginLimiter, payLogin);
router.post('/auth/refresh', payRefreshLimiter, payRefresh);
router.post('/auth/logout', payAuth, payLogout);
router.get('/auth/me', payAuth, payMe);
router.post('/auth/step-up', payAuth, payStepUp);
router.get('/auth/sessions', payAuth, paySessions);
router.post('/auth/logout-all', payAuth, payLogoutAll);

router.post('/transactions/initiate', payAuth, payInitiateLimiter, initiateTransaction);
router.get('/transactions', payAuth, listTransactions);
router.get('/transactions/:id', payAuth, transactionById);
router.get('/receipts/:id', payAuth, receiptById);

router.get('/account', payAuth, getPayAccountController);
router.patch('/account', payAuth, updatePayAccountController);

router.get(
  '/admin/reconcile',
  payAuth,
  payAdminLimiter,
  requirePayRole(['admin', 'finance']),
  requirePrivilegedNetworkAccess('pay_admin'),
  requireStepUp(),
  reconcileAdmin
);
router.post(
  '/admin/resolve/:id',
  payAuth,
  payAdminLimiter,
  requirePayRole(['admin', 'finance']),
  requirePrivilegedNetworkAccess('pay_admin'),
  requireStepUp(),
  resolveAdmin
);
router.post(
  '/admin/refund/:id',
  payAuth,
  payAdminLimiter,
  requirePayRole(['admin', 'finance']),
  requirePrivilegedNetworkAccess('pay_admin'),
  requireStepUp(),
  refundAdmin
);
router.get(
  '/admin/insights',
  payAuth,
  payAdminLimiter,
  requirePayRole(['admin', 'finance']),
  requirePrivilegedNetworkAccess('pay_admin'),
  requireStepUp(),
  insightsAdmin
);

export default router;
