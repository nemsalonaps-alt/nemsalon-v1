import type { FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    cookies?: Record<string, string>;
  }
}
