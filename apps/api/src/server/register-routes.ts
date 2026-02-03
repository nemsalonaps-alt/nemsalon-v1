import type { FastifyInstance } from 'fastify';
import { registerAuthRoutes } from '../modules/auth/api/routes.js';
import { registerUsersRoutes } from '../modules/users/api/routes.js';
import { registerContentRoutes } from '../modules/content/api/routes.js';
import { registerPaymentsRoutes } from '../modules/payments/api/routes.js';
import { registerNotificationsRoutes } from '../modules/notifications/api/routes.js';
import { registerAdminRoutes } from '../modules/admin/api/routes.js';
import { registerAvailabilityRoutes } from '../modules/availability/api/routes.js';

export function registerRoutes(app: FastifyInstance) {
  registerAuthRoutes(app);
  registerUsersRoutes(app);
  registerContentRoutes(app);
  registerAvailabilityRoutes(app);
  registerPaymentsRoutes(app);
  registerNotificationsRoutes(app);
  registerAdminRoutes(app);
}
