import { useState, useEffect, useCallback } from 'react';
import * as api from '../api/platform-api';

interface SecurityAnomaly {
  id: string;
  anomalyType: string;
  userId: string | null;
  salonId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  description: string;
  severity: string;
  status: string;
  investigatedBy: string | null;
  investigatedAt: string | null;
  createdAt: string;
}

export function useSecurityAnomalies(filters?: { status?: string; severity?: string }) {
  const [anomalies, setAnomalies] = useState<SecurityAnomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnomalies = useCallback(async () => {
    try {
      setLoading(true);
      const result = await api.listSecurityAnomalies(filters);
      setAnomalies(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch security anomalies');
    } finally {
      setLoading(false);
    }
  }, [filters?.status, filters?.severity]);

  useEffect(() => {
    fetchAnomalies();
  }, [fetchAnomalies]);

  return { anomalies, loading, error, refresh: fetchAnomalies };
}
