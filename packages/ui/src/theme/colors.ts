// Theme Color Tokens
// All colors used across the application

export const colors = {
  // Primary - Vibrant Green (from screenshots)
  primary: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e', // Main green
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
    DEFAULT: '#22c55e',
  },
  
  // Brand colors (legacy - map to primary)
  accent: {
    DEFAULT: '#22c55e',
    strong: '#16a34a',
    soft: 'rgba(34, 197, 94, 0.1)',
    medium: 'rgba(34, 197, 94, 0.2)',
    heavy: 'rgba(34, 197, 94, 0.3)',
  },
  
  // Sun/Amber
  sun: {
    DEFAULT: '#f59e0b',
    soft: 'rgba(245, 158, 11, 0.1)',
    medium: 'rgba(245, 158, 11, 0.15)',
    heavy: 'rgba(245, 158, 11, 0.3)',
  },
  
  // Text colors - Clean slate
  ink: {
    DEFAULT: '#0f172a', // Dark navy
    soft: '#334155',
    muted: '#64748b',
    light: '#94a3b8',
  },
  
  // Surface colors - Clean white/gray
  surface: {
    DEFAULT: '#ffffff',
    raised: '#ffffff',
    lowered: '#f8fafc',
    muted: '#f1f5f9',
    border: '#e2e8f0',
  },
  
  // Semantic colors
  error: {
    DEFAULT: '#dc2626',
    soft: 'rgba(220, 38, 38, 0.1)',
    medium: 'rgba(220, 38, 38, 0.15)',
    heavy: 'rgba(220, 38, 38, 0.25)',
  },
  
  success: {
    DEFAULT: '#22c55e',
    soft: 'rgba(34, 197, 94, 0.1)',
    medium: 'rgba(34, 197, 94, 0.15)',
  },
  
  warning: {
    DEFAULT: '#f59e0b',
    soft: 'rgba(245, 158, 11, 0.1)',
  },
  
  // Blue for PRO badges
  info: {
    DEFAULT: '#3b82f6',
    soft: 'rgba(59, 130, 246, 0.1)',
    medium: 'rgba(59, 130, 246, 0.15)',
  },
  
  gray: {
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
  },
  
  // Status colors matching screenshots
  status: {
    klar: {
      bg: '#dcfce7',
      border: '#bbf7d0',
      text: '#16a34a',
    },
    tilReview: {
      bg: '#ffedd5',
      border: '#fed7aa',
      text: '#ea580c',
    },
    mangler: {
      bg: '#fee2e2',
      border: '#fecaca',
      text: '#dc2626',
    },
    pro: {
      bg: '#eff6ff',
      border: '#dbeafe',
      text: '#2563eb',
    },
    confirmed: {
      bg: 'rgba(34, 197, 94, 0.1)',
      border: 'rgba(34, 197, 94, 0.3)',
      text: '#16a34a',
    },
    in_progress: {
      bg: 'rgba(34, 197, 94, 0.15)',
      border: 'rgba(34, 197, 94, 0.3)',
      text: '#15803d',
    },
    completed: {
      bg: 'rgba(34, 197, 94, 0.2)',
      border: 'rgba(34, 197, 94, 0.4)',
      text: '#16a34a',
    },
    pending: {
      bg: 'rgba(245, 158, 11, 0.1)',
      border: 'rgba(245, 158, 11, 0.3)',
      text: '#c2410c',
    },
    cancelled: {
      bg: 'rgba(100, 116, 139, 0.1)',
      border: 'rgba(100, 116, 139, 0.3)',
      text: '#64748b',
    },
    no_show: {
      bg: 'rgba(100, 116, 139, 0.15)',
      border: 'rgba(100, 116, 139, 0.3)',
      text: '#475569',
    },
  },
  
  // White and black
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type Colors = typeof colors;
