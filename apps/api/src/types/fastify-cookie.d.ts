import '@fastify/cookie';
import type { FastifyCookieOptions } from '@fastify/cookie';

declare module 'fastify' {
  interface FastifyReply {
    setCookie(name: string, value: string, options?: FastifyCookieOptions): this;
    clearCookie(name: string, options?: FastifyCookieOptions): this;
  }
}
