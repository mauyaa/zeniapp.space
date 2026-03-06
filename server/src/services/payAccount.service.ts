import { PayAccountModel } from '../models/PayAccount';

export async function ensurePayAccount(userId: string, opts?: { defaultCurrency?: string }) {
  const existing = await PayAccountModel.findOne({ userId });
  if (existing) return existing;
  return PayAccountModel.create({
    userId,
    defaultCurrency: opts?.defaultCurrency || 'KES',
  });
}

export async function getPayAccount(userId: string) {
  return PayAccountModel.findOne({ userId });
}

export async function listPayAccounts() {
  return PayAccountModel.find().sort({ createdAt: -1 });
}

export async function updatePayAccountDefaults(
  userId: string,
  payload: { defaultCurrency?: string; defaultMethod?: 'mpesa_stk' | 'card' | 'bank_transfer' }
) {
  return PayAccountModel.findOneAndUpdate({ userId }, payload, { new: true });
}

export async function setPayAccountStatus(userId: string, status: 'active' | 'suspended') {
  await ensurePayAccount(userId);
  return PayAccountModel.findOneAndUpdate({ userId }, { status }, { new: true });
}
