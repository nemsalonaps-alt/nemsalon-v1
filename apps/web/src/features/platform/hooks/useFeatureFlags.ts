import { useState, useEffect, useCallback } from 'react';
import * as api from '../api/platform-api';
import type { FeatureFlag } from '../types/platform-types';

export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFlags = useCallback(async () => {
    try {
      setLoading(true);
      const result = await api.listFeatureFlags();
      setFlags(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch feature flags');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  return { flags, loading, error, refresh: fetchFlags };
}

export function useUpdateFeatureFlag() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = useCallback(async (key: string, data: Partial<FeatureFlag>) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.updateFeatureFlag(key, data);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update feature flag');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { update, loading, error };
}
