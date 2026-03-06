/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose, { Schema, Document } from 'mongoose';
import { env } from '../config/env';
import { forwardAudit } from '../services/logForwarder';

export interface AuditLogDocument extends Document {
  actorId: mongoose.Types.ObjectId;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  requestId?: string;
  correlationId?: string;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema = new Schema<AuditLogDocument>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    actorRole: String,
    action: String,
    entityType: String,
    entityId: String,
    before: Object,
    after: Object,
    requestId: String,
    correlationId: String,
    ip: String,
    userAgent: String,
  },
  { timestamps: true }
);

AuditLogSchema.index({ createdAt: -1, actorRole: 1, action: 1 });
const auditTtlDays = Math.max(1, Number(env.auditTtlDays || 180));
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: auditTtlDays * 24 * 60 * 60 });

AuditLogSchema.post('save', (doc: AuditLogDocument) => {
  // Fire-and-forget forward to external sink if configured
  forwardAudit({
    actorId: doc.actorId,
    actorRole: doc.actorRole,
    action: doc.action,
    entityType: doc.entityType,
    entityId: doc.entityId,
    createdAt: doc.createdAt,
    requestId: doc.requestId,
    correlationId: doc.correlationId,
  });
});

export const AuditLogModel = mongoose.model<AuditLogDocument>('AuditLog', AuditLogSchema);

/* eslint-disable @typescript-eslint/no-explicit-any */
