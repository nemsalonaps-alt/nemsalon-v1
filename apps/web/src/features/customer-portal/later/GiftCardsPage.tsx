import { Card, Stack, Badge } from '@nemsalon/ui';
import '../portal.css';

/**
 * LATER FEATURE: Gift Cards Page
 *
 * This page is prepared but NOT implemented yet.
 *
 * When to implement:
 * - When you have >1000 active customers
 * - When salons ask for gift card functionality
 * - When you have dedicated support team
 *
 * Features to include:
 * - View purchased gift cards
 * - Check balance
 * - Purchase new gift card
 * - Send gift card to recipient
 * - Gift card history
 */

interface GiftCard {
  id: string;
  code: string;
  balance: number;
  originalAmount: number;
  currency: string;
  purchasedAt: string;
  expiresAt: string | null;
  salonName: string;
  isRedeemable: boolean;
}

interface GiftCardsPageProps {
  giftCards?: GiftCard[];
  loading?: boolean;
}

export function GiftCardsPage({ loading = false }: GiftCardsPageProps) {
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
          <h2 className="cp-section-title">Gavekort</h2>
          <p className="cp-section-subtitle">Køb og administrer gavekort</p>
        </div>

        <Card className="cp-empty-state">
          <div className="cp-empty-icon">🎁</div>
          <h2 className="cp-empty-title">Gavekort kommer snart!</h2>
          <p className="cp-muted">
            Denne funktion er under udvikling. Du vil snart kunne købe og administrere gavekort her.
          </p>
          <Stack gap="sm" className="cp-mt-lg">
            <Badge variant="warning" size="sm">
              Kommer i Q2 2026
            </Badge>
          </Stack>
        </Card>
      </section>
    </div>
  );
}
