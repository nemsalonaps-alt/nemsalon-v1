import type { FastifyReply, FastifyRequest } from 'fastify';

const isKey = (value: string) => /^[a-z][a-z0-9_.-]*$/.test(value);

export function notImplemented(
  reply: FastifyReply,
  request: FastifyRequest,
  message = 'error.not_implemented'
) {
  const messageKey = isKey(message) ? message : 'error.not_implemented';
  return reply.code(501).send({
    code: 'NOT_IMPLEMENTED',
    message: messageKey,
    errorKey: messageKey,
    messageKey,
    ...(isKey(message) ? {} : { details: { message } }),
    traceId: request.id
  });
}
