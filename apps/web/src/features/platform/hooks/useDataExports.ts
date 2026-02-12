import { useState, useEffect, useCallback } from 'react';
import * as api from '../api/platform-api';
import type { DataExport } from '../types/platform-types';

export function useDataExports() {
  const [exports, setExports] = useState<DataExport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExports = useCallback(async () => {
    try {
      setLoading(true);
      const result = await api.listDataExports();
      setExports(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data exports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExports();
  }, [fetchExports]);

  return { exports, loading, error, refresh: fetchExports };
}

export function useCreateDataExport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(
    async (data: {
      exportType: 'full_salon' | 'customer_data' | 'audit_logs';
      salonId: string;
      format: 'json' | 'csv';
    }) => {
      try {
        setLoading(true);
        setError(null);
        const result = await api.createDataExport(data);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create data export');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { create, loading, error };
}
