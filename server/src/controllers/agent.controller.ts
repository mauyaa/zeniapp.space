import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/auth';
import {
  getAgentStats,
  getAgentAvailability,
  setAgentAvailability,
  getPayoutChecklist,
  runTestPayout,
} from '../services/agent.service';
import { getAgentDashboardData } from '../services/dashboard.service';

export async function getStats(req: AuthRequest, res: Response) {
  const agentId = req.user?.id;
  if (!agentId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const stats = await getAgentStats(agentId);
  res.json(stats);
}

export async function dashboard(req: AuthRequest, res: Response) {
  const agentId = req.user?.id;
  if (!agentId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const data = await getAgentDashboardData(agentId);
  res.json(data);
}

export async function getAvailability(req: AuthRequest, res: Response) {
  const agentId = req.user?.id;
  if (!agentId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const availability = await getAgentAvailability(agentId);
  res.json({ availability });
}

export async function updateAvailability(req: AuthRequest, res: Response) {
  const schema = z.object({ availability: z.enum(['active', 'paused']) });
  const { availability } = schema.parse(req.body);
  const agentId = req.user?.id;
  if (!agentId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const updated = await setAgentAvailability(agentId, availability);
  res.json({ availability: updated.availability });
}

export async function payoutChecklist(req: AuthRequest, res: Response) {
  const agentId = req.user?.id;
  if (!agentId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const data = await getPayoutChecklist(agentId);
  res.json(data);
}

export async function payoutTest(req: AuthRequest, res: Response) {
  const agentId = req.user?.id;
  if (!agentId) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing user' });
  const data = await runTestPayout(agentId);
  res.json(data);
}
