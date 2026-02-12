import { useState } from 'react';
import { Gate } from '../onboarding/pages/Gate';
import { onAuthStateChange, signOut } from '../../lib/auth';
import { fetchMe } from '../console/api';
import type { AuthMeResponse } from '../console/types';
import type { GateState } from '../onboarding/types';
import { Card, Stack, Button, Tabs } from '@nemsalon/ui';
import { MissionControl } from './components/MissionControl';
import { GlobalSearch } from './components/GlobalSearch';
import { SalonCommandCenter } from './components/SalonCommandCenter';
import { IncidentCenter } from './components/IncidentCenter';
import { SystemOperations } from './components/SystemOperations';
import { RevenueControl } from './components/RevenueControl';
import { SupportTools } from './components/SupportTools';
import { SecurityCenter } from './components/SecurityCenter';
import { DataExportCenter } from './components/DataExport';
import { useEffect } from 'react';

type PlatformGateState = GateState | 'ready';

interface PlatformAdminEliteProps {
  initialMe?: AuthMeResponse | null;
  skipGate?: boolean;
}

const tabs = [
  { key: 'mission-control', label: '🎯 Mission Control' },
  { key: 'search', label: '🔍 Global Search' },
  { key: 'salons', label: '🏢 Salons' },
  { key: 'incidents', label: '🚨 Incidents' },
  { key: 'system-ops', label: '⚙️ System Ops' },
  { key: 'revenue', label: '💰 Revenue' },
  { key: 'support', label: '🛠️ Support' },
  { key: 'security', label: '🔒 Security' },
  { key: 'data', label: '📊 Data' },
] as const;

export function PlatformAdminElite({
  initialMe = null,
  skipGate = false,
}: PlatformAdminEliteProps) {
  const [gateState, setGateState] = useState<PlatformGateState>(skipGate ? 'ready' : 'checking');
  const [me, setMe] = useState<AuthMeResponse | null>(initialMe);
  const [activeTab, setActiveTab] = useState<string>('mission-control');
  const [hydrated, setHydrated] = useState(false);
  const [selectedSalonId, setSelectedSalonId] = useState<string | null>(null);

  const handleGateRetry = () => {
    setGateState('recovering');
  };

  useEffect(() => {
    if (gateState !== 'recovering') return;
    const timer = setTimeout(() => setGateState('checking'), 100);
    return () => clearTimeout(timer);
  }, [gateState]);

  useEffect(() => {
    if (gateState !== 'checking' || hydrated) return;
    let active = true;

    const load = async () => {
      const meResult = await fetchMe();
      if (!active) return;

      if (!meResult.ok) {
        if (meResult.status === 401 || meResult.status === 403) {
          setGateState('needs-login');
        } else {
          setGateState('error');
        }
        return;
      }

      setMe(meResult.data);
      setHydrated(true);
      setGateState('ready');
    };

    load();
    return () => {
      active = false;
    };
  }, [gateState, hydrated]);

  useEffect(() => {
    if (!skipGate || !initialMe || hydrated) return;
    setHydrated(true);
    setMe(initialMe);
    setGateState('ready');
  }, [skipGate, initialMe, hydrated]);

  useEffect(() => {
    const subscription = onAuthStateChange(() => {
      setGateState('checking');
      setHydrated(false);
    });
    return () => {
      subscription?.data.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/login';
  };

  if (gateState !== 'ready') {
    return (
      <div style={{ padding: '40px' }}>
        <Gate state={gateState} onRetry={handleGateRetry} />
      </div>
    );
  }

  return (
    <div
      className="platform-admin-elite"
      style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}
    >
      {/* Header */}
      <Card style={{ marginBottom: '24px' }}>
        <Stack direction="row" gap="md" align="center" justify="between">
          <div>
            <div
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600,
                marginBottom: '8px',
              }}
            >
              PLATFORM ADMIN ELITE
            </div>
            <h1 style={{ margin: '0 0 4px 0', fontSize: '20px' }}>NemSalon Platform</h1>
            <p style={{ margin: 0, opacity: 0.6, fontSize: '13px' }}>
              {me?.user?.email ?? 'Signed in'}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Log ud
          </Button>
        </Stack>
      </Card>

      {/* Navigation Tabs */}
      <div style={{ marginBottom: '24px' }}>
        <Tabs
          tabs={tabs.map((t) => ({ key: t.key, label: t.label }))}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'mission-control' && (
          <MissionControl
            onSalonClick={(salonId) => {
              setSelectedSalonId(salonId);
              setActiveTab('salons');
            }}
            onHealthDrillDown={(check) => {
              console.log('Health check clicked:', check);
            }}
          />
        )}

        {activeTab === 'search' && (
          <GlobalSearch
            onSalonClick={(salonId) => {
              setSelectedSalonId(salonId);
              setActiveTab('salons');
            }}
          />
        )}

        {activeTab === 'salons' && selectedSalonId ? (
          <SalonCommandCenter salonId={selectedSalonId} onBack={() => setSelectedSalonId(null)} />
        ) : activeTab === 'salons' ? (
          <Card>
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <h2>🏢 Salon Command Center</h2>
              <p style={{ opacity: 0.6, marginBottom: '20px' }}>
                Vælg en salon fra Mission Control eller brug Global Search
              </p>
              <Stack direction="row" gap="sm" justify="center">
                <Button variant="primary" onClick={() => setActiveTab('mission-control')}>
                  Gå til Mission Control
                </Button>
                <Button variant="ghost" onClick={() => setActiveTab('search')}>
                  Søg efter salon
                </Button>
              </Stack>
            </div>
          </Card>
        ) : null}

        {activeTab === 'incidents' && <IncidentCenter />}

        {activeTab === 'system-ops' && <SystemOperations />}

        {activeTab === 'revenue' && <RevenueControl />}

        {activeTab === 'support' && <SupportTools />}

        {activeTab === 'security' && <SecurityCenter />}

        {activeTab === 'data' && <DataExportCenter />}
      </div>
    </div>
  );
}
