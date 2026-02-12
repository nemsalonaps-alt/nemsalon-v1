import { ZodError } from 'zod';

export type ErrorResponse = {
  code: string;
  message: string;
  errorKey: string;
  messageKey: string;
  details?: Record<string, unknown>;
  traceId: string;
};

export function toErrorResponse(error: unknown, traceId: string) {
  if (error instanceof ZodError) {
    return {
      statusCode: 400,
      body: {
        code: 'VALIDATION_ERROR',
        message: 'error.validation_failed',
        errorKey: 'error.validation_failed',
        messageKey: 'error.validation_failed',
        details: error.flatten(),
        traceId
      }
    };
  }

  const isKey = (value: string) => /^[a-z][a-z0-9_.-]*$/.test(value);

  const err = error as {
    statusCode?: number;
    code?: string;
    message?: string;
    details?: unknown;
  };
  const statusCode = typeof err?.statusCode === 'number' ? err.statusCode : 500;
  const code =
    typeof err?.code === 'string' ? err.code : statusCode >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR';
  const rawMessage = typeof err?.message === 'string' ? err.message : '';
  const messageKey = isKey(rawMessage) ? rawMessage : `error.${code.toLowerCase()}`;
  const message = messageKey;

  const body: ErrorResponse = {
    code,
    message,
    errorKey: messageKey,
    messageKey,
    traceId
  };

  if (err?.details && typeof err.details === 'object' && err.details !== null) {
    body.details = err.details as Record<string, unknown>;
  }

  return { statusCode, body };
}
