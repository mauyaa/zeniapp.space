import { isIP } from 'net';
import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { recordAudit } from '../utils/audit';

export type PrivilegedSurface = 'admin' | 'pay_admin';
export type NetworkDecisionReason = 'test_bypass' | 'ip_missing' | 'ip_not_allowed' | 'tailnet_required' | 'allowed';

type AllowlistMode = 'open' | 'restricted';

type ParsedIp = {
  version: 4 | 6;
  value: bigint;
};

type ParsedCidr = {
  raw: string;
  version: 4 | 6;
  prefix: number;
  bits: number;
  network: bigint;
};

type AccessDecision = {
  allowed: boolean;
  reason: NetworkDecisionReason;
  sourceIp?: string;
  allowlistMode: AllowlistMode;
  allowlistMatched: boolean;
  tailnetRequired: boolean;
  tailnetDetected: boolean;
};

type RequestWithUser = Request & {
  requestId?: string;
  user?: {
    id?: string;
    role?: string;
  };
};

const NETWORK_POLICY_LOADED_AT = new Date().toISOString();

const sanitizeSourceIp = (value: string) => {
  let ip = value.trim();
  if (!ip) return '';

  if (ip.startsWith('[') && ip.endsWith(']')) {
    ip = ip.slice(1, -1);
  }

  const zoneIndex = ip.indexOf('%');
  if (zoneIndex >= 0) {
    ip = ip.slice(0, zoneIndex);
  }

  const mappedPrefix = '::ffff:';
  if (ip.toLowerCase().startsWith(mappedPrefix)) {
    const mapped = ip.slice(mappedPrefix.length);
    if (isIP(mapped) === 4) return mapped;
  }

  // Handles forwarded IPv4 values that include port (e.g. 100.64.0.1:41234).
  if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(ip)) {
    ip = ip.split(':')[0];
  }

  return ip;
};

const parseIpv4ToBigInt = (value: string): bigint | null => {
  const parts = value.split('.');
  if (parts.length !== 4) return null;

  let acc = 0n;
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null;
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) return null;
    acc = (acc << 8n) + BigInt(octet);
  }
  return acc;
};

const parseIpv6ToBigInt = (input: string): bigint | null => {
  let value = input.toLowerCase();
  if (!value) return null;

  // Convert IPv4-tail IPv6 values to pure hextet form.
  if (value.includes('.')) {
    const splitAt = value.lastIndexOf(':');
    if (splitAt === -1) return null;
    const ipv4Part = value.slice(splitAt + 1);
    const ipv4 = parseIpv4ToBigInt(ipv4Part);
    if (ipv4 === null) return null;
    const hi = Number((ipv4 >> 16n) & 0xffffn).toString(16);
    const lo = Number(ipv4 & 0xffffn).toString(16);
    value = `${value.slice(0, splitAt)}:${hi}:${lo}`;
  }

  const doubleColonCount = (value.match(/::/g) || []).length;
  if (doubleColonCount > 1) return null;

  let parts: string[] = [];
  if (value.includes('::')) {
    const [leftRaw, rightRaw] = value.split('::');
    const left = leftRaw ? leftRaw.split(':').filter(Boolean) : [];
    const right = rightRaw ? rightRaw.split(':').filter(Boolean) : [];
    const missing = 8 - (left.length + right.length);
    if (missing < 0) return null;
    parts = [...left, ...Array(missing).fill('0'), ...right];
  } else {
    parts = value.split(':');
    if (parts.length !== 8) return null;
  }

  if (parts.length !== 8) return null;

  let acc = 0n;
  for (const part of parts) {
    if (!/^[0-9a-f]{1,4}$/i.test(part)) return null;
    acc = (acc << 16n) + BigInt(parseInt(part, 16));
  }
  return acc;
};

const parseIp = (input: string): ParsedIp | null => {
  const candidate = sanitizeSourceIp(input);
  const version = isIP(candidate);
  if (version === 4) {
    const value = parseIpv4ToBigInt(candidate);
    return value === null ? null : { version: 4, value };
  }
  if (version === 6) {
    const value = parseIpv6ToBigInt(candidate);
    return value === null ? null : { version: 6, value };
  }
  return null;
};

const bitsForVersion = (version: 4 | 6) => (version === 4 ? 32 : 128);

const subnetMask = (bits: number, prefix: number) => {
  if (prefix === 0) return 0n;
  const fullMask = (1n << BigInt(bits)) - 1n;
  return ((fullMask << BigInt(bits - prefix)) & fullMask);
};

const parseCidr = (input: string): ParsedCidr | null => {
  const raw = input.trim();
  if (!raw) return null;

  const [ipPart, prefixPart] = raw.includes('/') ? raw.split('/') : [raw, undefined];
  const ip = parseIp(ipPart);
  if (!ip) return null;

  const bits = bitsForVersion(ip.version);
  const prefix = prefixPart === undefined ? bits : Number(prefixPart);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > bits) return null;

  const mask = subnetMask(bits, prefix);
  const network = ip.value & mask;

  return { raw, version: ip.version, prefix, bits, network };
};

const parseCidrList = (entries: string[]) => {
  const parsed: ParsedCidr[] = [];
  for (const entry of entries) {
    const cidr = parseCidr(entry);
    if (cidr) {
      parsed.push(cidr);
      continue;
    }
    if (env.nodeEnv === 'development') {
      console.warn(`[network-access] ignoring invalid CIDR or IP entry: "${entry}"`);
    }
  }
  return parsed;
};

const parsedTailnetCidrs = parseCidrList(env.tailnetExpectedCidrs);
const hasWildcardAllowlist = env.adminIpAllowlist.includes('*');
const parsedAdminAllowlist = parseCidrList(env.adminIpAllowlist.filter((entry) => entry !== '*'));

const matchParsedCidrs = (ip: ParsedIp, cidrs: ParsedCidr[]) => {
  for (const cidr of cidrs) {
    if (cidr.version !== ip.version) continue;
    const mask = subnetMask(cidr.bits, cidr.prefix);
    if ((ip.value & mask) === cidr.network) return true;
  }
  return false;
};

const getClientIp = (req: Request): string | undefined => {
  const forwarded = req.header('x-forwarded-for')?.split(',')[0]?.trim();
  const candidate = forwarded || req.ip || '';
  const sanitized = sanitizeSourceIp(candidate);
  return sanitized || undefined;
};

const isTailnetRequired = (surface: PrivilegedSurface) => (surface === 'admin' ? env.adminRequireTailnet : env.payAdminRequireTailnet);

const evaluateAccess = (req: Request, surface: PrivilegedSurface): AccessDecision => {
  const sourceIp = getClientIp(req);
  const allowlistMode: AllowlistMode =
    env.adminIpAllowlist.length === 0 || hasWildcardAllowlist ? 'open' : 'restricted';

  const base: AccessDecision = {
    allowed: false,
    reason: 'ip_missing',
    sourceIp,
    allowlistMode,
    allowlistMatched: allowlistMode === 'open',
    tailnetRequired: isTailnetRequired(surface),
    tailnetDetected: false
  };

  if (env.nodeEnv === 'test' && process.env.ENFORCE_NETWORK_ACCESS_IN_TEST !== 'true') {
    return { ...base, allowed: true, reason: 'test_bypass', allowlistMatched: true };
  }

  if (!sourceIp) return base;

  const parsed = parseIp(sourceIp);
  if (!parsed) return base;

  const allowlistMatched = allowlistMode === 'open' ? true : matchParsedCidrs(parsed, parsedAdminAllowlist);
  const tailnetDetected = matchParsedCidrs(parsed, parsedTailnetCidrs);

  if (!allowlistMatched) {
    return { ...base, allowlistMatched, tailnetDetected, reason: 'ip_not_allowed' };
  }

  if (base.tailnetRequired && !tailnetDetected) {
    return { ...base, allowlistMatched, tailnetDetected, reason: 'tailnet_required' };
  }

  return {
    ...base,
    allowed: true,
    reason: 'allowed',
    allowlistMatched,
    tailnetDetected
  };
};

const recordDecision = (req: RequestWithUser, surface: PrivilegedSurface, decision: AccessDecision) => {
  void recordAudit(
    {
      actorId: req.user?.id,
      actorRole: req.user?.role || 'anonymous',
      action: decision.allowed ? 'network_access_allowed' : 'network_access_denied',
      entityType: 'network_access',
      entityId: surface,
      after: {
        surface,
        reason: decision.reason,
        path: req.originalUrl,
        method: req.method,
        sourceIp: decision.sourceIp,
        allowlistMode: decision.allowlistMode,
        allowlistMatched: decision.allowlistMatched,
        tailnetRequired: decision.tailnetRequired,
        tailnetDetected: decision.tailnetDetected
      }
    },
    req
  ).catch((err) => {
    if (env.nodeEnv === 'development') {
      console.warn('[network-access] audit failed', (err as Error).message);
    }
  });
};

const deny = (res: Response, reason: NetworkDecisionReason) => {
  if (reason === 'tailnet_required') {
    return res.status(403).json({
      code: 'TAILNET_REQUIRED',
      message: 'Tailscale network access is required for this route'
    });
  }

  return res.status(403).json({ code: 'IP_NOT_ALLOWED', message: 'IP not allowed' });
};

export function requirePrivilegedNetworkAccess(surface: PrivilegedSurface) {
  return (req: Request, res: Response, next: NextFunction) => {
    const decision = evaluateAccess(req, surface);
    recordDecision(req as RequestWithUser, surface, decision);
    if (!decision.allowed) return deny(res, decision.reason);
    return next();
  };
}

// Backwards-compatible alias for existing imports.
export function requireAdminIp(req: Request, res: Response, next: NextFunction) {
  return requirePrivilegedNetworkAccess('admin')(req, res, next);
}

export function getPrivilegedNetworkPolicySnapshot() {
  return {
    loadedAt: NETWORK_POLICY_LOADED_AT,
    tailnetExpectedCidrs: env.tailnetExpectedCidrs,
    adminIpAllowlist: {
      mode: env.adminIpAllowlist.length === 0 || hasWildcardAllowlist ? 'open' : 'restricted',
      entries: env.adminIpAllowlist
    },
    enforcement: {
      adminTailnetRequired: env.adminRequireTailnet,
      payAdminTailnetRequired: env.payAdminRequireTailnet
    }
  };
}

export function evaluatePrivilegedRequest(req: Request) {
  const admin = evaluateAccess(req, 'admin');
  const payAdmin = evaluateAccess(req, 'pay_admin');

  return {
    sourceIp: admin.sourceIp || payAdmin.sourceIp,
    tailnetDetected: admin.tailnetDetected || payAdmin.tailnetDetected,
    admin: {
      allowed: admin.allowed,
      reason: admin.reason
    },
    payAdmin: {
      allowed: payAdmin.allowed,
      reason: payAdmin.reason
    }
  };
}
