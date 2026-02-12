import { useState, useEffect, useCallback } from 'react';
import * as api from '../api/platform-api';

export function useRevenueAnalytics(period: '30d' | '90d' | '1y' = '30d') {
  const [analytics, setAnalytics] = useState<{
    period: string;
    mrr: number;
    totalRevenue: number;
    activeSubscriptions: number;
    churnRate: number;
    dailyStats: Array<{
      date: string;
      mrr: number;
      newSubscriptions: number;
      churned: number;
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const result = await api.getRevenueAnalytics(period);
      setAnalytics(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch revenue analytics');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return { analytics, loading, error, refresh: fetchAnalytics };
}

export function useCohortAnalysis() {
  const [cohorts, setCohorts] = useState<
    Array<{
      cohort: string;
      totalSalons: number;
      retentionRates: number[];
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCohorts = useCallback(async () => {
    try {
      setLoading(true);
      const result = await api.getCohortAnalysis();
      setCohorts(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cohort analysis');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCohorts();
  }, [fetchCohorts]);

  return { cohorts, loading, error, refresh: fetchCohorts };
}
