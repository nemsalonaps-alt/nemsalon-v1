import { useState, useEffect, useCallback } from 'react';
import { Card, Stack, Checkbox } from '@nemsalon/ui';
import { ErrorState } from '@nemsalon/ui';
import { getCopy, getStoredLocale, resolveLocale } from '../../../i18n';
import {
  getNotificationSettings,
  updateNotificationSettings,
  listNotificationHistory,
  type NotificationSettings,
  type NotificationHistory,
} from '../api';
import { SkeletonSettings } from '../components/Skeletons';
import '../portal.css';

const t = getCopy();

const PURPOSE_LABELS: Record<string, string> = {
  confirmation: 'Bekræftelse',
  reminder: 'Påmindelse',
  cancellation: 'Aflysning',
  update: 'Ændring',
};

function getPurposeLabel(purpose: string): string {
  return PURPOSE_LABELS[purpose] ?? purpose;
}

function getTypeIcon(type: string): string {
  return type === 'sms' ? '📱' : '✉️';
}

export function NotificationsPage() {
  const resolvedLocale = resolveLocale(getStoredLocale());
  const locale = resolvedLocale === 'da' ? 'da-DK' : 'en-US';

  const [settings, setSettings] = useState<NotificationSettings>({
    smsEnabled: true,
    emailEnabled: true,
    reminder24h: true,
    reminder1h: false,
    marketingEmail: false,
    marketingSms: false,
    dataProcessing: true,
  });
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);

      const [settingsResult, historyResult] = await Promise.all([
        getNotificationSettings(),
        listNotificationHistory(),
      ]);

      if (cancelled) return;

      if (!settingsResult.ok) {
        setError(settingsResult.error);
        setLoading(false);
        return;
      }

      setSettings(settingsResult.data);

      if (historyResult.ok) {
        setHistory(historyResult.data);
      } else {
        // Log history error but don't block the UI
        console.warn('Failed to load notification history:', historyResult.error);
      }

      setLoading(false);
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggle = useCallback(
    async (key: keyof NotificationSettings) => {
      const newSettings = { ...settings, [key]: !settings[key] };
      setSettings(newSettings);
      setSaving(true);
      setSaveError(null);

      const result = await updateNotificationSettings(newSettings);

      if (!result.ok) {
        setSaveError(result.error);
        // Revert on error
        setSettings(settings);
      }

      setSaving(false);
    },
    [settings],
  );

  const handleRetry = useCallback(() => {
    setError(null);
    setLoading(true);

    Promise.all([getNotificationSettings(), listNotificationHistory()]).then(
      ([settingsResult, historyResult]) => {
        if (!settingsResult.ok) {
          setError(settingsResult.error);
        } else {
          setSettings(settingsResult.data);
          if (historyResult.ok) {
            setHistory(historyResult.data);
          }
        }
        setLoading(false);
      },
    );
  }, []);

  if (loading) {
    return (
      <div className="cp-page-container">
        <section className="cp-section">
          <div className="cp-section-header">
            <h2 className="cp-section-title">
              {t.customerPortal.notifications?.title ?? 'Notifikationer'}
            </h2>
            <p className="cp-section-subtitle">
              {t.customerPortal.notifications?.subtitle ?? 'Styr hvordan vi kontakter dig'}
            </p>
          </div>
          <SkeletonSettings />
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cp-page-container">
        <ErrorState
          title={t.customerPortal.notifications?.errorTitle ?? 'Kunne ikke indlæse indstillinger'}
          message={error}
          action={<button onClick={handleRetry}>{t.customerPortal.retry}</button>}
        />
      </div>
    );
  }

  return (
    <div className="cp-page-container">
      <section className="cp-section">
        <div className="cp-section-header">
          <h2 className="cp-section-title">
            {t.customerPortal.notifications?.title ?? 'Notifikationer'}
          </h2>
          <p className="cp-section-subtitle">
            {t.customerPortal.notifications?.subtitle ?? 'Styr hvordan vi kontakter dig'}
          </p>
          {saving && (
            <span className="cp-saving-indicator">{t.customerPortal.saving ?? 'Gemmer...'}</span>
          )}
        </div>

        {saveError && (
          <ErrorState
            title={t.customerPortal.notifications?.saveErrorTitle ?? 'Kunne ikke gemme'}
            message={saveError}
            className="cp-mb-md"
          />
        )}

        <Stack gap="lg">
          {/* Channel Toggles */}
          <Card>
            <h3 className="cp-form-section-title">
              {t.customerPortal.notifications?.channelsTitle ?? 'Kommunikationskanaler'}
            </h3>
            <Stack gap="md">
              <Checkbox
                checked={settings.smsEnabled}
                onChange={() => void handleToggle('smsEnabled')}
                label={
                  <div className="cp-toggle-info">
                    <div className="cp-toggle-title">
                      📱 {t.customerPortal.notifications?.smsLabel ?? 'SMS'}
                    </div>
                    <div className="cp-toggle-description">
                      {t.customerPortal.notifications?.smsDesc ??
                        'Beskeder direkte til din telefon'}
                    </div>
                  </div>
                }
              />

              <Checkbox
                checked={settings.emailEnabled}
                onChange={() => void handleToggle('emailEnabled')}
                label={
                  <div className="cp-toggle-info">
                    <div className="cp-toggle-title">
                      ✉️ {t.customerPortal.notifications?.emailLabel ?? 'Email'}
                    </div>
                    <div className="cp-toggle-description">
                      {t.customerPortal.notifications?.emailDesc ?? 'Beskeder til din indbakke'}
                    </div>
                  </div>
                }
              />
            </Stack>
          </Card>

          {/* Reminder Toggles */}
          <Card>
            <h3 className="cp-form-section-title">
              {t.customerPortal.notifications?.remindersTitle ?? 'Påmindelser'}
            </h3>
            <Stack gap="md">
              <Checkbox
                checked={settings.reminder24h}
                onChange={() => void handleToggle('reminder24h')}
                disabled={!settings.smsEnabled && !settings.emailEnabled}
                label={
                  <div className="cp-toggle-info">
                    <div className="cp-toggle-title">
                      {t.customerPortal.notifications?.reminder24hTitle ?? '24 timer før'}
                    </div>
                    <div className="cp-toggle-description">
                      {t.customerPortal.notifications?.reminder24hDesc ??
                        'Få en påmindelse dagen før din tid'}
                    </div>
                  </div>
                }
              />

              <Checkbox
                checked={settings.reminder1h}
                onChange={() => void handleToggle('reminder1h')}
                disabled={!settings.smsEnabled && !settings.emailEnabled}
                label={
                  <div className="cp-toggle-info">
                    <div className="cp-toggle-title">
                      {t.customerPortal.notifications?.reminder1hTitle ?? '1 time før'}
                    </div>
                    <div className="cp-toggle-description">
                      {t.customerPortal.notifications?.reminder1hDesc ??
                        'Få en sidste påmindelse inden din tid'}
                    </div>
                  </div>
                }
              />
            </Stack>
          </Card>

          {/* Notification History */}
          <Card>
            <h3 className="cp-form-section-title">
              {t.customerPortal.notifications?.historyTitle ?? 'Seneste beskeder'}
            </h3>
            {history.length === 0 ? (
              <p className="cp-muted">
                {t.customerPortal.notifications?.noHistory ?? 'Ingen beskeder endnu'}
              </p>
            ) : (
              <Stack gap="sm">
                {history.map((item) => (
                  <div key={item.id} className="cp-history-row">
                    <div className="cp-history-icon">{getTypeIcon(item.type)}</div>
                    <div className="cp-history-content">
                      <div className="cp-history-purpose">{getPurposeLabel(item.purpose)}</div>
                      <div className="cp-history-time">
                        {new Date(item.sentAt).toLocaleString(locale, {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <div className={`cp-history-status cp-history-status-${item.status}`}>
                      {item.status === 'delivered'
                        ? 'Leveret'
                        : item.status === 'sent'
                          ? 'Sendt'
                          : 'Fejl'}
                    </div>
                  </div>
                ))}
              </Stack>
            )}
          </Card>
        </Stack>
      </section>
    </div>
  );
}
