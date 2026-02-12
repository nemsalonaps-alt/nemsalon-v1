import { Card, Stack, Badge } from '@nemsalon/ui';
import '../portal.css';

/**
 * LATER FEATURE: Loyalty Page (Points/Rewards)
 *
 * This page is prepared but NOT implemented yet.
 *
 * When to implement:
 * - When you have >1000 active customers
 * - When you have multiple salons in the system
 * - When you have ecosystem strategy
 * - When you want to increase retention significantly
 *
 * Features to include:
 * - View points balance
 * - Points history
 * - Available rewards
 * - Redeem rewards
 * - Tier status (bronze, silver, gold)
 * - Exclusive offers
 */

interface LoyaltyPoints {
  balance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
}

interface LoyaltyReward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  isAvailable: boolean;
}

interface LoyaltyTier {
  name: string;
  minPoints: number;
  benefits: string[];
}

interface LoyaltyPageProps {
  points?: LoyaltyPoints;
  rewards?: LoyaltyReward[];
  currentTier?: LoyaltyTier;
  loading?: boolean;
}

export function LoyaltyPage({ loading = false }: LoyaltyPageProps) {
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
          <h2 className="cp-section-title">Loyalitetsprogram</h2>
          <p className="cp-section-subtitle">Optjen point og få belønninger</p>
        </div>

        <Card className="cp-empty-state">
          <div className="cp-empty-icon">⭐</div>
          <h2 className="cp-empty-title">Loyalitetsprogram kommer snart!</h2>
          <p className="cp-muted">
            Denne funktion er under udvikling. Du vil snart kunne optjene point og få eksklusive
            belønninger.
          </p>
          <Stack gap="sm" className="cp-mt-lg">
            <Badge variant="warning" size="sm">
              Kommer i Q4 2026
            </Badge>
          </Stack>
        </Card>
      </section>
    </div>
  );
}
