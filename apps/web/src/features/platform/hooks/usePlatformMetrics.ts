import { useState, useEffect, useCallback } from 'react';
import * as api from '../api/platform-api';
import type { RiskRadarData } from '../types/platform-types';

export function useRiskRadar(): {
  data: RiskRadarData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
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
