import { ReservationModel } from '../models/Reservation';

export async function createReservation(userId: string, listingId: string, amount: number, currency: string) {
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h hold
  const reservation = await ReservationModel.create({ userId, listingId, amount, currency, status: 'held', expiresAt });
  return reservation;
}

export async function releaseReservation(id: string, userId: string) {
  return ReservationModel.findOneAndUpdate({ _id: id, userId }, { status: 'released' }, { new: true });
}

export async function listReservations(userId: string) {
  return ReservationModel.find({ userId }).sort({ createdAt: -1 });
}
