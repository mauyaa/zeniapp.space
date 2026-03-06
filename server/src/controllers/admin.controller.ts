import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/auth';
import {
  evaluatePrivilegedRequest,
  getPrivilegedNetworkPolicySnapshot,
} from '../middlewares/ipAllowlist';
import {
  verifyAgent,
  markEarbVerified,
  listPendingAgents,
  listPendingListings,
  listModerationQueue,
  moderateListing,
  resolveUserKyc,
  resolveBusinessVerify,
  analyticsCounts,
  auditLogs,
  exportReports,
  exportAgentsCsv,
  exportListingsCsv,
  listAllUsers,
  updateUserStatusService,
  deleteUserService,
  deleteListingService,
  listNetworkAccessDecisions,
} from '../services/admin.service';
import { getAdminDashboardData } from '../services/dashboard.service';
import { getRateLimitMetrics } from '../services/rateMetrics';

export async function getUsers(_req: AuthRequest, res: Response) {
  res.json(await listAllUsers());
}

export async function updateUserStatus(req: AuthRequest, res: Response) {
  const schema = z.object({ status: z.enum(['active', 'suspended', 'banned']) });
  const { status } = schema.parse(req.body);
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  try {
    const updated = await updateUserStatusService(userId, req.params.id, status);
    if (!updated) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found' });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ code: 'BAD_REQUEST', message: (error as Error).message });
  }
}

export async function deleteUser(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  try {
    await deleteUserService(userId, req.params.id);
    res.status(204).end();
  } catch (error) {
    res.status(404).json({ code: 'NOT_FOUND', message: (error as Error).message });
  }
}

export async function pendingAgents(_req: AuthRequest, res: Response) {
  res.json(await listPendingAgents());
}

export async function pendingListings(_req: AuthRequest, res: Response) {
  res.json(await listPendingListings());
}

export async function getModerationQueue(_req: AuthRequest, res: Response) {
  res.json(await listModerationQueue());
}

export async function resolveKyc(req: AuthRequest, res: Response) {
  const schema = z.object({ decision: z.enum(['approve', 'reject']) });
  const { decision } = schema.parse(req.body);
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const updated = await resolveUserKyc(userId, req.params.userId, decision);
  res.json(updated);
}

export async function resolveBusinessVerifyDecision(req: AuthRequest, res: Response) {
  const schema = z.object({ decision: z.enum(['approve', 'reject']) });
  const { decision } = schema.parse(req.body);
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const updated = await resolveBusinessVerify(userId, req.params.agentId, decision);
  res.json(updated);
}

export async function verifyAgentDecision(req: AuthRequest, res: Response) {
  const schema = z.object({ decision: z.enum(['approve', 'reject']) });
  const { decision } = schema.parse(req.body);
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const updated = await verifyAgent(userId, req.params.id, decision);
  res.json(updated);
}

export async function markAgentEarbVerified(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const updated = await markEarbVerified(userId, req.params.id);
  if (!updated) return res.status(404).json({ code: 'NOT_FOUND', message: 'Agent not found' });
  res.json(updated);
}

export async function verifyListing(req: AuthRequest, res: Response) {
  const schema = z.object({ action: z.enum(['approve', 'reject', 'unlist', 'feature']) });
  const { action } = schema.parse(req.body);
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const updated = await moderateListing(userId, req.params.id, action);
  res.json(updated);
}

export async function deleteListing(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  try {
    await deleteListingService(userId, req.params.id);
    res.status(204).end();
  } catch (error) {
    res.status(404).json({ code: 'NOT_FOUND', message: (error as Error).message });
  }
}

export async function analytics(_req: AuthRequest, res: Response) {
  res.json(await analyticsCounts());
}

export async function dashboard(_req: AuthRequest, res: Response) {
  res.json(await getAdminDashboardData());
}

export async function audit(req: AuthRequest, res: Response) {
  const schema = z.object({
    actorId: z
      .string()
      .regex(/^[a-f\d]{24}$/i)
      .optional(),
    actorRole: z.string().optional(),
    entityType: z.string().optional(),
    entityId: z.string().optional(),
    action: z.string().optional(),
    limit: z.coerce.number().min(1).max(500).optional(),
  });
  const filters = schema.parse(req.query);
  res.json(await auditLogs(filters));
}

export async function exportReportsCsv(req: AuthRequest, res: Response) {
  const csv = await exportReports(req.query);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="reports.csv"');
  res.send(csv);
}

export async function exportAgents(_req: AuthRequest, res: Response) {
  const csv = await exportAgentsCsv();
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="agents.csv"');
  res.send(csv);
}

export async function exportListings(_req: AuthRequest, res: Response) {
  const csv = await exportListingsCsv();
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="listings.csv"');
  res.send(csv);
}

export async function rateMetrics(_req: AuthRequest, res: Response) {
  res.json({ limits: getRateLimitMetrics() });
}

export async function networkAccessStatus(req: AuthRequest, res: Response) {
  const policy = getPrivilegedNetworkPolicySnapshot();
  const request = evaluatePrivilegedRequest(req);
  const recentDecisions = await listNetworkAccessDecisions(25);
  res.json({ policy, request, recentDecisions });
}
