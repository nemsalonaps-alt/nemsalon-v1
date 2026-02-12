import { Card, Stack, Badge } from '@nemsalon/ui';
import '../portal.css';

/**
 * LATER FEATURE: Clip Cards Page (Klippekort)
 *
 * This page is prepared but NOT implemented yet.
 *
 * When to implement:
 * - When salons offer clip card services
 * * - When you have >500 active customers using regular services
 * - When you have volume to justify the complexity
 *
 * Features to include:
 * - View clip cards
 * - Check remaining clips
 * - Purchase new clip card
 * - Clip card history
 * - Auto-renewal options
 */

interface ClipCard {
  id: string;
  salonId: string;
  salonName: string;
  serviceName: string;
  totalClips: number;
  remainingClips: number;
  expiresAt: string | null;
  purchasedAt: string;
  pricePerClip: number;
  savingsPercent: number;
}

interface ClipCardsPageProps {
  clipCards?: ClipCard[];
  loading?: boolean;
}

export function ClipCardsPage({ loading = false }: ClipCardsPageProps) {
  if (loading) {
    return (
      <div className="cp-page-container">
        <div className="cp-loading-state">
          <div className="cp-spinner" />
          <p className="cp-muted">Indlæser...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cp-page-container">
      <section className="cp-section">
        <div className="cp-section-header">
          <h2 className="cp-section-title">Klippekort</h2>
          <p className="cp-section-subtitle">Spar penge på dine yndlingsbehandlinger</p>
        </div>

        <Card className="cp-empty-state">
          <div className="cp-empty-icon">✂️</div>
          <h2 className="cp-empty-title">Klippekort kommer snart!</h2>
          <p className="cp-muted">
            Denne funktion er under udvikling. Du vil snart kunne købe klippekort og spare penge på
            dine behandlinger.
          </p>
          <Stack gap="sm" className="cp-mt-lg">
            <Badge variant="warning" size="sm">
              Kommer i Q3 2026
            </Badge>
          </Stack>
        </Card>
      </section>
    </div>
  );
}
