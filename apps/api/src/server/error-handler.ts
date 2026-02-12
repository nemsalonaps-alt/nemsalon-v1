import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { toErrorResponse } from './errors.js';

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, request: FastifyRequest, reply: FastifyReply) => {
    const { statusCode, body } = toErrorResponse(error, request.id);
    (request as { errorKey?: string }).errorKey = body.errorKey;
    
    // Log the actual error for debugging
    if (statusCode >= 500) {
      // eslint-disable-next-line no-console
      console.error('[ERROR]', {
        route: request.routeOptions?.url ?? request.raw.url,
        method: request.method,
        statusCode,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: (error as { code?: string }).code
        } : error,
        requestId: request.id
      });
    }
    
    reply.status(statusCode).send(body);
  });
}
