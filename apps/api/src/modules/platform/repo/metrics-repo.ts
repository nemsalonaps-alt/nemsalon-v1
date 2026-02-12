import { getSupabaseClient } from '../../../server/db.js';
import { httpError } from '../../../server/http-error.js';

export async function getBusinessMetrics(period: '24h' | '7d' | '30d') {
  const client = getSupabaseClient();
  const interval = period === '24h' ? '1 day' : period === '7d' ? '7 days' : '30 days';

  // Get active salons count
  const { data: salonsData, error: salonsError } = await client
    .from('salons')
    .select('status', { count: 'exact' });

  if (salonsError) {
    throw httpError(500, 'DATABASE_ERROR', salonsError.message);
  }

  const totalSalons = salonsData?.length ?? 0;
  const activeSalons = salonsData?.filter((s) => s.status === 'active').length ?? 0;

  // Get GMV for period
  const { data: paymentsData, error: paymentsError } = await client
    .from('payments')
    .select('amount, currency, status, created_at')
    .gte('created_at', new Date(Date.now() - parseInterval(interval)).toISOString());

  if (paymentsError) {
    throw httpError(500, 'DATABASE_ERROR', paymentsError.message);
  }

  const successfulPayments =
    paymentsData?.filter((p) => p.status === 'succeeded' || p.status === 'paid') ?? [];

  const gmv = successfulPayments.reduce((sum, p) => sum + (p.amount ?? 0), 0);
  const currency = successfulPayments[0]?.currency ?? 'DKK';

  // Calculate failed payment rate
  const totalPayments = paymentsData?.length ?? 0;
  const failedPayments = paymentsData?.filter((p) => p.status === 'failed').length ?? 0;
  const failedPaymentRate = totalPayments > 0 ? (failedPayments / totalPayments) * 100 : 0;

  // Get refund rate (would need refunds table or status on payments)
  // For now, approximate from payment status
  const refundedPayments = paymentsData?.filter((p) => p.status === 'refunded').length ?? 0;
  const refundRate = totalPayments > 0 ? (refundedPayments / totalPayments) * 100 : 0;

  return {
    salons: {
      active: activeSalons,
      total: totalSalons,
    },
    gmv: {
      amount: gmv,
      currency,
      period,
    },
    mrr: 0, // Would calculate from subscriptions table
    churnRate: 0, // Would calculate from salon status changes
    failedPayments: failedPaymentRate,
    refundRate,
  };
}

export async function getRiskRadar() {
  const client = getSupabaseClient();

  // Get salons with risk assessments
  const { data: riskData, error: riskError } = await client
    .from('salon_risk_assessments')
    .select(
      `
      *,
      salons:salon_id (id, name, status)
    `,
    )
    .order('risk_score', { ascending: false })
    .limit(100);

  if (riskError) {
    throw httpError(500, 'DATABASE_ERROR', riskError.message);
  }

  // Categorize by risk factors
  const atRisk: RiskSalon[] = [];
  const paymentIssues: RiskSalon[] = [];
  const highCancelRate: RiskSalon[] = [];
  const errorSpikes: RiskSalon[] = [];
  const decliningUsage: RiskSalon[] = [];

  for (const assessment of riskData ?? []) {
    const salonData = assessment.salons as
      | { id: string; name: string; status: string }
      | null
      | undefined;
    const salon = {
      id: assessment.salon_id,
      name: salonData?.name ?? 'Unknown',
      riskScore: assessment.risk_score,
      riskLevel: assessment.risk_level,
      factors: assessment.factors ?? {},
    };

    // Categorize based on primary risk factor
    const factors = assessment.factors ?? {};
    if (factors.noBookings30Days) {
      atRisk.push(salon);
    }
    if (factors.failedPaymentRate > 0.1) {
      paymentIssues.push(salon);
    }
    if (factors.cancellationRate > 0.2) {
      highCancelRate.push(salon);
    }
    if (factors.errorCount24h > 50) {
      errorSpikes.push(salon);
    }
    if (factors.bookingDeclineWoW < -0.3) {
      decliningUsage.push(salon);
    }
  }

  return {
    atRisk,
    paymentIssues,
    highCancelRate,
    errorSpikes,
    decliningUsage,
  };
}

export async function getQueueStats() {
  const client = getSupabaseClient();

  // Get latest stats for each queue
  const { data, error } = await client
    .from('job_queue_stats')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message);
  }

  // Get unique latest entry per queue
  const latestByQueue = new Map();
  for (const stat of data ?? []) {
    if (!latestByQueue.has(stat.queue_name)) {
      latestByQueue.set(stat.queue_name, stat);
    }
  }

  return Array.from(latestByQueue.values()).map(mapQueueStat);
}

function parseInterval(interval: string): number {
  const num = parseInt(interval);
  const unit = interval.includes('day') ? 24 * 60 * 60 * 1000 : 0;
  return num * unit;
}

function mapQueueStat(row: Record<string, unknown>) {
  return {
    name: row.queue_name as string,
    pending: row.pending_count as number,
    processing: row.processing_count as number,
    completed: row.completed_count as number,
    failed: row.failed_count as number,
    deadLetter: row.dead_letter_count as number,
    lastUpdated: row.created_at as string,
  };
}

interface RiskSalon {
  id: string;
  name: string;
  riskScore: number;
  riskLevel: string;
  factors: Record<string, unknown>;
}

// Revenue Analytics
export async function getRevenueAnalytics(period: '30d' | '90d' | '1y') {
  const client = getSupabaseClient();

  const days = period === '30d' ? 30 : period === '90d' ? 90 : 365;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get daily revenue stats
  const { data: dailyStats, error: statsError } = await client
    .from('revenue_daily_stats')
    .select('*')
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (statsError) {
    throw httpError(500, 'DATABASE_ERROR', statsError.message);
  }

  // Get subscription metrics
  const { data: subscriptionData, error: subError } = await client
    .from('salon_subscriptions')
    .select('status, plan_id, current_period_start');

  if (subError) {
    throw httpError(500, 'DATABASE_ERROR', subError.message);
  }

  const totalMrr = dailyStats?.reduce((sum, day) => sum + (day.mrr_amount ?? 0), 0) ?? 0;
  const avgMrr = dailyStats?.length > 0 ? totalMrr / dailyStats.length : 0;

  const activeSubscriptions = subscriptionData?.filter((s) => s.status === 'active').length ?? 0;
  const churnedSubscriptions =
    subscriptionData?.filter((s) => s.status === 'cancelled').length ?? 0;
  const totalSubscriptions = subscriptionData?.length ?? 0;
  const churnRate = totalSubscriptions > 0 ? churnedSubscriptions / totalSubscriptions : 0;

  return {
    period,
    mrr: avgMrr,
    totalRevenue: totalMrr,
    activeSubscriptions,
    churnRate,
    dailyStats:
      dailyStats?.map((day) => ({
        date: day.date,
        mrr: day.mrr_amount,
        newSubscriptions: day.new_subscriptions,
        churned: day.churned_subscriptions,
      })) ?? [],
  };
}

// Cohort Analysis
export async function getCohortAnalysis() {
  const client = getSupabaseClient();

  // Get salons grouped by creation month
  const { data: salons, error: salonError } = await client
    .from('salons')
    .select('id, created_at, status');

  if (salonError) {
    throw httpError(500, 'DATABASE_ERROR', salonError.message);
  }

  // Get subscription history for retention calculation
  const { data: subscriptions, error: subError } = await client
    .from('salon_subscriptions')
    .select('salon_id, current_period_start, status');

  if (subError) {
    throw httpError(500, 'DATABASE_ERROR', subError.message);
  }

  // Group by cohort month
  const cohorts = new Map<string, { total: number; active: number; month: string }>();

  for (const salon of salons ?? []) {
    const month = salon.created_at.substring(0, 7); // YYYY-MM
    if (!cohorts.has(month)) {
      cohorts.set(month, { total: 0, active: 0, month });
    }
    const cohort = cohorts.get(month)!;
    cohort.total++;

    // Check if still active
    const hasActiveSub = subscriptions?.some(
      (s) => s.salon_id === salon.id && s.status === 'active',
    );
    if (hasActiveSub || salon.status === 'active') {
      cohort.active++;
    }
  }

  // Calculate retention rates per month
  const cohortAnalysis = Array.from(cohorts.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 12)
    .map(([month, data]) => {
      const monthsSince = calculateMonthsSince(month);
      return {
        cohort: month,
        totalSalons: data.total,
        retentionRates: generateRetentionRates(data.total, data.active, monthsSince),
      };
    });

  return cohortAnalysis;
}

function calculateMonthsSince(cohortMonth: string): number {
  const parts = cohortMonth.split('-');
  const year = parseInt(parts[0] ?? '0');
  const month = parseInt(parts[1] ?? '1');
  const cohortDate = new Date(year, month - 1);
  const now = new Date();
  return (
    (now.getFullYear() - cohortDate.getFullYear()) * 12 + (now.getMonth() - cohortDate.getMonth())
  );
}

function generateRetentionRates(total: number, active: number, monthsSince: number): number[] {
  const rates: number[] = [100]; // Month 0 = 100%

  // Simulate retention decline based on actual active count
  const currentRetention = total > 0 ? (active / total) * 100 : 0;

  for (let i = 1; i <= Math.min(12, monthsSince); i++) {
    // Linear interpolation from 100% to current retention
    const progress = i / monthsSince;
    const rate = 100 - (100 - currentRetention) * progress;
    rates.push(Math.round(rate));
  }

  // Fill remaining months with current retention
  while (rates.length <= 12) {
    rates.push(Math.round(currentRetention));
  }

  return rates;
}
