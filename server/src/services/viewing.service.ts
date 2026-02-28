/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';
import { ListingModel } from '../models/Listing';
import { ViewingRequestModel } from '../models/ViewingRequest';
import { getIO } from '../socket';
import {
  VIEWING_LEAD_TIME_HOURS,
  VIEWING_MAX_PER_AGENT_PER_DAY
} from '../utils/constants';
import type { ViewingStatus } from '../models/ViewingRequest';
import { env } from '../config/env';
import { createNotification } from './notification.service';
import { getListing } from './listing.service';

interface CreatePayload {
  listingId: string;
  agentId?: string;
  userId: string;
  date: Date;
  altDates?: Date[];
  note?: string;
  timezone?: string;
}

export async function createViewing(payload: CreatePayload) {
  const { listingId, agentId, userId, date, altDates, note, timezone } = payload;
  const listing = await getListing(listingId);
  if (!listing) throw Object.assign(new Error('Listing not found'), { status: 404 });
  const listingAgentValue: any = (listing as any).agentId;
  const listingAgentId = listingAgentValue
    ? String(listingAgentValue._id ?? listingAgentValue.id ?? listingAgentValue)
    : '';
  if (!listingAgentId) throw Object.assign(new Error('Listing agent not found'), { status: 400 });
  if (agentId && String(agentId) !== listingAgentId) {
    throw Object.assign(new Error('Agent does not match listing owner'), { status: 400, code: 'AGENT_MISMATCH' });
  }
  const now = new Date();
  const leadTimeMs = VIEWING_LEAD_TIME_HOURS * 60 * 60 * 1000;
  if (new Date(date).getTime() < now.getTime() + leadTimeMs) {
    throw Object.assign(
      new Error(`Viewing must be at least ${VIEWING_LEAD_TIME_HOURS} hours from now (EAT)`),
      { status: 400, code: 'LEAD_TIME' }
    );
  }
  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const confirmedThatDay = await ViewingRequestModel.countDocuments({
    agentId: listingAgentId,
    date: { $gte: dayStart, $lt: dayEnd },
    status: 'confirmed'
  });
  if (confirmedThatDay >= VIEWING_MAX_PER_AGENT_PER_DAY) {
    throw Object.assign(
      new Error(`Agent has reached maximum ${VIEWING_MAX_PER_AGENT_PER_DAY} viewings for that day`),
      { status: 409, code: 'MAX_VIEWINGS_PER_DAY' }
    );
  }
  const viewingFeeAmount = env.viewingFeeAmount || 0;
  const doc = await ViewingRequestModel.create({
    listingId: new mongoose.Types.ObjectId(listingId),
    agentId: new mongoose.Types.ObjectId(listingAgentId),
    userId: new mongoose.Types.ObjectId(userId),
    date,
    altDates: altDates?.slice(0, 3),
    note,
    status: 'requested',
    timezone: timezone || 'Africa/Nairobi',
    viewingFeeAmount: viewingFeeAmount > 0 ? viewingFeeAmount : undefined,
    viewingFeeStatus: viewingFeeAmount > 0 ? 'pending_payment' : undefined
  });
  const io = getIO();
  if (io) {
    io.to(`user:${listingAgentId}`).emit('viewing:new', { id: doc.id, listingId, userId, date });
    io.to(`user:${userId}`).emit('viewing:ack', { id: doc.id });
  }
  await createNotification(listingAgentId, {
    title: 'New viewing request',
    description: note ? note.slice(0, 80) : 'A user requested a viewing',
    type: 'viewing'
  });
  const out = doc.toObject ? doc.toObject() : doc;
  return Object.assign(out, {
    needsViewingFee: viewingFeeAmount > 0,
    viewingFeeAmount: viewingFeeAmount > 0 ? viewingFeeAmount : undefined
  });
}

export function listViewingsForUser(userId: string) {
  return ViewingRequestModel.find({ userId }).sort({ createdAt: -1 });
}

export function listViewingsForAgent(agentId: string) {
  return ViewingRequestModel.find({ agentId }).sort({ createdAt: -1 });
}

export async function updateViewingStatus(
  id: string,
  agentId: string,
  status: ViewingStatus,
  reason?: string,
  message?: string
) {
  const doc = await ViewingRequestModel.findOne({ _id: id, agentId });
  if (!doc) throw Object.assign(new Error('Viewing not found'), { status: 404 });
  const allowed: ViewingStatus[] =
    doc.status === 'requested'
      ? ['confirmed', 'declined']
      : doc.status === 'confirmed'
        ? ['completed', 'no_show', 'canceled']
        : [];
  if (!allowed.includes(status)) {
    throw Object.assign(new Error(`Cannot transition from ${doc.status} to ${status}`), {
      status: 409,
      code: 'INVALID_STATUS_TRANSITION'
    });
  }
  const updated = await ViewingRequestModel.findOneAndUpdate(
    { _id: id, agentId },
    { status, agentReason: reason, agentMessage: message },
    { new: true }
  );
  if (!updated) throw Object.assign(new Error('Viewing not found'), { status: 404 });
  const io = getIO();
  if (io) {
    io.to(`user:${String(updated.userId)}`).emit('viewing:update', { id: updated.id, status });
  }
  await createNotification(String(updated.userId), {
    title: 'Viewing updated',
    description:
      status === 'completed'
        ? 'The agent marked the viewing as complete. Confirm to release your viewing fee to the agent.'
        : message || reason || `Status: ${status}`,
    type: 'viewing'
  });
  return updated;
}

/** Tenant confirms viewing was completed so the held viewing fee can be released to the agent. */
export async function confirmViewingCompletedByTenant(viewingId: string, userId: string) {
  const doc = await ViewingRequestModel.findOne({ _id: viewingId, userId });
  if (!doc) throw Object.assign(new Error('Viewing not found'), { status: 404 });
  if (doc.status !== 'completed') {
    throw Object.assign(new Error('Only completed viewings can be confirmed'), { status: 409, code: 'INVALID_STATUS' });
  }
  if (doc.viewingFeeStatus !== 'held') {
    throw Object.assign(new Error('No viewing fee held to release'), { status: 409, code: 'NO_FEE_HELD' });
  }
  const updated = await ViewingRequestModel.findByIdAndUpdate(
    viewingId,
    { $set: { tenantConfirmedAt: new Date(), viewingFeeStatus: 'released' } },
    { new: true }
  );
  const io = getIO();
  if (io) {
    io.to(`user:${String(doc.agentId)}`).emit('viewing:fee_released', { id: viewingId });
  }
  await createNotification(String(doc.agentId), {
    title: 'Viewing fee released',
    description: 'Tenant confirmed the viewing. The viewing fee has been released to you.',
    type: 'viewing'
  });
  return updated;
}

/** User cancels their viewing request. */
export async function cancelViewingByUser(id: string, userId: string) {
  const doc = await ViewingRequestModel.findOne({ _id: id, userId });
  if (!doc) throw Object.assign(new Error('Viewing not found'), { status: 404 });
  if (doc.status !== 'requested' && doc.status !== 'confirmed') {
    throw Object.assign(new Error(`Cannot cancel viewing in status ${doc.status}`), {
      status: 409,
      code: 'INVALID_STATUS'
    });
  }
  const updated = await ViewingRequestModel.findOneAndUpdate(
    { _id: id, userId },
    { status: 'canceled' },
    { new: true }
  );
  if (!updated) throw Object.assign(new Error('Viewing not found'), { status: 404 });
  const io = getIO();
  if (io) {
    io.to(`user:${String(doc.agentId)}`).emit('viewing:update', { id: updated.id, status: 'canceled' });
  }
  await createNotification(String(doc.agentId), {
    title: 'Viewing canceled',
    description: 'A viewing was canceled by the user',
    type: 'viewing'
  });
  return updated;
}

function formatIcsDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export async function generateViewingIcs(viewingId: string, agentId: string) {
  const doc = await ViewingRequestModel.findOne({ _id: viewingId, agentId });
  if (!doc) throw Object.assign(new Error('Viewing not found'), { status: 404 });
  const listing = await ListingModel.findById(doc.listingId).select('title location');

  const start = new Date(doc.date);
  const end = new Date(start.getTime() + 60 * 60 * 1000); // default 1h
  const title = listing?.title || 'Property viewing';
  const location = listing?.location?.address || listing?.location?.city || 'To be confirmed';
  const description = doc.agentMessage || doc.agentReason || doc.note || 'Viewing scheduled via ZENI';

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ZENI//Viewing//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${doc.id}@zeni`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ];

  return {
    filename: `viewing-${doc.id}.ics`,
    content: lines.join('\r\n')
  };
}
export async function getViewingForUser(id: string, userId: string) {
  return ViewingRequestModel.findOne({ _id: id, userId });
}
/* eslint-disable @typescript-eslint/no-explicit-any */
