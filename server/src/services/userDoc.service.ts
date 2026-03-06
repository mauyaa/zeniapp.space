import { UserDocModel } from '../models/UserDocument';

export async function listUserDocs(userId: string) {
  return UserDocModel.find({ userId }).sort({ createdAt: -1 });
}

export async function createUserDoc(
  userId: string,
  data: { type: string; url: string; note?: string; sharedListings?: string[] }
) {
  return UserDocModel.create({
    userId,
    type: data.type,
    url: data.url,
    note: data.note,
    sharedListings: data.sharedListings,
  });
}

export async function shareDocToListings(userId: string, docId: string, listingIds: string[]) {
  const updated = await UserDocModel.findOneAndUpdate(
    { _id: docId, userId },
    { sharedListings: listingIds },
    { new: true }
  );
  return updated;
}
