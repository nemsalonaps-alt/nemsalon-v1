import type { FastifyInstance } from 'fastify';
import { registerAuthRoutes } from '../modules/auth/api/routes.js';
import { registerImpersonationRoutes } from '../modules/auth/api/impersonation-routes.js';
import {
  registerCustomerPortalRoutes,
  registerCustomerPortalV2Routes,
} from '../modules/customer-portal/api/routes.js';
import { registerPublicRoutes } from '../modules/public/api/routes.js';
import { registerUsersRoutes } from '../modules/users/api/routes.js';
import { registerContentRoutes } from '../modules/content/api/routes.js';
import { registerPaymentsRoutes } from '../modules/payments/api/routes.js';
import { registerNotificationsRoutes } from '../modules/notifications/api/routes.js';
import { registerAdminRoutes } from '../modules/admin/api/routes.js';
import { registerAvailabilityRoutes } from '../modules/availability/api/routes.js';
import { registerPlatformRoutes } from '../modules/platform/api/routes.js';
import { registerEventsRoutes } from '../modules/events/api/routes.js';
import { registerDevRoutes } from '../modules/dev/api/routes.js';
import { env } from '../config/env.js';

export function registerRoutes(app: FastifyInstance) {
  registerPublicRoutes(app);
  registerAuthRoutes(app);
  registerImpersonationRoutes(app);
  registerCustomerPortalRoutes(app);
  registerCustomerPortalV2Routes(app);
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
  registerDevRoutes(app);
}
