import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authService } from '../../auth/service/auth-service.js';
import { httpError } from '../../../server/http-error.js';
import { createAuditLog } from '../../audit/repo/audit-repo.js';
import * as platformRepo from '../repo/platform-repo.js';
import * as metricsRepo from '../repo/metrics-repo.js';
import * as healthService from '../services/health-service.js';

const listOptionsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export function registerPlatformAdminRoutes(app: FastifyInstance) {
  // Health check endpoint - returns real-time system health
  app.get('/v1/platform/health', async (request, reply) => {
    const user = await authService.requirePlatformAdmin(request);
    const health = await healthService.getPlatformHealth();

    await createAuditLog({
      actorUserId: user.id,
      action: 'platform.health.read',
      entityType: 'platform_health',
      metadata: { route: '/v1/platform/health' },
    });

    reply.code(200).send(health);
  });

  // Business metrics endpoint
  app.get('/v1/platform/metrics', async (request, reply) => {
    const query = z
      .object({
        period: z.enum(['24h', '7d', '30d']).default('24h'),
      })
      .parse(request.query);

    const user = await authService.requirePlatformAdmin(request);
    const metrics = await metricsRepo.getBusinessMetrics(query.period);

    await createAuditLog({
      actorUserId: user.id,
      action: 'platform.metrics.read',
      entityType: 'platform_metrics',
      metadata: { route: '/v1/platform/metrics', period: query.period },
    });

    reply.code(200).send(metrics);
  });

  // Risk radar - salons at risk
  app.get('/v1/platform/risk-radar', async (request, reply) => {
    const user = await authService.requirePlatformAdmin(request);
    const riskData = await metricsRepo.getRiskRadar();

    await createAuditLog({
      actorUserId: user.id,
      action: 'platform.risk.read',
      entityType: 'risk_radar',
      metadata: { route: '/v1/platform/risk-radar' },
    });

    reply.code(200).send(riskData);
  });

  // Universal search endpoint
  app.get('/v1/platform/search', async (request, reply) => {
    const query = z
      .object({
        q: z.string().min(1).max(100),
        limit: z.coerce.number().int().min(1).max(50).optional().default(20),
        types: z.string().optional(), // comma-separated list
      })
      .parse(request.query);

    const user = await authService.requirePlatformAdmin(request);
    const searchTypes = query.types?.split(',').filter(Boolean) as string[] | undefined;

    const results = await platformRepo.universalSearch({
      query: query.q,
      limit: query.limit,
      types: searchTypes,
    });

    await createAuditLog({
      actorUserId: user.id,
      action: 'platform.search',
      entityType: 'search',
      metadata: {
        route: '/v1/platform/search',
        query: query.q,
        resultCount: results.length,
      },
    });

    reply.code(200).send({ results, total: results.length });
  });

  // List incidents
  app.get('/v1/platform/incidents', async (request, reply) => {
    const query = z
      .object({
        status: z.enum(['open', 'investigating', 'monitoring', 'resolved']).optional(),
        severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
      })
      .merge(listOptionsSchema)
      .parse(request.query);

    const user = await authService.requirePlatformAdmin(request);
    const incidents = await platformRepo.listIncidents(query);

    await createAuditLog({
      actorUserId: user.id,
      action: 'platform.incidents.list',
      entityType: 'incident',
      metadata: { route: '/v1/platform/incidents', filters: query },
    });

    reply.code(200).send({ data: incidents });
  });

  // Create incident
  app.post('/v1/platform/incidents', async (request, reply) => {
    const body = z
      .object({
        title: z.string().min(1).max(200),
        description: z.string().max(2000).optional(),
        severity: z.enum(['critical', 'high', 'medium', 'low']),
        affectedSalonIds: z.array(z.string().uuid()).optional(),
      })
      .parse(request.body);

    const user = await authService.requirePlatformAdmin(request);
    const incident = await platformRepo.createIncident({
      ...body,
      createdBy: user.id,
    });

    await createAuditLog({
      actorUserId: user.id,
      action: 'platform.incidents.create',
      entityType: 'incident',
      entityId: incident.id,
      metadata: { route: '/v1/platform/incidents', incident },
    });

    reply.code(201).send(incident);
  });

  // Update incident
  app.patch('/v1/platform/incidents/:incidentId', async (request, reply) => {
    const params = z
      .object({
        incidentId: z.string().uuid(),
      })
      .parse(request.params);

    const body = z
      .object({
        status: z.enum(['open', 'investigating', 'monitoring', 'resolved']).optional(),
        severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().max(2000).optional(),
        rootCause: z.string().max(2000).optional(),
        resolution: z.string().max(2000).optional(),
      })
      .parse(request.body);

    const user = await authService.requirePlatformAdmin(request);
    const incident = await platformRepo.updateIncident(params.incidentId, {
      ...body,
      resolvedBy: body.status === 'resolved' ? user.id : undefined,
    });

    await createAuditLog({
      actorUserId: user.id,
      action: 'platform.incidents.update',
      entityType: 'incident',
      entityId: params.incidentId,
      metadata: { route: '/v1/platform/incidents/:incidentId', updates: body },
    });

    reply.code(200).send(incident);
  });

  // Get incident timeline
  app.get('/v1/platform/incidents/:incidentId/timeline', async (request, reply) => {
    const params = z
      .object({
        incidentId: z.string().uuid(),
      })
      .parse(request.params);

    await authService.requirePlatformAdmin(request);
    const timeline = await platformRepo.getIncidentTimeline(params.incidentId);

    reply.code(200).send({ data: timeline });
  });

  // Add timeline event
  app.post('/v1/platform/incidents/:incidentId/timeline', async (request, reply) => {
    const params = z
      .object({
        incidentId: z.string().uuid(),
      })
      .parse(request.params);

    const body = z
      .object({
        eventType: z.string().min(1).max(50),
        message: z.string().min(1).max(1000),
        metadata: z.record(z.unknown()).optional(),
      })
      .parse(request.body);

    const user = await authService.requirePlatformAdmin(request);
    const event = await platformRepo.addIncidentTimelineEvent({
      incidentId: params.incidentId,
      ...body,
      createdBy: user.id,
    });

    await createAuditLog({
      actorUserId: user.id,
      action: 'platform.incidents.timeline.add',
      entityType: 'incident_timeline',
      entityId: params.incidentId,
      metadata: { route: '/v1/platform/incidents/:incidentId/timeline', event },
    });

    reply.code(201).send(event);
  });

  // Queue status
  app.get('/v1/platform/queues', async (request, reply) => {
    const user = await authService.requirePlatformAdmin(request);
    const queues = await metricsRepo.getQueueStats();

    await createAuditLog({
      actorUserId: user.id,
      action: 'platform.queues.read',
      entityType: 'queue_stats',
      metadata: { route: '/v1/platform/queues' },
    });

    reply.code(200).send({ queues });
  });

  // Feature flags
  app.get('/v1/platform/feature-flags', async (request, reply) => {
    await authService.requirePlatformAdmin(request);
    const flags = await platformRepo.listFeatureFlags();

    reply.code(200).send({ data: flags });
  });

  app.get('/v1/platform/feature-flags/:key', async (request, reply) => {
    const params = z
      .object({
        key: z.string().min(1).max(100),
      })
      .parse(request.params);

    await authService.requirePlatformAdmin(request);
    const flag = await platformRepo.getFeatureFlag(params.key);

    if (!flag) {
      throw httpError(404, 'FEATURE_FLAG_NOT_FOUND', 'Feature flag not found');
    }

    reply.code(200).send(flag);
  });

  app.post('/v1/platform/feature-flags', async (request, reply) => {
    const body = z
      .object({
        key: z
          .string()
          .min(1)
          .max(100)
          .regex(/^[a-z0-9-]+$/, 'Key must be lowercase alphanumeric with hyphens'),
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        enabled: z.boolean().default(false),
        rolloutType: z.enum(['global', 'percentage', 'targeted']),
        rolloutPercentage: z.number().int().min(0).max(100).optional(),
        targetedSalonIds: z.array(z.string().uuid()).optional(),
      })
      .parse(request.body);

    const user = await authService.requirePlatformAdmin(request);
    const flag = await platformRepo.createFeatureFlag({
      ...body,
      createdBy: user.id,
    });

    await createAuditLog({
      actorUserId: user.id,
      action: 'platform.feature_flags.create',
      entityType: 'feature_flag',
      entityId: flag.id,
      metadata: { route: '/v1/platform/feature-flags', flag },
    });

    reply.code(201).send(flag);
  });

  app.patch('/v1/platform/feature-flags/:key', async (request, reply) => {
    const params = z
      .object({
        key: z.string().min(1).max(100),
      })
      .parse(request.params);

    const body = z
      .object({
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        enabled: z.boolean().optional(),
        rolloutType: z.enum(['global', 'percentage', 'targeted']).optional(),
        rolloutPercentage: z.number().int().min(0).max(100).optional(),
        targetedSalonIds: z.array(z.string().uuid()).optional(),
      })
      .parse(request.body);

    const user = await authService.requirePlatformAdmin(request);
    const flag = await platformRepo.updateFeatureFlag(params.key, body);

    await createAuditLog({
      actorUserId: user.id,
      action: 'platform.feature_flags.update',
      entityType: 'feature_flag',
      metadata: { route: '/v1/platform/feature-flags/:key', key: params.key, updates: body },
    });

    reply.code(200).send(flag);
  });

  // Support actions
  app.post('/v1/platform/support/reset-password', async (request, reply) => {
    const body = z
      .object({
        userId: z.string().uuid(),
        reason: z.string().min(1).max(500),
      })
      .parse(request.body);

    const user = await authService.requirePlatformAdmin(request);
    // Implementation would call auth service to reset password

    await createAuditLog({
      actorUserId: user.id,
      action: 'platform.support.reset_password',
      entityType: 'user',
      entityId: body.userId,
      metadata: { route: '/v1/platform/support/reset-password', reason: body.reason },
    });

    reply.code(200).send({ success: true });
  });

  app.post('/v1/platform/support/unlock-account', async (request, reply) => {
    const body = z
      .object({
        userId: z.string().uuid(),
        reason: z.string().min(1).max(500),
      })
      .parse(request.body);

    const user = await authService.requirePlatformAdmin(request);

    await createAuditLog({
      actorUserId: user.id,
      action: 'platform.support.unlock_account',
      entityType: 'user',
      entityId: body.userId,
      metadata: { route: '/v1/platform/support/unlock-account', reason: body.reason },
    });

    reply.code(200).send({ success: true });
  });

  // Revenue Analytics
  app.get('/v1/platform/revenue/analytics', async (request, reply) => {
    const query = z
      .object({
        period: z.enum(['30d', '90d', '1y']).default('30d'),
      })
      .parse(request.query);

    const user = await authService.requirePlatformAdmin(request);
    const analytics = await metricsRepo.getRevenueAnalytics(query.period);

    await createAuditLog({
      actorUserId: user.id,
      action: 'platform.revenue.analytics.read',
      entityType: 'revenue_analytics',
      metadata: { route: '/v1/platform/revenue/analytics', period: query.period },
    });

    reply.code(200).send(analytics);
  });

  // Cohort Analysis
  app.get('/v1/platform/revenue/cohorts', async (request, reply) => {
    const user = await authService.requirePlatformAdmin(request);
    const cohorts = await metricsRepo.getCohortAnalysis();

    await createAuditLog({
      actorUserId: user.id,
      action: 'platform.revenue.cohorts.read',
      entityType: 'cohort_analysis',
      metadata: { route: '/v1/platform/revenue/cohorts' },
    });

    reply.code(200).send({ data: cohorts });
  });

  // Subscription Plans
  app.get('/v1/platform/subscription-plans', async (request, reply) => {
    await authService.requirePlatformAdmin(request);
    const plans = await platformRepo.listSubscriptionPlans();

    reply.code(200).send({ data: plans });
  });

  // Dunning Status
  app.get('/v1/platform/dunning', async (request, reply) => {
    await authService.requirePlatformAdmin(request);
    const dunning = await platformRepo.getDunningStatus();

    reply.code(200).send(dunning);
  });

  // Security Anomalies
  app.get('/v1/platform/security/anomalies', async (request, reply) => {
    const query = z
      .object({
        status: z.enum(['open', 'investigating', 'resolved', 'false_positive']).optional(),
        severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      })
      .merge(listOptionsSchema)
      .parse(request.query);

    await authService.requirePlatformAdmin(request);
    const anomalies = await platformRepo.listSecurityAnomalies(query);

    reply.code(200).send({ data: anomalies });
  });

  app.post('/v1/platform/security/anomalies', async (request, reply) => {
    const body = z
      .object({
        anomalyType: z.enum(['ip_anomaly', 'time_anomaly', 'brute_force', 'unusual_pattern']),
        userId: z.string().uuid().optional(),
        salonId: z.string().uuid().optional(),
        ipAddress: z.string().optional(),
        userAgent: z.string().optional(),
        description: z.string(),
        severity: z.enum(['low', 'medium', 'high', 'critical']),
      })
      .parse(request.body);

    const user = await authService.requirePlatformAdmin(request);
    const anomaly = await platformRepo.createSecurityAnomaly({
      ...body,
      createdBy: user.id,
    });

    await createAuditLog({
      actorUserId: user.id,
      action: 'platform.security.anomalies.create',
      entityType: 'security_anomaly',
      entityId: anomaly.id,
      metadata: { route: '/v1/platform/security/anomalies', anomaly },
    });

    reply.code(201).send(anomaly);
  });

  app.patch('/v1/platform/security/anomalies/:anomalyId', async (request, reply) => {
    const params = z
      .object({
        anomalyId: z.string().uuid(),
      })
      .parse(request.params);

    const body = z
      .object({
        status: z.enum(['open', 'investigating', 'resolved', 'false_positive']).optional(),
      })
      .parse(request.body);

    const user = await authService.requirePlatformAdmin(request);
    const anomaly = await platformRepo.updateSecurityAnomaly(params.anomalyId, {
      ...body,
      investigatedBy: user.id,
    });

    await createAuditLog({
      actorUserId: user.id,
      action: 'platform.security.anomalies.update',
      entityType: 'security_anomaly',
      entityId: params.anomalyId,
      metadata: { route: '/v1/platform/security/anomalies/:anomalyId', updates: body },
    });

    reply.code(200).send(anomaly);
  });

  // Data exports
  app.get('/v1/platform/exports', async (request, reply) => {
    const user = await authService.requirePlatformAdmin(request);
    const exports = await platformRepo.listDataExports(user.id);

    reply.code(200).send({ data: exports });
  });

  app.post('/v1/platform/exports', async (request, reply) => {
    const body = z
      .object({
        exportType: z.enum(['full_salon', 'customer_data', 'audit_logs']),
        salonId: z.string().uuid(),
        format: z.enum(['json', 'csv']),
      })
      .parse(request.body);

    const user = await authService.requirePlatformAdmin(request);
    const export_ = await platformRepo.createDataExport({
      ...body,
      requestedBy: user.id,
    });

    await createAuditLog({
      actorUserId: user.id,
      action: 'platform.exports.create',
      entityType: 'data_export',
      entityId: export_.id,
      metadata: {
        route: '/v1/platform/exports',
        exportType: body.exportType,
        salonId: body.salonId,
      },
    });

    reply.code(201).send(export_);
  });
}
