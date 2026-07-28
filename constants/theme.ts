/**
 * MoveGrid Rider design tokens — light theme (riders work outdoors in sunlight)
 * with the brand purple accent. Green stays with the ops app; the rider app is
 * a deliberately distinct surface.
 */
export const colors = {
  bg: '#F4F4F7', // app background
  surface: '#FFFFFF', // cards / panels
  surfaceAlt: '#EEEEF3',
  border: '#E8E8EE', // hairline borders
  accent: '#6D4AE0', // brand purple — actions
  accentSoft: 'rgba(109,74,224,0.10)',
  good: '#0E9384', // paid-up / success
  goodSoft: 'rgba(14,147,132,0.12)',
  text: '#17171E',
  textMuted: '#6A6A74',
  textFaint: '#9C9CA8',
  danger: '#C0392B', // money owed
  dangerSoft: 'rgba(192,57,43,0.10)',
  warning: '#B45309',
  warningSoft: 'rgba(180,83,9,0.12)',
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

/** 4pt spacing scale: space(4) => 16 */
export const space = (n: number) => n * 4;
