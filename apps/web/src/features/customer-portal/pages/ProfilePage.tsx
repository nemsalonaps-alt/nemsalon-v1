import { useState, useCallback } from 'react';
import { Card, Button, Stack, Input, Checkbox } from '@nemsalon/ui';
import { ErrorState } from '@nemsalon/ui';
import { getCopy } from '../../../i18n';
import type { CustomerProfile } from '../api';
import { SkeletonProfile } from '../components/Skeletons';
import '../portal.css';

const t = getCopy();

interface ProfilePageProps {
  profile: CustomerProfile | null;
  loading?: boolean;
  onUpdate: (data: { name: string; phone: string; consents: CustomerConsents }) => Promise<void>;
}

interface CustomerConsents {
  marketingEmail: boolean;
  marketingSms: boolean;
  appointmentReminders: boolean;
  dataProcessing: boolean;
}

// Consents are stored separately and merged with profile
interface ProfileWithConsents extends CustomerProfile {
  consents?: CustomerConsents;
}

export function ProfilePage({ profile, loading = false, onUpdate }: ProfilePageProps) {
  // Properly type the profile with consents
  const profileWithConsents = profile as ProfileWithConsents | null;

  const [formData, setFormData] = useState({
    name: profileWithConsents?.name ?? '',
    phone: profileWithConsents?.phone ?? '',
    consents: {
      marketingEmail: profileWithConsents?.consents?.marketingEmail ?? false,
      marketingSms: profileWithConsents?.consents?.marketingSms ?? false,
      appointmentReminders: profileWithConsents?.consents?.appointmentReminders ?? true,
      dataProcessing: profileWithConsents?.consents?.dataProcessing ?? true,
    },
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      await onUpdate(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : t.customerPortal.errorTitle);
    } finally {
      setIsSaving(false);
    }
  }, [formData, onUpdate]);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, name: e.target.value }));
  }, []);

  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, phone: e.target.value }));
  }, []);

  const handleConsentChange = useCallback((key: keyof CustomerConsents) => {
    setFormData((prev) => ({
      ...prev,
      consents: { ...prev.consents, [key]: !prev.consents[key] },
    }));
  }, []);

  if (loading) {
    return (
      <div className="cp-page-container">
        <section className="cp-section">
          <div className="cp-section-header">
            <h2 className="cp-section-title">{t.customerPortal.profileTitle}</h2>
            <p className="cp-section-subtitle">{t.customerPortal.profileSubtitle}</p>
          </div>
          <SkeletonProfile />
        </section>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="cp-page-container">
        <Card className="cp-empty-state">
          <div className="cp-empty-icon">👤</div>
          <h2 className="cp-empty-title">{t.customerPortal.profileNotFound}</h2>
          <p className="cp-muted">{t.customerPortal.loginToViewProfile}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="cp-page-container">
      <section className="cp-section">
        <div className="cp-section-header">
          <h2 className="cp-section-title">{t.customerPortal.profileTitle}</h2>
          <p className="cp-section-subtitle">{t.customerPortal.profileSubtitle}</p>
        </div>

        {saveError && (
          <ErrorState
            title={t.customerPortal.saveFailed}
            message={saveError}
            className="cp-mb-md"
          />
        )}

        <Card>
          <Stack gap="lg">
            {/* Personal Info */}
            <div>
              <h3 className="cp-form-section-title">{t.customerPortal.personalInfoTitle}</h3>
              <Stack gap="md">
                <Input
                  label={t.customerPortal.profileName}
                  value={formData.name}
                  onChange={handleNameChange}
                  fullWidth
                />
                <Input
                  label={t.customerPortal.profilePhone}
                  type="tel"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  fullWidth
                />
                <Input
                  label={t.customerPortal.emailLabel}
                  type="email"
                  value={profile.email ?? ''}
                  disabled
                  fullWidth
                  hint={t.customerPortal.emailCannotBeChanged}
                />
              </Stack>
            </div>

            {/* Consents */}
            <div>
              <h3 className="cp-form-section-title">{t.customerPortal.consentsTitle}</h3>
              <Stack gap="sm">
                <Checkbox
                  checked={formData.consents.appointmentReminders}
                  onChange={() => handleConsentChange('appointmentReminders')}
                  label={
                    <div className="cp-consent-text">
                      <div className="cp-consent-title">
                        {t.customerPortal.remindersConsentTitle}
                      </div>
                      <div className="cp-consent-description">
                        {t.customerPortal.remindersConsentDesc}
                      </div>
                    </div>
                  }
                />

                <Checkbox
                  checked={formData.consents.marketingEmail}
                  onChange={() => handleConsentChange('marketingEmail')}
                  label={
                    <div className="cp-consent-text">
                      <div className="cp-consent-title">{t.customerPortal.marketingEmailTitle}</div>
                      <div className="cp-consent-description">
                        {t.customerPortal.marketingEmailDesc}
                      </div>
                    </div>
                  }
                />

                <Checkbox
                  checked={formData.consents.marketingSms}
                  onChange={() => handleConsentChange('marketingSms')}
                  label={
                    <div className="cp-consent-text">
                      <div className="cp-consent-title">{t.customerPortal.marketingSmsTitle}</div>
                      <div className="cp-consent-description">
                        {t.customerPortal.marketingSmsDesc}
                      </div>
                    </div>
                  }
                />

                <Checkbox
                  checked={formData.consents.dataProcessing}
                  disabled
                  label={
                    <div className="cp-consent-text">
                      <div className="cp-consent-title">{t.customerPortal.dataProcessingTitle}</div>
                      <div className="cp-consent-description">
                        {t.customerPortal.dataProcessingDesc}{' '}
                        <a href="/privacy" target="_blank" rel="noopener noreferrer">
                          {t.customerPortal.readMore}
                        </a>
                      </div>
                    </div>
                  }
                />
              </Stack>
            </div>

            {/* Save Button */}
            <div className="cp-form-actions">
              <Button variant="primary" onClick={handleSave} isLoading={isSaving} fullWidth>
                {isSaving ? t.customerPortal.profileSaving : t.customerPortal.profileSave}
              </Button>
              {saveSuccess && <p className="cp-success-text">{t.customerPortal.profileUpdated}</p>}
            </div>
          </Stack>
        </Card>
      </section>
    </div>
  );
}
