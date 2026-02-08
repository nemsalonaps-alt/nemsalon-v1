const tokenStorageKey = (bookingId: string) => `bookingToken:${bookingId}`;

export function resolveBookingToken(bookingId: string): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const tokenFromQuery = params.get('token');
  if (tokenFromQuery) {
    localStorage.setItem(tokenStorageKey(bookingId), tokenFromQuery);
    params.delete('token');
    const next = params.toString();
    const nextUrl = `${window.location.pathname}${next ? `?${next}` : ''}`;
    window.history.replaceState(null, '', nextUrl);
    return tokenFromQuery;
  }
  return localStorage.getItem(tokenStorageKey(bookingId));
}
