// Theme Border Radius Tokens
// Consistent corner rounding throughout the application

export const radii = {
  // Base scale - more rounded for modern feel
  none: '0',
  xs: '6px',
  sm: '10px',
  md: '14px',
  lg: '18px',
  xl: '24px',
  '2xl': '32px',
  '3xl': '40px',
  '4xl': '48px',
  full: '9999px', // Pill shape
  
  // Component-specific - increased rounding
  button: {
    sm: '10px',
    md: '12px',
    lg: '16px',
    pill: '9999px',
  },
  
  card: {
    sm: '16px',
    md: '20px',
    lg: '24px',
    xl: '32px',
  },
  
  input: {
    sm: '10px',
    md: '12px',
    lg: '14px',
  },
  
  badge: {
    sm: '8px',
    md: '9999px', // Full pill
  },
  
  avatar: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    full: '50%', // Circle
  },
  
  modal: '24px',
  toast: '9999px',
  tooltip: '10px',
  popover: '16px',
  dropdown: '12px',
} as const;

export type Radii = typeof radii;
