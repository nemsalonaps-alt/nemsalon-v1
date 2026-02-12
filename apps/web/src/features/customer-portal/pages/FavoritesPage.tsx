import { useState, useEffect, useCallback } from 'react';
import { Card, Button, Badge, Stack } from '@nemsalon/ui';
import { ErrorState } from '@nemsalon/ui';
import { getCopy } from '../../../i18n';
import { listMyFavorites, removeFavorite, type FavoriteSalon } from '../api';
import { SkeletonList } from '../components/Skeletons';
import '../portal.css';

const t = getCopy();

export function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteSalon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const result = await listMyFavorites();

      if (cancelled) return;

      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }

      setFavorites(result.data);
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleRemove = useCallback(async (salonId: string) => {
    setRemovingId(salonId);

    const result = await removeFavorite(salonId);

    if (!result.ok) {
      setError(result.error);
      setRemovingId(null);
      return;
    }

    // Remove from local state
    setFavorites((prev) => prev.filter((f) => f.salonId !== salonId));
    setRemovingId(null);
  }, []);

  const handleBookAgain = useCallback((salonSlug: string) => {
    window.location.href = `/book/${salonSlug}`;
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
    setLoading(true);
    listMyFavorites().then((result) => {
      if (!result.ok) {
        setError(result.error);
      } else {
        setFavorites(result.data);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="cp-page-container">
        <section className="cp-section">
          <div className="cp-section-header">
            <h2 className="cp-section-title">
              {t.customerPortal.favorites?.title ?? 'Favoritter'}
            </h2>
            <p className="cp-section-subtitle">
              {t.customerPortal.favorites?.subtitle ?? 'Dine gemte saloner'}
            </p>
          </div>
          <SkeletonList items={3} showActions />
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cp-page-container">
        <ErrorState
          title={t.customerPortal.favorites?.errorTitle ?? 'Kunne ikke indlæse favoritter'}
          message={error}
          action={<button onClick={handleRetry}>{t.customerPortal.retry}</button>}
        />
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="cp-page-container">
        <Card className="cp-empty-state">
          <div className="cp-empty-icon">⭐</div>
          <h2 className="cp-empty-title">
            {t.customerPortal.favorites?.emptyTitle ?? 'Ingen favoritter endnu'}
          </h2>
          <p className="cp-muted">
            {t.customerPortal.favorites?.emptyDesc ??
              'Gem dine yndlingssaloner for hurtig booking næste gang.'}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="cp-page-container">
      <section className="cp-section">
        <div className="cp-section-header">
          <h2 className="cp-section-title">{t.customerPortal.favorites?.title ?? 'Favoritter'}</h2>
          <p className="cp-section-subtitle">
            {t.customerPortal.favorites?.subtitle ?? 'Dine gemte saloner'}
          </p>
        </div>

        <Stack gap="md">
          {favorites.map((salon) => (
            <Card key={salon.id} className="cp-favorite-card">
              <Stack gap="md">
                <Stack direction="row" justify="between" align="start">
                  <div className="cp-favorite-info">
                    <div className="cp-favorite-name">{salon.salonName}</div>
                    <div className="cp-favorite-address">
                      {salon.address.line1}, {salon.address.postalCode} {salon.address.city}
                    </div>
                    {salon.phone && <div className="cp-favorite-phone">📞 {salon.phone}</div>}
                  </div>
                  <Badge variant="default" size="sm">
                    {t.customerPortal.favorites?.savedBadge ?? 'Gemt'}
                  </Badge>
                </Stack>

                <div className="cp-favorite-actions">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => void handleBookAgain(salon.salonSlug)}
                    fullWidth
                  >
                    {t.customerPortal.favorites?.bookAgain ?? 'Book igen'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleRemove(salon.salonId)}
                    isLoading={removingId === salon.salonId}
                    fullWidth
                  >
                    {t.customerPortal.favorites?.remove ?? 'Fjern'}
                  </Button>
                </div>
              </Stack>
            </Card>
          ))}
        </Stack>
      </section>
    </div>
  );
}
