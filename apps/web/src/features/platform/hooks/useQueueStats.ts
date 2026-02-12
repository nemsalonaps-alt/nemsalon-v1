import { useState, useEffect, useCallback } from 'react';
import * as api from '../api/platform-api';
import type { QueueStats } from '../types/platform-types';

export function useQueueStats() {
  const [queues, setQueues] = useState<QueueStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const result = await api.getQueueStats();
      setQueues(result.queues);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch queue stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return { queues, loading, error, refresh: fetchStats };
}
