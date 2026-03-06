import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/auth';
import {
  initiatePayment,
  listInvoices,
  getInvoice,
  handleCallback,
  reconciliation,
  resolveTransaction,
  getTransaction,
} from '../services/pay.service';
import { handlePortalCallback } from '../services/payPortal.service';
import { verifyCallbackSignature } from '../services/mpesa.service';

export async function invoices(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  res.json(await listInvoices(userId));
}

export async function invoiceById(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const inv = await getInvoice(req.params.id, userId);
  if (!inv) return res.status(404).json({ code: 'NOT_FOUND', message: 'Invoice not found' });
  res.json(inv);
}

export async function transactionById(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const tx = await getTransaction(req.params.id, userId);
  if (!tx) return res.status(404).json({ code: 'NOT_FOUND', message: 'Transaction not found' });
  res.json(tx);
}

export async function stkInitiate(req: AuthRequest, res: Response) {
  const schema = z.object({ invoiceId: z.string(), phone: z.string() });
  const { invoiceId, phone } = schema.parse(req.body);
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const tx = await initiatePayment(invoiceId, userId, phone);
  res.status(201).json(tx);
}

const mpesaCallbackSchema = z.object({
  providerRef: z.string(),
  success: z.boolean(),
  receipt: z.string().optional(),
});

/** Safaricom Daraja STK callback body shape */
const darajaStkCallbackSchema = z.object({
  Body: z.object({
    stkCallback: z.object({
      CheckoutRequestID: z.string(),
      ResultCode: z.coerce.number(),
      ResultDesc: z.string().optional(),
      CallbackMetadata: z
        .object({
          Item: z.array(
            z.object({
              Name: z.string(),
              Value: z.union([z.string(), z.number(), z.null()]).optional(),
            })
          ),
        })
        .optional(),
    }),
  }),
});

function normalizeMpesaCallbackBody(
  body: unknown
): { providerRef: string; success: boolean; receipt?: string } | null {
  const parsed = darajaStkCallbackSchema.safeParse(body);
  if (parsed.success) {
    const cb = parsed.data.Body.stkCallback;
    const items = cb.CallbackMetadata?.Item ?? [];
    const receipt = items.find((i) => i.Name === 'MpesaReceiptNumber');
    return {
      providerRef: cb.CheckoutRequestID,
      success: cb.ResultCode === 0,
      receipt: receipt ? String(receipt.Value) : undefined,
    };
  }
  const simple = mpesaCallbackSchema.safeParse(body);
  if (simple.success) return simple.data;
  return null;
}

export async function mpesaCallback(req: Request, res: Response) {
  const signature =
    (req.headers['x-callback-secret'] as string | undefined) ||
    (req.headers['x-mpesa-signature'] as string | undefined);

  if (!verifyCallbackSignature(signature)) {
    return res
      .status(401)
      .json({ code: 'INVALID_SIGNATURE', message: 'Invalid callback signature' });
  }

  const payload = normalizeMpesaCallbackBody(req.body);
  if (!payload) {
    return res
      .status(400)
      .json({ code: 'INVALID_PAYLOAD', message: 'Invalid M-Pesa callback body' });
  }

  const portalHandled = await handlePortalCallback(payload);
  if (!portalHandled) {
    await handleCallback(payload);
  }
  res.json({ ok: true });
}

export async function adminReconciliation(req: AuthRequest, res: Response) {
  res.json(await reconciliation(req.query.status as string));
}

export async function adminResolveTx(req: AuthRequest, res: Response) {
  const schema = z.object({ status: z.enum(['paid', 'failed']) });
  const { status } = schema.parse(req.body);
  const tx = await resolveTransaction(req.params.id, status);
  res.json(tx);
}
