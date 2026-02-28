import { Router } from 'express';
import { auth } from '../middlewares/auth';
import { requireRole } from '../middlewares/rbac';
import { payLimiter } from '../middlewares/rateLimit';
import { requirePrivilegedNetworkAccess } from '../middlewares/ipAllowlist';
import { invoices, invoiceById, transactionById, stkInitiate, mpesaCallback, adminReconciliation, adminResolveTx } from '../controllers/pay.controller';

const router = Router();

router.get('/pay/invoices', auth, invoices);
router.get('/pay/invoices/:id', auth, invoiceById);
router.get('/pay/transactions/:id', auth, transactionById);
router.post('/pay/mpesa/stk/initiate', auth, payLimiter, stkInitiate);
router.post('/pay/mpesa/callback', mpesaCallback);

router.get('/pay/admin/reconciliation', auth, requireRole(['admin', 'finance']), requirePrivilegedNetworkAccess('pay_admin'), adminReconciliation);
router.patch('/pay/admin/transactions/:id/resolve', auth, requireRole(['admin', 'finance']), requirePrivilegedNetworkAccess('pay_admin'), adminResolveTx);

export default router;
