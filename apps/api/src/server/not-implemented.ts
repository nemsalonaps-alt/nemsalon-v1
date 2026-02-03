import type { FastifyReply, FastifyRequest } from 'fastify';

export function notImplemented(reply: FastifyReply, request: FastifyRequest, message = 'Not implemented') {
  return reply.code(501).send({
    code: 'NOT_IMPLEMENTED',
    message,
    traceId: request.id
  });
}
