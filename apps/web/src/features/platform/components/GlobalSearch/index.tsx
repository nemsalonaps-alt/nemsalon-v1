import { useState, useCallback, useRef, useEffect } from 'react';
import { Card, Input, Stack, Badge, Button } from '@nemsalon/ui';
import { universalSearch } from '../../api/platform-api';
import type { SearchResult } from '../../types/platform-types';

interface GlobalSearchProps {
  onResultSelect?: (result: SearchResult) => void;
  onSalonClick?: (salonId: string) => void;
}

function getResultIcon(type: SearchResult['type']): string {
  switch (type) {
    case 'salon':
      return '🏢';
    case 'booking':
      return '📅';
    case 'payment':
      return '💳';
    case 'customer':
      return '👤';
    case 'staff':
      return '👥';
    case 'user':
      return '🔑';
    default:
      return '📄';
  }
}

function getStatusVariant(status: string): 'success' | 'warning' | 'error' | 'default' {
  switch (status?.toLowerCase()) {
    case 'active':
    case 'confirmed':
    case 'paid':
    case 'succeeded':
      return 'success';
    case 'pending':
    case 'draft':
      return 'warning';
    case 'cancelled':
    case 'failed':
    case 'inactive':
      return 'error';
    default:
      return 'default';
  }
}

export function GlobalSearch({ onResultSelect, onSalonClick }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('platform_admin_recent_searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save recent searches
  const saveRecentSearch = useCallback((searchQuery: string) => {
    setRecentSearches((prev) => {
      const updated = [searchQuery, ...prev.filter((s) => s !== searchQuery)].slice(0, 10);
      localStorage.setItem('platform_admin_recent_searches', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Perform search
  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await universalSearch(searchQuery, 20);
        setResults(response.results);
        saveRecentSearch(searchQuery);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [saveRecentSearch],
  );

  // Debounced search
  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      setShowResults(true);

      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }

      if (value.trim()) {
        searchTimeout.current = setTimeout(() => {
          performSearch(value);
        }, 300);
      } else {
        setResults([]);
      }
    },
    [performSearch],
  );

  // Handle result click
  const handleResultClick = useCallback(
    (result: SearchResult) => {
      onResultSelect?.(result);
      if (result.type === 'salon') {
        onSalonClick?.(result.id);
      }
      setShowResults(false);
      setQuery('');
    },
    [onResultSelect, onSalonClick],
  );

  // Handle recent search click
  const handleRecentSearchClick = useCallback(
    (search: string) => {
      setQuery(search);
      performSearch(search);
      setShowResults(true);
    },
    [performSearch],
  );

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setShowResults(false);
  }, []);

  return (
    <Card className="global-search">
      <Stack gap="md">
        {/* Search Input */}
        <div style={{ position: 'relative' }}>
          <Input
            type="text"
            placeholder="Søg efter salon, booking, kunde, betaling..."
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => setShowResults(true)}
            style={{
              width: '100%',
              paddingLeft: '40px',
              paddingRight: query ? '40px' : '12px',
              fontSize: '16px',
            }}
          />
          <span
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              opacity: 0.5,
              fontSize: '18px',
            }}
          >
            🔍
          </span>
          {query && (
            <button
              onClick={clearSearch}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                opacity: 0.5,
                fontSize: '18px',
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Results Dropdown */}
        {showResults && (query || results.length > 0) && (
          <div
            className="search-results"
            style={{
              maxHeight: '500px',
              overflowY: 'auto',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: '8px',
              background: 'white',
            }}
          >
            {loading && (
              <div style={{ padding: '20px', textAlign: 'center', opacity: 0.6 }}>Søger...</div>
            )}

            {error && (
              <div
                style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: '#dc2626',
                  background: '#fef2f2',
                }}
              >
                {error}
              </div>
            )}

            {!loading && !error && results.length === 0 && query.trim() && (
              <div style={{ padding: '40px', textAlign: 'center', opacity: 0.6 }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                <div>Ingen resultater fundet for &quot;{query}&quot;</div>
              </div>
            )}

            {!loading && !error && results.length > 0 && (
              <Stack gap="xs" style={{ padding: '8px' }}>
                <div
                  style={{
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    opacity: 0.5,
                    textTransform: 'uppercase',
                  }}
                >
                  {results.length} resultater fundet
                </div>
                {results.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      background: 'rgba(0,0,0,0.02)',
                      border: '1px solid transparent',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(0,0,0,0.05)';
                      e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(0,0,0,0.02)';
                      e.currentTarget.style.borderColor = 'transparent';
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>{getResultIcon(result.type)}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: '14px' }}>{result.title}</div>
                      <div style={{ fontSize: '12px', opacity: 0.6 }}>{result.subtitle}</div>
                    </div>
                    <Badge variant={getStatusVariant(result.status)} size="sm">
                      {result.type}
                    </Badge>
                  </button>
                ))}
              </Stack>
            )}

            {/* Recent Searches */}
            {!query && recentSearches.length > 0 && (
              <div style={{ padding: '16px', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    opacity: 0.5,
                    marginBottom: '12px',
                    textTransform: 'uppercase',
                  }}
                >
                  Seneste søgninger
                </div>
                <Stack gap="xs">
                  {recentSearches.slice(0, 5).map((search) => (
                    <button
                      key={search}
                      onClick={() => handleRecentSearchClick(search)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        opacity: 0.7,
                        fontSize: '14px',
                      }}
                    >
                      <span>🕐</span>
                      <span>{search}</span>
                    </button>
                  ))}
                </Stack>
              </div>
            )}
          </div>
        )}

        {/* Quick Filters */}
        {!showResults && (
          <div style={{ padding: '8px 0' }}>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                opacity: 0.5,
                marginBottom: '12px',
                textTransform: 'uppercase',
              }}
            >
              Hurtige søgninger
            </div>
            <Stack direction="row" gap="sm" wrap>
              {[
                'Aktive saloner',
                'Fejlede betalinger',
                'Nye bookinger',
                'Kunder uden bookinger',
              ].map((filter) => (
                <Button
                  key={filter}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleQueryChange(filter)}
                >
                  {filter}
                </Button>
              ))}
            </Stack>
          </div>
        )}
      </Stack>
    </Card>
  );
}
