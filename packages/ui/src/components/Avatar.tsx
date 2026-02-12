import type { ReactNode } from 'react';
import { colors } from '../theme/colors.js';
import { radii } from '../theme/radii.js';

export interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: ReactNode;
  width?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'rounded';
  className?: string;
}

export function Avatar({
  src,
  alt,
  fallback,
  size = 'md',
  shape = 'circle',
  className = '',
}: AvatarProps) {
  const sizeMap = {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
  };

  const sizeValue = sizeMap[size];

  const avatarStyles: React.CSSProperties = {
    width: sizeValue,
    height: sizeValue,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: colors.surface.muted,
    borderRadius: shape === 'circle' ? '50%' : radii.avatar[size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md'],
    overflow: 'hidden',
    flexShrink: 0,
  };

  const fallbackStyles: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.ink.muted,
    fontSize: sizeValue * 0.4,
    fontWeight: 600,
  };

  const imageStyles: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  };

  const renderFallback = () => {
    if (fallback) return fallback;
    if (alt) {
      const initials = alt
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      return <span style={fallbackStyles}>{initials}</span>;
    }
    return (
      <svg width={sizeValue * 0.5} height={sizeValue * 0.5} viewBox="0 0 24 24" fill="none" stroke={colors.ink.muted} strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    );
  };

  return (
    <div style={avatarStyles} className={className}>
      {src ? (
        <img src={src} alt={alt || ''} style={imageStyles} onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }} />
      ) : null}
      {(!src || true) && renderFallback()}
    </div>
  );
}
