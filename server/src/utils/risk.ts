import { getOrCreateCounter } from '../middlewares/metrics';

export type PayRiskInput = {
  amount: number;
  method: 'mpesa_stk' | 'card' | 'bank_transfer';
  hourlyCount?: number;
  dailyTotal?: number;
  userTenureDays?: number;
};

export type PayRiskResult = {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  riskFlags: string[];
};

// Very lightweight, deterministic scorer meant for operational visibility (not fraud-grade).
export function assessPayRisk(input: PayRiskInput): PayRiskResult {
  let score = 0;
  const flags: string[] = [];

  if (input.amount >= 50000) {
    score += 0.4;
    flags.push('high_amount');
  } else if (input.amount >= 25000) {
    score += 0.2;
    flags.push('medium_amount');
  }

  if (input.method === 'card') {
    score += 0.1;
    flags.push('card_method');
  }

  if (input.hourlyCount && input.hourlyCount >= 3) {
    score += 0.25;
    flags.push('velocity_hour');
  }

  if (input.dailyTotal && input.dailyTotal + input.amount >= 75000) {
    score += 0.15;
    flags.push('velocity_day_amount');
  }

  if (input.userTenureDays !== undefined && input.userTenureDays < 7) {
    score += 0.1;
    flags.push('new_user');
  }

  const riskLevel: PayRiskResult['riskLevel'] =
    score >= 0.6 ? 'high' : score >= 0.3 ? 'medium' : 'low';

  // Metric: count flags emitted
  if (flags.length) {
    const counter = getOrCreateCounter(
      'pay_risk_flags_total',
      'Count of pay transactions that triggered risk flags',
      ['level']
    );
    counter.inc({ level: riskLevel });
  }

  if (riskLevel === 'high') {
    const anomalyCounter = getOrCreateCounter(
      'pay_anomaly_flagged_total',
      'Count of high-risk pay transactions flagged',
      []
    );
    anomalyCounter.inc();
  }

  return { riskScore: Number(score.toFixed(2)), riskLevel, riskFlags: flags };
}
