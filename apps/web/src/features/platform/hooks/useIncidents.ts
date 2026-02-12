import { useState, useEffect, useCallback } from 'react';
import * as api from '../api/platform-api';
import type { Incident } from '../types/platform-types';

export function useIncidents(filters?: { status?: string; severity?: string }) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIncidents = useCallback(async () => {
    try {
      setLoading(true);
      const result = await api.listIncidents(filters);
      setIncidents(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch incidents');
    } finally {
      setLoading(false);
    }
  }, [filters?.status, filters?.severity]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  return { incidents, loading, error, refresh: fetchIncidents };
}

export function useCreateIncident() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(
    async (data: {
      title: string;
      description?: string;
      severity: 'critical' | 'high' | 'medium' | 'low';
      affectedSalonIds?: string[];
    }) => {
      try {
        setLoading(true);
        setError(null);
        const result = await api.createIncident(data);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create incident');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { create, loading, error };
}
