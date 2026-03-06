import { Response } from 'express';
import { z } from 'zod';
import { PayAuthRequest } from '../middlewares/payAuth';
import { initiatePortalPayment } from '../services/payPortal.service';
import { PayTransactionModel } from '../models/PayTransaction';
import { PayReceiptModel } from '../models/PayReceipt';
import { env } from '../config/env';
import { getPayInsightsMeta } from '../services/payInsights.service';
import { recordAudit } from '../utils/audit';
import { assertTransition, PayStatus } from '../utils/payStateMachine';
import { publishDomainEvent } from '../services/domainEvents';

const initiateSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default('KES'),
  method: z.enum(['mpesa_stk', 'card', 'bank_transfer']),
  phone: z.string().optional(),
  purpose: z
    .enum([
      'booking_fee',
      'viewing_fee',
      'deposit',
      'subscription',
      'boost',
      'rent',
      'service_fee',
      'property_purchase',
      'other',
    ])
    .optional(),
  invoiceId: z.string().optional(),
  referenceId: z.string().max(128).optional(),
});

export async function initiateTransaction(req: PayAuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const actorId = req.user.id;
  const idempotencyKey = req.header('Idempotency-Key');
  if (!idempotencyKey) {
    return res
      .status(400)
      .json({ code: 'IDEMPOTENCY_REQUIRED', message: 'Idempotency-Key header required' });
  }
  const body = initiateSchema.parse(req.body);

  // Velocity controls: per-user tx count/hour and amount/day
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  const hourlyCount = await PayTransactionModel.countDocuments({
    userId: req.user.id,
    createdAt: { $gte: hourAgo },
  });
  if (hourlyCount >= env.payTxMaxPerHour) {
    return res
      .status(429)
      .json({ code: 'TX_RATE_LIMIT', message: 'Too many payment attempts this hour' });
  }

  const dayAgg = await PayTransactionModel.aggregate([
    { $match: { userId: req.user._id, createdAt: { $gte: dayStart } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const dayTotal = dayAgg[0]?.total || 0;
  if (dayTotal + body.amount > env.payTxMaxAmountDay) {
    return res.status(429).json({ code: 'TX_DAILY_LIMIT', message: 'Daily payment limit reached' });
  }

  const result = await initiatePortalPayment(
    actorId,
    body,
    idempotencyKey,
    {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: req.requestId,
      correlationId: req.header('x-correlation-id') || undefined,
    },
    {
      hourlyCount,
      dailyTotal: dayTotal,
      userTenureDays: (() => {
        const created =
          'createdAt' in req.user ? (req.user as { createdAt?: Date }).createdAt : undefined;
        return created
          ? Math.max(
              0,
              Math.floor((Date.now() - new Date(created).getTime()) / (1000 * 60 * 60 * 24))
            )
          : undefined;
      })(),
    }
  );
  const tx = 'transaction' in result ? result.transaction : result;
  const clientSecret = 'clientSecret' in result ? result.clientSecret : undefined;
  await recordAudit(
    {
      actorId,
      actorRole: req.user.role,
      action: 'pay_initiate',
      entityType: 'PayTransaction',
      entityId: tx.id,
      before: null,
      after: tx.toObject(),
    },
    req
  );
  res.status(201).json({ ...tx.toObject(), ...(clientSecret && { clientSecret }) });
}

export async function listTransactions(req: PayAuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const user = req.user;
  const filter: { userId?: string } = {};
  const requestedUserId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
  if (['admin', 'finance'].includes(user.role) && requestedUserId) {
    filter.userId = requestedUserId;
  } else {
    filter.userId = user.id;
  }
  const items = await PayTransactionModel.find(filter).sort({ createdAt: -1 });
  res.json(items);
}

export async function transactionById(req: PayAuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const tx = await PayTransactionModel.findById(req.params.id);
  if (!tx) return res.status(404).json({ code: 'NOT_FOUND', message: 'Transaction not found' });
  const isOwner = String(tx.userId) === String(req.user.id);
  if (!isOwner && !['admin', 'finance'].includes(req.user.role)) {
    return res.status(403).json({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
  }
  res.json(tx);
}

export async function receiptById(req: PayAuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const receipt = await PayReceiptModel.findById(req.params.id);
  if (!receipt) return res.status(404).json({ code: 'NOT_FOUND', message: 'Receipt not found' });
  const tx = await PayTransactionModel.findById(receipt.transactionId);
  if (!tx) return res.status(404).json({ code: 'NOT_FOUND', message: 'Transaction not found' });
  const isOwner = String(tx.userId) === String(req.user.id);
  if (!isOwner && !['admin', 'finance'].includes(req.user.role)) {
    return res.status(403).json({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
  }
  res.json(receipt);
}

export async function reconcileAdmin(req: PayAuthRequest, res: Response) {
  const cutoff = new Date(Date.now() - 10 * 60 * 1000);
  const pending = await PayTransactionModel.find({
    status: 'pending',
    createdAt: { $lt: cutoff },
  }).sort({ createdAt: -1 });
  const failed = await PayTransactionModel.find({ status: 'failed' })
    .sort({ createdAt: -1 })
    .limit(50);
  res.json({ pending, failed });
}

export async function resolveAdmin(req: PayAuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const actorId = req.user.id;
  const schema = z.object({ status: z.enum(['paid', 'failed']) });
  const { status } = schema.parse(req.body);
  const tx = await PayTransactionModel.findById(req.params.id);
  if (!tx) return res.status(404).json({ code: 'NOT_FOUND', message: 'Transaction not found' });
  const before = tx.toObject();
  const actionKey = `resolve:${status}`;

  if (tx.status !== 'pending') {
    return res
      .status(409)
      .json({ code: 'INVALID_STATE', message: `Cannot resolve from ${tx.status}` });
  }

  if (String(tx.userId) === String(actorId)) {
    return res
      .status(403)
      .json({ code: 'SECOND_APPROVER_REQUIRED', message: 'Initiator cannot approve' });
  }

  if (tx.amount >= env.payDualControlAmount) {
    const approvals = tx.approvals || [];
    const existing = approvals.filter((a) => a.action === actionKey);
    const hasOther = existing.some((a) => String(a.userId) !== String(actorId));
    const alreadySelf = existing.some((a) => String(a.userId) === String(actorId));

    if (!existing.length) {
      tx.approvals = [...approvals, { userId: actorId, action: actionKey, at: new Date() }];
      await tx.save();
      return res
        .status(202)
        .json({ pendingApproval: true, message: 'Second approver required', tx });
    }
    if (alreadySelf && !hasOther) {
      return res
        .status(403)
        .json({ code: 'SECOND_APPROVER_REQUIRED', message: 'Different approver required' });
    }
    if (!alreadySelf && !hasOther) {
      tx.approvals = [...approvals, { userId: actorId, action: actionKey, at: new Date() }];
      await tx.save();
      return res
        .status(202)
        .json({ pendingApproval: true, message: 'Waiting for second approver', tx });
    }
    // at least one other approver exists and current is distinct -> proceed
    tx.approvals = [...approvals, { userId: actorId, action: actionKey, at: new Date() }];
  }

  assertTransition(tx.status as PayStatus, status as PayStatus);
  tx.status = status;
  await tx.save();
  await recordAudit(
    {
      actorId,
      actorRole: req.user.role,
      action: 'pay_resolve',
      entityType: 'PayTransaction',
      entityId: tx.id,
      before,
      after: tx.toObject(),
    },
    req
  );
  publishDomainEvent({
    eventType: 'pay_resolved',
    actorId,
    actorRole: req.user.role,
    entityType: 'PayTransaction',
    entityId: tx.id,
    correlationId: req.requestId,
    payload: { status, approvals: tx.approvals },
  });
  res.json(tx);
}

export async function refundAdmin(req: PayAuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const actorId = req.user.id;
  const tx = await PayTransactionModel.findById(req.params.id);
  if (!tx) return res.status(404).json({ code: 'NOT_FOUND', message: 'Transaction not found' });
  const before = tx.toObject();
  const actionKey = 'refund';

  if (tx.status !== 'paid') {
    return res
      .status(409)
      .json({ code: 'INVALID_STATE', message: 'Only paid transactions can be refunded' });
  }

  if (String(tx.userId) === String(actorId)) {
    return res
      .status(403)
      .json({ code: 'SECOND_APPROVER_REQUIRED', message: 'Initiator cannot approve refund' });
  }

  if (tx.amount >= env.payDualControlAmount) {
    const approvals = tx.approvals || [];
    const existing = approvals.filter((a) => a.action === actionKey);
    const hasOther = existing.some((a) => String(a.userId) !== String(actorId));
    const alreadySelf = existing.some((a) => String(a.userId) === String(actorId));

    if (!existing.length) {
      tx.approvals = [...approvals, { userId: actorId, action: actionKey, at: new Date() }];
      await tx.save();
      return res
        .status(202)
        .json({ pendingApproval: true, message: 'Second approver required', tx });
    }
    if (alreadySelf && !hasOther) {
      return res
        .status(403)
        .json({ code: 'SECOND_APPROVER_REQUIRED', message: 'Different approver required' });
    }
    if (!alreadySelf && !hasOther) {
      tx.approvals = [...approvals, { userId: actorId, action: actionKey, at: new Date() }];
      await tx.save();
      return res
        .status(202)
        .json({ pendingApproval: true, message: 'Waiting for second approver', tx });
    }
    tx.approvals = [...approvals, { userId: actorId, action: actionKey, at: new Date() }];
  }

  assertTransition(tx.status as PayStatus, 'reversed');
  tx.status = 'reversed';
  await tx.save();
  await recordAudit(
    {
      actorId,
      actorRole: req.user.role,
      action: 'pay_refund',
      entityType: 'PayTransaction',
      entityId: tx.id,
      before,
      after: tx.toObject(),
    },
    req
  );
  publishDomainEvent({
    eventType: 'pay_refund',
    actorId,
    actorRole: req.user.role,
    entityType: 'PayTransaction',
    entityId: tx.id,
    correlationId: req.requestId,
    payload: { approvals: tx.approvals },
  });
  res.json(tx);
}

export async function insightsAdmin(req: PayAuthRequest, res: Response) {
  const cutoff = new Date(Date.now() - env.payStaleMinutes * 60 * 1000);
  const pending = await PayTransactionModel.countDocuments({ status: 'pending' });
  const stalePending = await PayTransactionModel.countDocuments({
    status: 'pending',
    createdAt: { $lt: cutoff },
  });
  const failed = await PayTransactionModel.countDocuments({ status: 'failed' });
  const missingReceipts = await PayTransactionModel.countDocuments({
    status: 'paid',
    $or: [{ receiptId: { $exists: false } }, { receiptId: null }],
  });
  const meta = getPayInsightsMeta();
  res.json({
    pending,
    stalePending,
    failed,
    missingReceipts,
    lastStaleRun: meta.lastStaleRun,
    lastReceiptScan: meta.lastReceiptScan,
  });
}
