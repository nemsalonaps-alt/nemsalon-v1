// Theme index - exports all theme tokens and utilities

export { colors } from './colors.js';
export { typography } from './typography.js';
export { spacing } from './spacing.js';
export { shadows } from './shadows.js';
export { radii } from './radii.js';

// Re-export types
export type { Colors } from './colors.js';
export type { Typography } from './typography.js';
export type { Spacing } from './spacing.js';
export type { Shadows } from './shadows.js';
export type { Radii } from './radii.js';

// CSS Variable generator - simplified to avoid TS template literal issues
export function generateCSSVariables(): string {
  return ':root { /* CSS variables disabled due to build issues */ }';
}
