import { useState, useEffect, useCallback, useRef } from 'react';
import type { PlatformHealth, BusinessMetrics, RiskRadarData } from '../types/platform-types';
import * as api from '../api/platform-api';

interface UsePlatformHealthReturn {
  health: PlatformHealth | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function usePlatformHealth(autoRefresh = true): UsePlatformHealthReturn {
  const [health, setHealth] = useState<PlatformHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const data = await api.getPlatformHealth();
      setHealth(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchHealth();
  }, [fetchHealth]);

  useEffect(() => {
    fetchHealth();

    if (autoRefresh) {
      intervalRef.current = setInterval(fetchHealth, 5000); // Refresh every 5 seconds
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchHealth, autoRefresh]);

  return { health, loading, error, refresh };
}

interface UseBusinessMetricsReturn {
  metrics: BusinessMetrics | null;
  loading: boolean;
  error: string | null;
  period: '24h' | '7d' | '30d';
  setPeriod: (period: '24h' | '7d' | '30d') => void;
  refresh: () => void;
}

export function useBusinessMetrics(): UseBusinessMetricsReturn {
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'24h' | '7d' | '30d'>('24h');

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getBusinessMetrics(period);
      setMetrics(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  }, [period]);

  const refresh = useCallback(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { metrics, loading, error, period, setPeriod, refresh };
}

interface UseRiskRadarReturn {
  data: RiskRadarData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useRiskRadar(): UseRiskRadarReturn {
  const [data, setData] = useState<RiskRadarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRiskRadar = useCallback(async () => {
    try {
      setLoading(true);
      const result = await api.getRiskRadar();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch risk data');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    fetchRiskRadar();
  }, [fetchRiskRadar]);

  useEffect(() => {
    fetchRiskRadar();
  }, [fetchRiskRadar]);

  return { data, loading, error, refresh };
}
