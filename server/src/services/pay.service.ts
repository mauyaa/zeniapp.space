/* eslint-disable @typescript-eslint/no-explicit-any */
import { InvoiceModel } from '../models/Invoice';
import { PaymentTransactionModel } from '../models/PaymentTransaction';
import { makeIdempotencyKey } from '../utils/idempotency';
import { canTransition } from '../utils/payStateMachine';
import { logger } from '../utils/logger';
import { getIO } from '../socket';
import { initiateStk } from './mpesa.service';
import { triggerAdminDashboard, triggerUserDashboard } from './dashboard.service';

export interface MpesaCallbackPayload {
  providerRef: string;
  success: boolean;
  receipt?: string;
}

export async function listInvoices(userId: string) {
  return InvoiceModel.find({ userId }).sort({ dueDate: 1 });
}

export function getInvoice(id: string, userId: string) {
  return InvoiceModel.findOne({ _id: id, userId });
}

export function getTransaction(id: string, userId?: string) {
  const filter: any = { _id: id };
  if (userId) filter.userId = userId;
  return PaymentTransactionModel.findOne(filter);
}

export async function initiatePayment(invoiceId: string, userId: string, phone: string) {
  const invoice = await InvoiceModel.findOne({ _id: invoiceId, userId });
  if (!invoice)
    throw Object.assign(new Error('Invoice not found'), { status: 404, code: 'NOT_FOUND' });
  if (invoice.status === 'paid')
    throw Object.assign(new Error('Already paid'), { status: 400, code: 'ALREADY_PAID' });
  const idem = makeIdempotencyKey([invoiceId, userId, phone.slice(-4)]);
  const existing = await PaymentTransactionModel.findOne({
    idempotencyKey: idem,
    status: 'pending',
  });
  if (existing) return existing;
  const stk = await initiateStk(invoiceId, phone, invoice.amount);
  return PaymentTransactionModel.create({
    invoiceId,
    userId,
    method: 'mpesa_stk',
    amount: invoice.amount,
    status: 'pending',
    provider: 'mpesa',
    providerRef: stk.providerRef,
    phone,
    idempotencyKey: idem,
  });
}

export async function handleCallback(payload: MpesaCallbackPayload) {
  const tx = await PaymentTransactionModel.findOne({ providerRef: payload.providerRef });
  if (!tx) return null;
  const status = payload.success ? 'paid' : 'failed';
  if (tx.status === status) return tx;
  if (!canTransition(tx.status as 'pending' | 'paid' | 'failed' | 'reversed', status)) {
    logger.info('[MPESA] Ignoring callback transition', {
      current: tx.status,
      next: status,
      providerRef: payload.providerRef,
    });
    return tx;
  }
  tx.status = status;
  tx.receiptNumber = payload.receipt || tx.receiptNumber;
  tx.rawCallback = payload as unknown;
  await tx.save();
  if (status === 'paid') {
    await InvoiceModel.findByIdAndUpdate(tx.invoiceId, { status: 'paid' });
  }
  const io = getIO();
  if (io) {
    io.to(`user:${tx.userId.toString()}`).emit('invoice:update', {
      invoiceId: tx.invoiceId,
      status,
    });
  }
  const { createNotification } = await import('./notification.service');
  await createNotification(tx.userId.toString(), {
    title: 'Payment update',
    description: status === 'paid' ? 'Payment received' : 'Payment failed',
    type: 'system',
  });

  // Send payment confirmation/failure email
  if (status === 'paid' || status === 'failed') {
    try {
      const { UserModel } = await import('../models/User');
      const { sendMail, renderBrandEmail } = await import('./email.service');
      const user = await UserModel.findById(tx.userId).select('emailOrPhone name');
      const email = user?.emailOrPhone?.includes('@') ? user.emailOrPhone : null;
      if (email) {
        const firstName = (user?.name || '').split(' ')[0] || 'there';
        if (status === 'paid') {
          await sendMail(
            email,
            'Payment confirmed — ZENI',
            renderBrandEmail({
              title: 'Payment confirmed',
              body: `Hi ${firstName},<br/>We received your payment of <strong>KES ${tx.amount}</strong>.<br/>Receipt: <strong>${tx.receiptNumber || 'Processing'}</strong>.<br/>Thank you for using ZENI!`,
              ctaLabel: 'View invoices',
              ctaHref: (process.env.APP_URL || 'http://localhost:5173') + '/pay/invoices',
            })
          );
        } else {
          await sendMail(
            email,
            'Payment failed — ZENI',
            renderBrandEmail({
              title: 'Payment failed',
              body: `Hi ${firstName},<br/>Unfortunately your payment of <strong>KES ${tx.amount}</strong> could not be processed. Please try again or contact support.`,
              ctaLabel: 'Retry payment',
              ctaHref: (process.env.APP_URL || 'http://localhost:5173') + '/pay/invoices',
            })
          );
        }
      }
    } catch (emailErr) {
      logger.info('[pay] payment email failed', emailErr);
    }
  }

  triggerUserDashboard(tx.userId.toString());
  triggerAdminDashboard();
  return tx;
}

export function reconciliation(status: string) {
  const filter: any = {};
  if (status) filter.status = status;
  return PaymentTransactionModel.find(filter).sort({ createdAt: -1 });
}

export async function resolveTransaction(id: string, status: 'paid' | 'failed') {
  const tx = await PaymentTransactionModel.findByIdAndUpdate(id, { status }, { new: true });
  if (tx && status === 'paid')
    await InvoiceModel.findByIdAndUpdate(tx.invoiceId, { status: 'paid' });
  return tx;
}

export async function expirePendingInvoices() {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const pending = await InvoiceModel.updateMany(
    { status: 'unpaid', createdAt: { $lt: cutoff } },
    { status: 'overdue' }
  );
  return pending.modifiedCount;
}
/* eslint-disable @typescript-eslint/no-explicit-any */
