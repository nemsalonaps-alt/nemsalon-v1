import { Card, Stack } from '@nemsalon/ui';
import { LogoutButton } from '../../auth/components/UnifiedLogin';
import type { StaffProfile } from '../../console/types';

interface ProfileSectionProps {
  staffProfile: StaffProfile | null;
  copy: {
    title: string;
    nameLabel: string;
    emailLabel: string;
    phoneLabel: string;
    roleLabel: string;
    salonLabel: string;
    logoutCta: string;
  };
}

export function ProfileSection({ staffProfile, copy }: ProfileSectionProps) {
  return (
    <Stack gap="lg">
      <section className="sc-section">
        <h2 className="sc-section-title">{copy.title}</h2>

        <Card>
          <Stack gap="md">
            <div className="sc-profile-header">
              <div className="sc-profile-avatar">
                {staffProfile?.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="sc-profile-name">{staffProfile?.name || copy.nameLabel}</div>
            </div>

            <div className="sc-profile-details">
              <div className="sc-detail-row">
                <span className="sc-detail-label">{copy.emailLabel}:</span>
                <span>{staffProfile?.email || '-'}</span>
              </div>
              <div className="sc-detail-row">
                <span className="sc-detail-label">{copy.phoneLabel}:</span>
                <span>{staffProfile?.phone || '-'}</span>
              </div>
              <div className="sc-detail-row">
                <span className="sc-detail-label">{copy.roleLabel}:</span>
                <span>{staffProfile?.role || '-'}</span>
              </div>
            </div>
          </Stack>
        </Card>

        <div className="sc-logout-section">
          <LogoutButton />
        </div>
      </section>
    </Stack>
  );
}
