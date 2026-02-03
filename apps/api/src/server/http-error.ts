export class HttpError extends Error {
  statusCode: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(statusCode: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function httpError(
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, unknown>
) {
  return new HttpError(statusCode, code, message, details);
}
