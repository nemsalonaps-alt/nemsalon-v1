import type { ReactNode } from 'react';
import { signOut } from '../../../lib/auth';
import { Button, Stack, NavTab, Card } from '@nemsalon/ui';
import type { AuthMeResponse } from '../types';
import type { CopyType } from '../../../i18n';
import '../console.css';

export type TabKey = 'overview' | 'calendar' | 'customers' | 'services-team' | 'money';

interface LayoutProps {
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
  salonName?: string;
  me?: AuthMeResponse | null;
  children: ReactNode;
  statusMessage?: string;
  copy: CopyType;
  showReturnToAdmin?: boolean;
  onReturnToAdmin?: () => void;
}

const tabs: TabKey[] = ['overview', 'calendar', 'customers', 'services-team', 'money'];

export function Layout({
  activeTab,
  setActiveTab,
  salonName,
  me,
  children,
  statusMessage,
  copy,
  showReturnToAdmin = false,
  onReturnToAdmin,
}: LayoutProps) {
  const c = copy?.console?.nav;
  const displayName = me?.user?.fullName || me?.user?.email || c.guest;

  return (
    <Stack gap="md" className="console-page">
      <Stack direction="row" gap="md" align="center" justify="between" className="console-header">
        <div>
          <h1 className="console-title" data-testid="owner-salon-title">
            {salonName || c.defaultTitle}
          </h1>
          <span className="console-subtitle">{c.subtitle}</span>
        </div>
        <Stack direction="row" gap="md" align="center">
          <span className="console-user">{displayName}</span>
          {showReturnToAdmin && (
            <Button variant="secondary" size="sm" onClick={() => onReturnToAdmin?.()}>
              {c.backToAdmin}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => signOut()}>
            {c.logout}
          </Button>
        </Stack>
      </Stack>

      <NavTab
        tabs={tabs.map((tab) => ({ key: tab, label: c.tabs[tab] }))}
        activeTab={activeTab}
        onChange={(key) => setActiveTab(key as TabKey)}
      />

      {statusMessage && (
        <Card variant="outlined" className="console-status-card">
          <Stack direction="row" gap="md" align="center" justify="between">
            <span>{statusMessage}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                /* clear status via parent */
              }}
            >
              {c.dismiss}
            </Button>
          </Stack>
        </Card>
      )}

      <main>{children}</main>
    </Stack>
  );
}
