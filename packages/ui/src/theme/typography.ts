// Theme Typography Tokens
// Font sizes, weights, line heights, and font families

export const typography = {
  // Font families
  fontFamily: {
    sans: "'Space Grotesk', system-ui, -apple-system, sans-serif",
    serif: "'Fraunces', serif",
    mono: "'SF Mono', Monaco, monospace",
  },
  
  // Font sizes (in rem for accessibility)
  fontSize: {
    xs: '0.75rem',      // 12px
    sm: '0.8125rem',    // 13px
    base: '0.875rem',   // 14px
    md: '0.9375rem',    // 15px
    lg: '1rem',         // 16px
    xl: '1.125rem',     // 18px
    '2xl': '1.25rem',   // 20px
    '3xl': '1.5rem',    // 24px
    '4xl': '2rem',      // 32px
    '5xl': '2.25rem',   // 36px
  },
  
  // Font weights
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  
  // Line heights
  lineHeight: {
    tight: 1,
    snug: 1.25,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
  
  // Letter spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.06em',
    widest: '0.1em',
  },
  
  // Predefined text styles
  text: {
    h1: {
      fontFamily: "'Fraunces', serif",
      fontSize: '2rem',
      fontWeight: 700,
      lineHeight: 1.25,
    },
    h2: {
      fontFamily: "'Fraunces', serif",
      fontSize: '1.5rem',
      fontWeight: 700,
      lineHeight: 1.25,
    },
    h3: {
      fontFamily: "'Fraunces', serif",
      fontSize: '1.125rem',
      fontWeight: 700,
      lineHeight: 1.4,
    },
    h4: {
      fontFamily: "'Space Grotesk', system-ui, sans-serif",
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    body: {
      fontFamily: "'Space Grotesk', system-ui, sans-serif",
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    small: {
      fontFamily: "'Space Grotesk', system-ui, sans-serif",
      fontSize: '0.8125rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    caption: {
      fontFamily: "'Space Grotesk', system-ui, sans-serif",
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    button: {
      fontFamily: "'Space Grotesk', system-ui, sans-serif",
      fontSize: '0.875rem',
      fontWeight: 600,
      lineHeight: 1,
    },
    label: {
      fontFamily: "'Space Grotesk', system-ui, sans-serif",
      fontSize: '0.75rem',
      fontWeight: 600,
      lineHeight: 1.5,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
    },
  },
} as const;

export type Typography = typeof typography;
