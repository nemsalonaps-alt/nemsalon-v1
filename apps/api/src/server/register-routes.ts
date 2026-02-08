import type { FastifyInstance } from 'fastify';
import { registerAuthRoutes } from '../modules/auth/api/routes.js';
import { registerStaffAuthRoutes } from '../modules/staff-auth/api/routes.js';
import { registerCustomerAuthRoutes } from '../modules/customer-auth/api/routes.js';
import { registerCustomerPortalRoutes } from '../modules/customer-portal/api/routes.js';
import { registerPublicRoutes } from '../modules/public/api/routes.js';
import { registerUsersRoutes } from '../modules/users/api/routes.js';
import { registerContentRoutes } from '../modules/content/api/routes.js';
import { registerPaymentsRoutes } from '../modules/payments/api/routes.js';
import { registerNotificationsRoutes } from '../modules/notifications/api/routes.js';
import { registerAdminRoutes } from '../modules/admin/api/routes.js';
import { registerAvailabilityRoutes } from '../modules/availability/api/routes.js';
import { registerPlatformRoutes } from '../modules/platform/api/routes.js';
import { registerEventsRoutes } from '../modules/events/api/routes.js';
import { env } from '../config/env.js';

export function registerRoutes(app: FastifyInstance) {
  registerPublicRoutes(app);
  registerAuthRoutes(app);
  registerStaffAuthRoutes(app);
  registerCustomerAuthRoutes(app);
  registerCustomerPortalRoutes(app);
  registerUsersRoutes(app);
  registerContentRoutes(app);
  registerEventsRoutes(app);
  if (env.FEATURE_AVAILABILITY !== 'false') {
    registerAvailabilityRoutes(app);
  } else {
    app.log.info({ feature: 'availability' }, 'Feature disabled');
  }
  registerPaymentsRoutes(app);
  if (env.FEATURE_NOTIFICATIONS !== 'false') {
    registerNotificationsRoutes(app);
  } else {
    app.log.info({ feature: 'notifications' }, 'Feature disabled');
  }
  registerPlatformRoutes(app);
  registerAdminRoutes(app);
}
