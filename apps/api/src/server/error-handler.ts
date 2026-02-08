import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { toErrorResponse } from './errors.js';

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, request: FastifyRequest, reply: FastifyReply) => {
    const { statusCode, body } = toErrorResponse(error, request.id);
    (request as { errorKey?: string }).errorKey = body.errorKey;
    reply.status(statusCode).send(body);
  });
}
