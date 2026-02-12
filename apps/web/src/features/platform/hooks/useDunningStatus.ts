import { useState, useEffect, useCallback } from 'react';
import * as api from '../api/platform-api';

export function useDunningStatus() {
  const [status, setStatus] = useState<{
    cycle1: number;
    cycle2: number;
    cycle3: number;
    failedPermanently: number;
    total: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const result = await api.getDunningStatus();
      setStatus(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dunning status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { status, loading, error, refresh: fetchStatus };
}
