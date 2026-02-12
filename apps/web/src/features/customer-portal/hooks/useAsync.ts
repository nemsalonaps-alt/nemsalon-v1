import { useState, useEffect, useCallback, useRef } from 'react';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface AsyncResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Hook for data fetching with automatic loading/cancellation
export function useAsync<T>(
  fetchFn: () => Promise<T>,
  deps: readonly unknown[] = [],
): AsyncResult<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const mounted = useRef(true);

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const data = await fetchFn();

      if (mounted.current) {
        setState({ data, loading: false, error: null });
      }
    } catch (error) {
      if (mounted.current) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        setState((prev) => ({ ...prev, loading: false, error: message }));
      }
    }
  }, [fetchFn]);

  useEffect(() => {
    mounted.current = true;

    void fetchData();

    return () => {
      mounted.current = false;
    };
  }, deps);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return { ...state, refetch };
}

// Hook for mutations (POST, PUT, DELETE)
export interface MutationState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useMutation<T, Args extends unknown[]>(
  mutationFn: (...args: Args) => Promise<T>,
): {
  mutate: (...args: Args) => Promise<T | null>;
  data: T | null;
  loading: boolean;
  error: string | null;
  reset: () => void;
} {
  const [state, setState] = useState<MutationState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const mutate = useCallback(
    async (...args: Args): Promise<T | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const data = await mutationFn(...args);
        setState({ data, loading: false, error: null });
        return data;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        setState((prev) => ({ ...prev, loading: false, error: message }));
        return null;
      }
    },
    [mutationFn],
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    mutate,
    data: state.data,
    loading: state.loading,
    error: state.error,
    reset,
  };
}
