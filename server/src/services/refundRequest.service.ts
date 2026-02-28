import type { Request } from 'express';
import mongoose from 'mongoose';
import { RefundRequestModel } from '../models/RefundRequest';
import { PayTransactionModel } from '../models/PayTransaction';
import { recordAudit } from '../utils/audit';

export async function createRefundRequest(userId: string, transactionId: string, reason: string) {
  const tx = await PayTransactionModel.findById(transactionId);
  if (!tx) throw Object.assign(new Error('Transaction not found'), { status: 404 });
  if (String(tx.userId) !== String(userId)) {
    throw Object.assign(new Error('Not your transaction'), { status: 403 });
  }
  if (tx.status !== 'paid') {
    throw Object.assign(new Error('Only paid transactions can be refunded'), { status: 400 });
  }
  const existing = await RefundRequestModel.findOne({ transactionId });
  if (existing) {
    throw Object.assign(new Error('Refund already requested'), { status: 409 });
  }
  const doc = await RefundRequestModel.create({ userId, transactionId, reason, status: 'pending' });
  return doc;
}

export function listRefundRequestsByUser(userId: string) {
  return RefundRequestModel.find({ userId }).sort({ createdAt: -1 }).populate('transactionId', 'amount currency status purpose createdAt');
}

/**
 * Paid transactions for this user that are eligible for a refund request (no existing request).
 * IMPORTANT: Pay portal must use the same user id as the main app (same JWT sub / User._id)
 * so that PayTransaction.userId matches the authenticated user. If Pay has separate accounts,
 * implement a "link pay account" flow and store the mapping so we can query by main app userId.
 */
export async function getEligibleTransactionsForRefund(userId: string) {
  const existingRefundTxIds = await RefundRequestModel.distinct('transactionId', { userId });
  const txs = await PayTransactionModel.find({
    userId: new mongoose.Types.ObjectId(userId),
    status: 'paid',
    _id: { $nin: existingRefundTxIds }
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return txs.map((t: { _id: mongoose.Types.ObjectId; amount: number; currency: string; purpose?: string; referenceId?: string; createdAt?: Date }) => ({
    _id: t._id,
    amount: t.amount,
    currency: t.currency,
    purpose: t.purpose,
    referenceId: t.referenceId,
    createdAt: t.createdAt
  }));
}

export function listRefundRequestsAdmin(status?: string) {
  const filter = status ? { status } : {};
  return RefundRequestModel.find(filter).sort({ createdAt: -1 }).populate('userId', 'name emailOrPhone').populate('transactionId', 'amount currency status purpose referenceId createdAt');
}

export async function resolveRefundRequest(
  requestId: string,
  adminId: string,
  decision: 'approved' | 'rejected',
  adminNotes?: string,
  req?: Request
) {
  const refReq = await RefundRequestModel.findById(requestId);
  if (!refReq) throw Object.assign(new Error('Refund request not found'), { status: 404 });
  if (refReq.status !== 'pending') {
    throw Object.assign(new Error('Request already resolved'), { status: 409 });
  }
  refReq.status = decision === 'approved' ? 'approved' : 'rejected';
  refReq.reviewedBy = new mongoose.Types.ObjectId(adminId);
  refReq.reviewedAt = new Date();
  if (adminNotes) refReq.adminNotes = adminNotes;
  await refReq.save();

  if (req) {
    await recordAudit(
      {
        actorId: adminId,
        actorRole: 'admin',
        action: `refund_request_${decision}`,
        entityType: 'RefundRequest',
        entityId: requestId,
        after: { status: refReq.status, adminNotes: refReq.adminNotes }
      },
      req
    );
  }

  if (decision === 'approved') {
    const { assertTransition } = await import('../utils/payStateMachine');
    const tx = await PayTransactionModel.findById(refReq.transactionId);
    if (tx && tx.status === 'paid') {
      assertTransition(tx.status as 'paid', 'reversed');
      tx.status = 'reversed';
      await tx.save();
      if (req) {
        await recordAudit(
          {
            actorId: adminId,
            actorRole: 'admin',
            action: 'pay_refund_via_request',
            entityType: 'PayTransaction',
            entityId: String(tx.id),
            after: { status: 'reversed', refundRequestId: requestId }
          },
          req
        );
      }
    }
  }

  return refReq;
}
