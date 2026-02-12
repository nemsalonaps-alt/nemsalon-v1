// Theme Spacing Tokens
// 4px base grid system for consistent spacing

export const spacing = {
  // Base scale
  0: '0',
  1: '4px',   // 0.25rem
  2: '8px',   // 0.5rem
  3: '12px',  // 0.75rem
  4: '16px',  // 1rem
  5: '20px',  // 1.25rem
  6: '24px',  // 1.5rem
  8: '32px',  // 2rem
  10: '40px', // 2.5rem
  12: '48px', // 3rem
  16: '64px', // 4rem
  20: '80px', // 5rem
  24: '96px', // 6rem
  
  // Semantic spacing
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '32px',
  '4xl': '48px',
  '5xl': '64px',
  
  // Component-specific - updated for modern styling
  button: {
    sm: '10px 16px',
    md: '14px 24px',
    lg: '18px 32px',
  },
  card: {
    sm: '16px',
    md: '20px',
    lg: '28px',
  },
  input: {
    sm: '8px 12px',
    md: '12px 16px',
    lg: '16px 20px',
  },
} as const;

export type Spacing = typeof spacing;
