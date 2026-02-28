import { Request } from 'express';
import { AuditLogModel } from '../models/AuditLog';

type MinimalReq = Request & { requestId?: string };

export function auditContext(req?: MinimalReq) {
  if (!req) return {};
  return {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    requestId: req.requestId,
    correlationId: req.header('x-correlation-id') || undefined
  };
}

type AuditInput = {
  actorId?: unknown;
  actorRole?: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  requestId?: string;
  correlationId?: string;
  ip?: string;
  userAgent?: string;
};

export async function recordAudit(entry: AuditInput, req?: MinimalReq) {
  const payload = { ...entry, ...auditContext(req) };
  return AuditLogModel.create(payload);
}
