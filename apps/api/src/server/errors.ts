import { ZodError } from 'zod';

export type ErrorResponse = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  traceId: string;
};

export function toErrorResponse(error: unknown, traceId: string) {
  if (error instanceof ZodError) {
    return {
      statusCode: 400,
      body: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed.',
        details: error.flatten(),
        traceId
      }
    };
  }

  const err = error as {
    statusCode?: number;
    code?: string;
    message?: string;
    details?: unknown;
  };
  const statusCode = typeof err?.statusCode === 'number' ? err.statusCode : 500;
  const code = typeof err?.code === 'string' ? err.code : statusCode >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR';
  const message = typeof err?.message === 'string' ? err.message : 'Unexpected error';

  const body: ErrorResponse = {
    code,
    message,
    traceId
  };

  if (err?.details && typeof err.details === 'object' && err.details !== null) {
    body.details = err.details as Record<string, unknown>;
  }

  return { statusCode, body };
}
