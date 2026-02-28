import crypto from 'crypto';
import mongoose from 'mongoose';
import { PayTransactionModel } from '../models/PayTransaction';
import { PayReceiptModel } from '../models/PayReceipt';
import { getOrCreateGauge } from '../middlewares/metrics';
import { getIO } from '../socket';
import { AuditLogModel } from '../models/AuditLog';
import { assertTransition, canTransition, PayStatus } from '../utils/payStateMachine';
import { assessPayRisk } from '../utils/risk';
import { initiateStk } from './mpesa.service';
import { publishDomainEvent } from './domainEvents';
import { ListingModel } from '../models/Listing';
import { invalidatePrefix } from '../utils/listingCache';
import { logger } from '../utils/logger';
import type { PayTransactionDocument } from '../models/PayTransaction';

export interface PayInitiateInput {
  amount: number;
  currency?: string;
  method: 'mpesa_stk' | 'card' | 'bank_transfer';
  phone?: string;
  purpose?: import('../models/PayTransaction').PayPurpose;
  invoiceId?: string;
  referenceId?: string;
}

type AuditMeta = { ip?: string; userAgent?: string; requestId?: string; correlationId?: string };
type RiskCtx = { hourlyCount?: number; dailyTotal?: number; userTenureDays?: number };

export type MpesaCallbackPayload = Record<string, unknown> & {
  providerRef: string;
  success: boolean;
  receipt?: string;
};

type MarkPaidOptions = {
  setStatusToPaid?: boolean;
  rawCallback?: Record<string, unknown>;
};

function makeReceiptHash(parts: string[]) {
  return crypto.createHash('sha256').update(parts.join(':')).digest('hex');
}

function isDuplicateKeyError(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: number }).code === 11000);
}

function isTransactionUnsupportedError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  return (
    message.includes('Transaction numbers are only allowed on a replica set member or mongos') ||
    message.includes('transactions are only allowed on replica sets') ||
    message.includes('This MongoDB deployment does not support retryable writes')
  );
}

async function runWithTransactionFallback<T>(operation: (session?: mongoose.ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  try {
    let output: T | undefined;
    await session.withTransaction(async () => {
      output = await operation(session);
    });
    if (output === undefined) {
      throw new Error('Transaction completed without a result');
    }
    return output;
  } catch (error) {
    if (!isTransactionUnsupportedError(error)) throw error;
    logger.info('[pay] Mongo transaction unsupported in this environment, using non-transactional fallback');
    return operation();
  } finally {
    await session.endSession();
  }
}

/**
 * Shared: create receipt, run viewing_fee / listing sold|let, socket emit, domain event.
 * Can also mark a transaction as paid when `setStatusToPaid` is enabled.
 */
export async function markTransactionPaidAndNotify(
  tx: PayTransactionDocument,
  receiptNumber: string,
  providerRef?: string,
  options?: MarkPaidOptions
): Promise<void> {
  const { txDoc, shouldInvalidateListingSearch } = await runWithTransactionFallback(async (session) => {
    const txQuery = PayTransactionModel.findById(tx.id);
    if (session) txQuery.session(session);
    const txDoc = await txQuery;
    if (!txDoc) {
      throw Object.assign(new Error('Transaction not found'), { status: 404, code: 'NOT_FOUND' });
    }

    if (options?.setStatusToPaid && txDoc.status !== 'paid') {
      assertTransition(txDoc.status as PayStatus, 'paid');
      txDoc.status = 'paid';
    }
    if (options?.rawCallback) {
      txDoc.rawCallback = options.rawCallback;
    }
    if (txDoc.status !== 'paid') {
      throw Object.assign(new Error('Cannot issue receipt for non-paid transaction'), { status: 409, code: 'INVALID_STATE' });
    }

    const hash = makeReceiptHash([txDoc.id, receiptNumber, String(txDoc.amount)]);
    const receiptQuery = PayReceiptModel.findOne({ transactionId: txDoc.id });
    if (session) receiptQuery.session(session);
    let receipt = await receiptQuery;
    if (!receipt) {
      try {
        const created = await PayReceiptModel.create(
          [
            {
              transactionId: txDoc.id,
              receiptNumber,
              amount: txDoc.amount,
              currency: txDoc.currency,
              status: 'valid',
              issuedAt: new Date(),
              hash
            }
          ],
          session ? { session } : undefined
        );
        receipt = created[0];
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;
        const retryQuery = PayReceiptModel.findOne({ transactionId: txDoc.id });
        if (session) retryQuery.session(session);
        receipt = await retryQuery;
      }
    }
    if (!receipt) {
      throw new Error('Failed to resolve payment receipt');
    }

    txDoc.receiptId = receipt.id;
    await txDoc.save(session ? { session } : undefined);

    if (txDoc.purpose === 'viewing_fee' && txDoc.referenceId) {
      const { ViewingRequestModel } = await import('../models/ViewingRequest');
      await ViewingRequestModel.findByIdAndUpdate(
        txDoc.referenceId,
        { $set: { viewingFeeTxId: txDoc.id, viewingFeeStatus: 'held' } },
        session ? { session } : undefined
      );
    }

    let shouldInvalidateListingSearch = false;
    if (txDoc.referenceId && mongoose.Types.ObjectId.isValid(txDoc.referenceId)) {
      if (txDoc.purpose === 'property_purchase') {
        const result = await ListingModel.updateOne(
          { _id: txDoc.referenceId },
          { $set: { availabilityStatus: 'sold' } },
          session ? { session } : undefined
        );
        shouldInvalidateListingSearch = result.matchedCount > 0;
      } else if (txDoc.purpose === 'rent') {
        const result = await ListingModel.updateOne(
          { _id: txDoc.referenceId },
          { $set: { availabilityStatus: 'let' } },
          session ? { session } : undefined
        );
        shouldInvalidateListingSearch = result.matchedCount > 0;
      }
    }

    return { txDoc, shouldInvalidateListingSearch };
  });

  tx.status = txDoc.status;
  tx.receiptId = txDoc.receiptId;
  tx.rawCallback = txDoc.rawCallback;
  if (shouldInvalidateListingSearch) invalidatePrefix('listing:search');

  const io = getIO();
  if (io) {
    io.to(`user:${txDoc.userId.toString()}`).emit('pay:transaction', {
      id: txDoc.id,
      status: txDoc.status,
      receiptId: txDoc.receiptId
    });
  }

  publishDomainEvent({
    eventType: 'pay_status_updated',
    entityType: 'PayTransaction',
    entityId: txDoc.id,
    payload: { status: txDoc.status, providerRef: providerRef || txDoc.ref }
  });
}

export async function initiatePortalPayment(
  userId: string,
  payload: PayInitiateInput,
  idempotencyKey: string,
  meta?: AuditMeta,
  riskCtx?: RiskCtx
) {
  const existing = await PayTransactionModel.findOne({ idempotencyKey });
  if (existing) {
    await AuditLogModel.create({
      actorId: userId,
      actorRole: 'user',
      action: 'pay_idempotent_replay',
      entityType: 'PayTransaction',
      entityId: existing.id,
      after: { status: existing.status },
      ...meta
    });
    publishDomainEvent({
      eventType: 'pay_initiated_replay',
      actorId: userId,
      actorRole: 'user',
      entityType: 'PayTransaction',
      entityId: existing.id,
      correlationId: meta?.correlationId,
      requestId: meta?.requestId,
      payload: { status: existing.status }
    });
    return existing;
  }

  const currency = payload.currency || 'KES';
  let ref: string | undefined;

  if (payload.method === 'mpesa_stk') {
    if (!payload.phone) {
      throw Object.assign(new Error('Phone is required for M-Pesa'), { status: 400, code: 'PHONE_REQUIRED' });
    }
    const stk = await initiateStk('portal', payload.phone, payload.amount);
    ref = stk.providerRef;
  } else if (payload.method === 'card') {
    ref = `PORTAL-CARD-${Date.now()}`;
  } else {
    ref = `PORTAL-${Date.now()}`;
  }

  const risk = assessPayRisk({
    amount: payload.amount,
    method: payload.method,
    hourlyCount: riskCtx?.hourlyCount,
    dailyTotal: riskCtx?.dailyTotal,
    userTenureDays: riskCtx?.userTenureDays
  });

  const created = await PayTransactionModel.create({
    userId,
    amount: payload.amount,
    currency,
    method: payload.method,
    status: 'pending',
    ref,
    idempotencyKey,
    purpose: payload.purpose,
    invoiceId: payload.invoiceId,
    referenceId: payload.referenceId,
    riskScore: risk.riskScore,
    riskLevel: risk.riskLevel,
    riskFlags: risk.riskFlags
  });

  if (risk.riskLevel === 'high') {
    publishDomainEvent({
      eventType: 'pay_anomaly_flagged',
      actorId: userId,
      actorRole: 'user',
      entityType: 'PayTransaction',
      entityId: created.id,
      correlationId: meta?.correlationId,
      requestId: meta?.requestId,
      payload: {
        amount: payload.amount,
        currency,
        method: payload.method,
        riskFlags: risk.riskFlags,
        riskScore: risk.riskScore
      }
    });
    await AuditLogModel.create({
      actorId: userId,
      actorRole: 'system',
      action: 'pay_risk_high',
      entityType: 'PayTransaction',
      entityId: created.id,
      after: { riskLevel: risk.riskLevel, riskFlags: risk.riskFlags, riskScore: risk.riskScore },
      ...meta
    });
  }

  publishDomainEvent({
    eventType: 'pay_initiated',
    actorId: userId,
    actorRole: 'user',
    entityType: 'PayTransaction',
    entityId: created.id,
    correlationId: meta?.correlationId,
    requestId: meta?.requestId,
    payload: {
      amount: payload.amount,
      currency,
      method: payload.method,
      riskLevel: risk.riskLevel,
      riskFlags: risk.riskFlags
    }
  });

  if (payload.method === 'card') {
    const { createPaymentIntent } = await import('./stripe.service');
    const stripeResult = await createPaymentIntent({
      amountKes: payload.amount,
      currency,
      payTransactionId: String(created._id),
      userId: String(userId),
      purpose: payload.purpose,
      referenceId: payload.referenceId
    });
    if (stripeResult) {
      created.ref = stripeResult.paymentIntentId;
      await created.save();
      return { transaction: created, clientSecret: stripeResult.clientSecret };
    }
  }

  return created;
}

export async function handlePortalCallback(payload: MpesaCallbackPayload) {
  const tx = await PayTransactionModel.findOne({ ref: payload.providerRef });
  if (!tx) return null;

  const nextStatus: PayStatus = payload.success ? 'paid' : 'failed';
  if (tx.status === nextStatus) {
    return tx;
  }
  if (!canTransition(tx.status as PayStatus, nextStatus)) {
    return tx;
  }

  if (nextStatus === 'paid') {
    await markTransactionPaidAndNotify(tx, payload.receipt || `RCPT-${Date.now()}-${tx.id.slice(-6)}`, payload.providerRef, {
      setStatusToPaid: true,
      rawCallback: payload
    });
    const updated = await PayTransactionModel.findById(tx.id);
    return updated || tx;
  } else {
    assertTransition(tx.status as PayStatus, nextStatus);
    tx.status = nextStatus;
    tx.rawCallback = payload;
    await tx.save();
    const io = getIO();
    if (io) {
      io.to(`user:${tx.userId.toString()}`).emit('pay:transaction', { id: tx.id, status: tx.status, receiptId: tx.receiptId });
    }
    publishDomainEvent({
      eventType: 'pay_status_updated',
      entityType: 'PayTransaction',
      entityId: tx.id,
      payload: { status: tx.status, providerRef: payload.providerRef }
    });
  }

  return tx;
}

export async function expireStalePortalTransactions(maxAgeMinutes: number) {
  const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
  const stale = await PayTransactionModel.find({ status: 'pending', createdAt: { $lt: cutoff } });
  if (!stale.length) return 0;

  for (const tx of stale) {
    const before = tx.toObject();
    tx.status = 'failed';
    await tx.save();
    await AuditLogModel.create({
      actorRole: 'system',
      action: 'pay_stale_fail',
      entityType: 'PayTransaction',
      entityId: tx.id,
      before,
      after: tx.toObject()
    });
  }
  return stale.length;
}

// Detect paid transactions missing receipts (data integrity check)
export async function detectPaidWithoutReceipt() {
  const items = await PayTransactionModel.find({
    status: 'paid',
    $or: [{ receiptId: { $exists: false } }, { receiptId: null }]
  })
    .sort({ createdAt: -1 })
    .limit(50);
  if (!items.length) return 0;

  for (const tx of items) {
    await AuditLogModel.create({
      actorRole: 'system',
      action: 'pay_receipt_missing',
      entityType: 'PayTransaction',
      entityId: tx.id,
      before: tx.toObject()
    });
  }
  return items.length;
}

export function registerPayGauges() {
  const gauge = getOrCreateGauge('pay_transactions_status', 'Pay portal transactions by status', ['status']);
  PayTransactionModel.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]).then((rows) => {
    gauge.reset();
    rows.forEach((r) => gauge.set({ status: r._id }, r.count));
  }).catch(() => {
    // ignore aggregation errors
  });
}
