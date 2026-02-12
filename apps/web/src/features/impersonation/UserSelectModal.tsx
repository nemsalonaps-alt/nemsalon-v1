import { useEffect, useState, useCallback } from 'react';
import { Button, Input, Stack, Card } from '@nemsalon/ui';
import { listPlatformUsers } from '../console/api';
import type { PlatformUser, UsersListResponse } from '../console/types';
import { FeatureState } from '../../components/FeatureState';
import { getCopy } from '../../i18n';
import './impersonation.css';

export type { PlatformUser };

interface UserSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: 'owner' | 'staff' | 'customer';
  onSelect: (user: PlatformUser) => void;
}

export function UserSelectModal({ isOpen, onClose, role, onSelect }: UserSelectModalProps) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const copy = getCopy().impersonation;

  const loadUsers = useCallback(
    async (reset = false) => {
      const currentOffset = reset ? 0 : offset;
      setLoading(true);
      if (reset) {
        setError(null);
      }
      try {
        const result = await listPlatformUsers({
          role,
          query: query || undefined,
          limit: 20,
          offset: currentOffset,
        });

        if (result.ok) {
          const data: UsersListResponse = result.data;
          if (reset) {
            setUsers(data.data);
          } else {
            setUsers((prev) => [...prev, ...data.data]);
          }
          setHasMore(data.meta.hasMore);
          setOffset(data.meta.nextOffset ?? 0);
        } else {
          console.error('Failed to load users:', result.error);
          setError(result.error);
        }
      } catch (error) {
        console.error('Failed to load users:', error);
        setError(error instanceof Error ? error.message : copy.modal.errorUnknown);
      } finally {
        setLoading(false);
      }
    },
    [query, role, offset],
  );

  useEffect(() => {
    if (isOpen) {
      loadUsers(true);
    }
  }, [isOpen, role, query]);

  useEffect(() => {
    if (query) {
      const debounce = setTimeout(() => loadUsers(true), 300);
      return () => {
        clearTimeout(debounce);
      };
    }
    return undefined;
  }, [query]);

  if (!isOpen) return null;

  const handleOverlayClick = () => {
    onClose();
  };

  const handleCardClick = () => {
    // Prevent click through to overlay
  };

  const handleCancel = () => {
    onClose();
  };

  const handleLoadMore = () => {
    loadUsers(false);
  };

  const handleRecover = async () => {
    setIsRecovering(true);
    try {
      await loadUsers(true);
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <div
      className="imp-modal-overlay"
      onClick={handleOverlayClick}
    >
      <Card
        className="imp-modal-card"
        onClick={handleCardClick}
      >
        <Stack gap="md" className="imp-modal-body">
          <Stack gap="xs">
            <h2 className="imp-modal-title">
              {copy.modal.title.replace('{role}', copy.roles[role])}
            </h2>
            <p className="imp-modal-subtitle">{copy.modal.subtitle}</p>
          </Stack>

          <Input
            placeholder={copy.modal.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            data-testid="impersonation-search"
          />

          {error && users.length > 0 && !loading && (
            <Card variant="outlined" className="imp-error-banner">
              <p className="imp-error-text">{error}</p>
            </Card>
          )}

          <Stack gap="sm" className="imp-modal-list">
            {(loading || isRecovering || error) && users.length === 0 && (
              <FeatureState
                status={isRecovering ? 'recovery' : loading ? 'loading' : 'error'}
                title={loading ? copy.modal.loadingTitle : copy.modal.errorTitle}
                description={loading ? copy.modal.loadingBody : undefined}
                error={error ?? undefined}
                onRetry={!loading && !isRecovering ? handleRecover : undefined}
                retryLabel={copy.modal.retry}
                testId="impersonation-fallback"
              />
            )}

            {users.map((user) => (
              <div
                key={user.id}
                data-testid="impersonation-user"
                data-email={user.email ?? ''}
                className="imp-user-row"
              >
                <div>
                  <strong>{user.fullName ?? copy.banner.unknownUser}</strong>
                  <div className="imp-user-meta">
                    {user.email}
                  {user.salonName && `${copy.inlineSeparator}${user.salonName}`}
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onSelect(user)}
                  data-testid="impersonation-select"
                >
                  {copy.modal.select}
                </Button>
              </div>
            ))}

            {users.length === 0 && !loading && (
              <div className="imp-list-empty">
                {copy.modal.noUsers}
              </div>
            )}

            {loading && users.length > 0 && (
              <div className="imp-list-empty">
                {copy.modal.loading}
              </div>
            )}

            {hasMore && (
              <Button variant="ghost" size="sm" onClick={handleLoadMore} disabled={loading}>
                {copy.modal.loadMore}
              </Button>
            )}
          </Stack>

          <Button variant="ghost" size="sm" onClick={handleCancel}>
            {copy.modal.cancel}
          </Button>
        </Stack>
      </Card>
    </div>
  );
}
