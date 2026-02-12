// Theme Shadow Tokens
// Box shadows for elevation and depth

export const shadows = {
  // Elevation scale
  none: 'none',
  
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  
  // Brand-specific shadows - updated for green theme
  accent: '0 4px 14px 0 rgba(34, 197, 94, 0.39)',
  accentStrong: '0 8px 28px -6px rgba(34, 197, 94, 0.5)',
  
  error: '0 4px 14px 0 rgba(220, 38, 38, 0.39)',
  
  // Component-specific - softer shadows
  card: '0 1px 2px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.04)',
  cardHover: '0 4px 12px rgba(34, 197, 94, 0.15), 0 8px 24px rgba(0, 0, 0, 0.08)',
  
  button: '0 1px 2px rgba(0, 0, 0, 0.05)',
  buttonHover: '0 4px 12px rgba(34, 197, 94, 0.3)',
  
  modal: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  
  toast: '0 8px 24px -8px rgba(34, 197, 94, 0.4)',
  toastError: '0 8px 24px -8px rgba(220, 38, 38, 0.4)',
  
  dropdown: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  
  // Inner shadows
  inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.05)',
  innerMd: 'inset 0 4px 6px rgba(0, 0, 0, 0.1)',
} as const;

export type Shadows = typeof shadows;
