import { useState } from 'react';
import { Card, Button, Stack, Select, ConfirmDialog } from '@nemsalon/ui';
import { getCopy, getStoredLocale, resolveLocale, setStoredLocale } from '../../../i18n';
import { signOut } from '../../../lib/auth';
import '../portal.css';

const t = getCopy();

interface SettingsPageProps {
  onDeleteAccount?: () => Promise<void>;
}

export function SettingsPage({ onDeleteAccount }: SettingsPageProps) {
  const resolvedLocale = resolveLocale(getStoredLocale());
  const [locale, setLocale] = useState(resolvedLocale);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleLocaleChange = (newLocale: string) => {
    setLocale(newLocale as 'da' | 'en');
    setStoredLocale(newLocale as 'da' | 'en');
    window.location.reload();
  };

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/login';
  };

  const handleDeleteAccount = async () => {
    if (!onDeleteAccount) return;
    setIsDeleting(true);
    try {
      await onDeleteAccount();
      window.location.href = '/login';
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="cp-page-container">
      <section className="cp-section">
        <div className="cp-section-header">
          <h2 className="cp-section-title">Indstillinger</h2>
          <p className="cp-section-subtitle">Sprog, sikkerhed og konto</p>
        </div>

        <Stack gap="lg">
          {/* Language */}
          <Card>
            <h3 className="cp-form-section-title">Sprog</h3>
            <Select
              value={locale}
              onChange={(e) => handleLocaleChange(e.target.value)}
              options={[
                { value: 'da', label: '🇩🇰 Dansk' },
                { value: 'en', label: '🇬🇧 English' },
              ]}
              fullWidth
            />
          </Card>

          {/* Security */}
          <Card>
            <h3 className="cp-form-section-title">Sikkerhed</h3>
            <Stack gap="md">
              <Button
                variant="secondary"
                onClick={() => (window.location.href = '/change-password')}
              >
                🔒 Skift adgangskode
              </Button>
            </Stack>
          </Card>

          {/* Logout */}
          <Card>
            <h3 className="cp-form-section-title">Session</h3>
            <Button variant="secondary" onClick={handleLogout}>
              {t.customerPortal.logout}
            </Button>
          </Card>

          {/* Danger Zone */}
          <Card className="cp-danger-zone">
            <h3 className="cp-form-section-title cp-danger-title">Farezone</h3>
            <p className="cp-muted cp-mb-md">
              Når du sletter din konto, fjernes alle dine personlige data permanent. Dette kan ikke
              fortrydes.
            </p>
            <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
              🗑 Slet min konto
            </Button>
          </Card>
        </Stack>
      </section>

      {/* Delete Account Confirmation */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Slet konto"
        body="Er du sikker på, at du vil slette din konto? Alle dine data vil blive fjernet permanent. Dette kan ikke fortrydes."
        confirmLabel={isDeleting ? 'Sletter...' : 'Ja, slet min konto'}
        cancelLabel="Fortryd"
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
