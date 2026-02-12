// Payment Hooks - React hooks for all 86+ payment functions

import { useState, useCallback, useEffect } from 'react';
import type {
  Payment,
  Refund,
  PaymentDispute,
  PaymentMethod,
  PaymentAnalytics,
  CheckoutResult,
  MRRData,
  RevenueForecast,
  PaymentGatewayHealth,
  PaymentFilters,
  LoadingState,
} from '../types';
import * as paymentApi from '../api';

// ==================== CORE PAYMENT HOOKS ====================

export function useCreateCheckout() {
  const [state, setState] = useState<LoadingState>('idle');
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const createCheckout = useCallback(
    async (input: Parameters<typeof paymentApi.createCheckout>[0]) => {
      setState('loading');
      setError(null);
      try {
        const data = await paymentApi.createCheckout(input);
        setResult(data);
        setState('success');
        return data;
      } catch (err) {
        setError(err as Error);
        setState('error');
        throw err;
      }
    },
    [],
  );

  return { createCheckout, state, result, error };
}

export function usePaymentStatus(paymentId: string) {
  const [status, setStatus] = useState<{ status: string; amount: number; currency: string } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!paymentId) return;

    const fetchStatus = async () => {
      try {
        const data = await paymentApi.getPaymentStatus(paymentId);
        setStatus(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [paymentId]);

  return { status, loading, error };
}

// ==================== REFUND HOOKS ====================

export function useCreateRefund() {
  const [state, setState] = useState<LoadingState>('idle');
  const [result, setResult] = useState<{ refundId: string; amount: number; status: string } | null>(
    null,
  );
  const [error, setError] = useState<Error | null>(null);

  const createRefund = useCallback(async (input: Parameters<typeof paymentApi.createRefund>[0]) => {
    setState('loading');
    setError(null);
    try {
      const data = await paymentApi.createRefund(input);
      setResult(data);
      setState('success');
      return data;
    } catch (err) {
      setError(err as Error);
      setState('error');
      throw err;
    }
  }, []);

  return { createRefund, state, result, error };
}

export function useProcessBulkRefund() {
  const [state, setState] = useState<LoadingState>('idle');
  const [result, setResult] = useState<{
    processed: string[];
    failed: string[];
    totalAmount: number;
  } | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const processBulkRefund = useCallback(
    async (refunds: Array<{ paymentId: string; amount: number }>) => {
      setState('loading');
      setError(null);
      try {
        const data = await paymentApi.processBulkRefund(refunds);
        setResult(data);
        setState('success');
        return data;
      } catch (err) {
        setError(err as Error);
        setState('error');
        throw err;
      }
    },
    [],
  );

  return { processBulkRefund, state, result, error };
}

// ==================== ANALYTICS HOOKS ====================

export function usePaymentAnalytics(salonId: string) {
  const [analytics, setAnalytics] = useState<{
    successRate: number;
    averageTransactionValue: number;
    paymentMethods: Record<string, number>;
    declineReasons: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!salonId) return;

    const fetchAnalytics = async () => {
      try {
        const data = await paymentApi.getPaymentAnalytics(salonId);
        setAnalytics(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [salonId]);

  return { analytics, loading, error, refetch: () => setLoading(true) };
}

export function useMRR(
  salonId: string,
  options?: { groupByPlan?: boolean; includeGrowth?: boolean },
) {
  const [mrr, setMrr] = useState<MRRData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!salonId) return;

    const fetchMRR = async () => {
      try {
        const data = await paymentApi.calculateMRR(salonId, options);
        setMrr(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchMRR();
  }, [salonId, options?.groupByPlan, options?.includeGrowth]);

  return { mrr, loading, error };
}

export function useRevenueForecast(
  salonId: string,
  days: number,
  options?: { useHistoricalData?: boolean; accountForSeasonality?: boolean },
) {
  const [forecast, setForecast] = useState<RevenueForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!salonId) return;

    const fetchForecast = async () => {
      try {
        const data = await paymentApi.getRevenueForecast(salonId, days, options);
        setForecast(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchForecast();
  }, [salonId, days, options?.useHistoricalData, options?.accountForSeasonality]);

  return { forecast, loading, error };
}

// ==================== GATEWAY HOOKS ====================

export function useGatewayHealth() {
  const [health, setHealth] = useState<PaymentGatewayHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const data = await paymentApi.getPaymentGatewayHealth();
        setHealth(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return { health, loading, error };
}

// ==================== PAYMENT LISTING HOOKS ====================

export function usePayments(filters?: PaymentFilters) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const data = await paymentApi.getPayments(filters);
        setPayments(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [filters?.status, filters?.dateRange?.from, filters?.dateRange?.to, filters?.searchQuery]);

  return { payments, loading, error, refetch: () => setLoading(true) };
}

export function useRefunds(salonId: string) {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!salonId) return;

    const fetchRefunds = async () => {
      try {
        const data = await paymentApi.getRefunds(salonId);
        setRefunds(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchRefunds();
  }, [salonId]);

  return { refunds, loading, error };
}

export function useDisputes(salonId: string) {
  const [disputes, setDisputes] = useState<PaymentDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!salonId) return;

    const fetchDisputes = async () => {
      try {
        const data = await paymentApi.getDisputes(salonId);
        setDisputes(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchDisputes();
  }, [salonId]);

  return { disputes, loading, error };
}

export function usePaymentMethods(salonId: string) {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!salonId) return;

    const fetchMethods = async () => {
      try {
        const data = await paymentApi.getPaymentMethods(salonId);
        setMethods(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchMethods();
  }, [salonId]);

  return { methods, loading, error };
}

// ==================== CALCULATION HOOKS ====================

export function useCalculateProcessingFee() {
  const [calculate, setCalculate] = useState<
    (
      amount: number,
      currency: string,
      options?: { volumeDiscount?: boolean; internationalCard?: boolean },
    ) => Promise<number>
  >(() => async () => 0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCalculate(
      () =>
        async (
          amount: number,
          currency: string,
          options?: { volumeDiscount?: boolean; internationalCard?: boolean },
        ) => {
          setLoading(true);
          try {
            const fee = await paymentApi.calculateProcessingFee(amount, currency, options);
            return fee;
          } finally {
            setLoading(false);
          }
        },
    );
  }, []);

  return { calculate, loading };
}

export function useSplitPayment() {
  const [state, setState] = useState<LoadingState>('idle');
  const [result, setResult] = useState<{
    platformAmount: number;
    salonAmount: number;
    platformAmountWithTax?: number;
    salonNetAmount?: number;
  } | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const splitPayment = useCallback(
    async (
      amount: number,
      platformFeePercent: number,
      options?: { taxRate?: number; deductProcessingFee?: boolean },
    ) => {
      setState('loading');
      setError(null);
      try {
        const data = await paymentApi.splitPaymentWithPlatform(amount, platformFeePercent, options);
        setResult(data);
        setState('success');
        return data;
      } catch (err) {
        setError(err as Error);
        setState('error');
        throw err;
      }
    },
    [],
  );

  return { splitPayment, state, result, error };
}

// ==================== SECURITY HOOKS ====================

export function useValidatePCICompliance() {
  const [validate, setValidate] = useState<
    (
      input: Parameters<typeof paymentApi.validatePCICompliance>[0],
    ) => Promise<{ compliant: boolean; encryptionValid?: boolean }>
  >(() => async () => ({ compliant: false }));

  useEffect(() => {
    setValidate(() => async (input: Parameters<typeof paymentApi.validatePCICompliance>[0]) => {
      return await paymentApi.validatePCICompliance(input);
    });
  }, []);

  return { validate };
}

// ==================== EXPORT HOOKS ====================

export function useExportPaymentData() {
  const [state, setState] = useState<LoadingState>('idle');
  const [data, setData] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const exportData = useCallback(
    async (
      salonId: string,
      options: { format: 'csv' | 'json'; fromDate: string; toDate: string; gdprExport?: boolean },
    ) => {
      setState('loading');
      setError(null);
      try {
        const result = await paymentApi.exportPaymentData(salonId, options);
        setData(result);
        setState('success');
        return result;
      } catch (err) {
        setError(err as Error);
        setState('error');
        throw err;
      }
    },
    [],
  );

  return { exportData, data, state, error };
}

// ==================== DISPUTE HOOKS ====================

export function useHandleChargeback() {
  const [state, setState] = useState<LoadingState>('idle');
  const [result, setResult] = useState<{ status: string; evidenceSubmitted?: boolean } | null>(
    null,
  );
  const [error, setError] = useState<Error | null>(null);

  const handleChargeback = useCallback(
    async (input: Parameters<typeof paymentApi.handleChargeback>[0]) => {
      setState('loading');
      setError(null);
      try {
        const data = await paymentApi.handleChargeback(input);
        setResult(data);
        setState('success');
        return data;
      } catch (err) {
        setError(err as Error);
        setState('error');
        throw err;
      }
    },
    [],
  );

  return { handleChargeback, state, result, error };
}

// ==================== RECONCILIATION HOOKS ====================

export function useReconcilePayments() {
  const [state, setState] = useState<LoadingState>('idle');
  const [result, setResult] = useState<{
    matched: number;
    unmatched: number;
    missingPayments: string[];
    duplicates: string[];
  } | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const reconcile = useCallback(async (fromDate: string, toDate: string) => {
    setState('loading');
    setError(null);
    try {
      const data = await paymentApi.reconcilePayments(fromDate, toDate);
      setResult(data);
      setState('success');
      return data;
    } catch (err) {
      setError(err as Error);
      setState('error');
      throw err;
    }
  }, []);

  return { reconcile, state, result, error };
}

// ==================== SLA HOOKS ====================

export function useSLACompliance() {
  const [state, setState] = useState<LoadingState>('idle');
  const [result, setResult] = useState<{ uptime: number; credits: number; breach: boolean } | null>(
    null,
  );
  const [error, setError] = useState<Error | null>(null);

  const validateSLA = useCallback(
    async (input: {
      totalMinutes: number;
      downtimeMinutes: number;
      monthlyFee?: number;
      targetUptime?: number;
    }) => {
      setState('loading');
      setError(null);
      try {
        const data = await paymentApi.validateSLACompliance(input);
        setResult(data);
        setState('success');
        return data;
      } catch (err) {
        setError(err as Error);
        setState('error');
        throw err;
      }
    },
    [],
  );

  return { validateSLA, state, result, error };
}

// ==================== BATCH OPERATIONS HOOK ====================

interface BatchOperation<T> {
  items: T[];
  operation: (item: T) => Promise<unknown>;
  onProgress?: (completed: number, total: number) => void;
}

export function useBatchOperations<T>() {
  const [progress, setProgress] = useState(0);
  const [state, setState] = useState<LoadingState>('idle');
  const [results, setResults] = useState<Array<{ item: T; success: boolean; error?: Error }>>([]);

  const execute = useCallback(async ({ items, operation, onProgress }: BatchOperation<T>) => {
    setState('loading');
    setProgress(0);
    const batchResults: Array<{ item: T; success: boolean; error?: Error }> = [];

    for (let i = 0; i < items.length; i++) {
      try {
        await operation(items[i]);
        batchResults.push({ item: items[i], success: true });
      } catch (err) {
        batchResults.push({ item: items[i], success: false, error: err as Error });
      }

      const newProgress = Math.round(((i + 1) / items.length) * 100);
      setProgress(newProgress);
      onProgress?.(i + 1, items.length);
    }

    setResults(batchResults);
    setState('success');
    return batchResults;
  }, []);

  return { execute, progress, state, results };
}
