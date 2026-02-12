// Platform Admin Elite - Main Exports

export { PlatformAdminElite } from './PlatformAdminElite';

// Components
export { MissionControl } from './components/MissionControl';
export { HealthStrip } from './components/MissionControl/HealthStrip';
export { BusinessMetricsGrid } from './components/MissionControl/BusinessMetricsGrid';
export { RiskRadar } from './components/MissionControl/RiskRadar';
export { GlobalSearch } from './components/GlobalSearch';
export { SalonCommandCenter } from './components/SalonCommandCenter';
export { IncidentCenter } from './components/IncidentCenter';
export { SystemOperations } from './components/SystemOperations';
export { RevenueControl } from './components/RevenueControl';
export { SupportTools } from './components/SupportTools';
export { SecurityCenter } from './components/SecurityCenter';
export { DataExportCenter } from './components/DataExport';

// Hooks
export { usePlatformHealth, useBusinessMetrics, useRiskRadar } from './hooks/usePlatformHealth';

// API
export * as platformApi from './api/platform-api';

// Types
export type {
  HealthCheck,
  PlatformHealth,
  BusinessMetrics,
  RiskSalon,
  RiskRadarData,
  SearchResult,
  SearchResultType,
  Incident,
  IncidentTimelineEvent,
  FeatureFlag,
  QueueStats,
  DataExport,
  TabKey,
} from './types/platform-types';
