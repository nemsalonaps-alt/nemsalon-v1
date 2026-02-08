import type { FastifyRequest } from 'fastify';
import type { Membership } from '../modules/auth/domain/auth-domain.js';

type RequestContext = {
  userId?: string;
  salonId?: string;
  role?: Membership['role'];
};

const contextKey = Symbol('requestContext');

function getContextStore(request: FastifyRequest): RequestContext | undefined {
  const store = request as FastifyRequest & { [contextKey]?: RequestContext };
  return store[contextKey];
}

export function getRequestContext(request: FastifyRequest): RequestContext {
  return getContextStore(request) ?? {};
}

export function setRequestContext(request: FastifyRequest, updates: RequestContext): RequestContext {
  const store = request as FastifyRequest & { [contextKey]?: RequestContext };
  const current = getContextStore(request) ?? {};
  store[contextKey] = { ...current, ...updates };
  return store[contextKey]!;
}
