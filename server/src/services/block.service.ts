import { BlockedUserModel } from '../models/BlockedUser';

export async function blockUser(blockerId: string, blockedId: string) {
  if (blockerId === blockedId) {
    const err = new Error('Cannot block yourself');
    (err as Error & { status?: number; code?: string }).status = 400;
    (err as Error & { status?: number; code?: string }).code = 'INVALID';
    throw err;
  }
  await BlockedUserModel.findOneAndUpdate(
    { blockerId, blockedId },
    { blockerId, blockedId },
    { upsert: true, new: true }
  );
  return { blocked: true, blockedId };
}

export async function unblockUser(blockerId: string, blockedId: string) {
  const result = await BlockedUserModel.deleteOne({ blockerId, blockedId });
  return { unblocked: result.deletedCount > 0, blockedId };
}

export async function listBlockedUserIds(blockerId: string): Promise<string[]> {
  const docs = await BlockedUserModel.find({ blockerId }).select('blockedId').lean();
  return docs.map((d) => String(d.blockedId));
}
