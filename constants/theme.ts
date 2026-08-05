/**
 * MoveGrid Rider design tokens — v2.
 *
 * The "Soft neo-minimal" light set from the ops app, brought across so both
 * MOVEGRID apps read as one product: warm off-white canvas, borderless white
 * squircle cards on layered shadows, bold near-black numerals, deep emerald
 * accent. Built for daytime use in direct sunlight, which is where riders are.
 *
 * Light only — no night set. Riders won't go looking in Settings for a theme,
 * and every extra token pair is another surface that can drift.
 *
 * NOTE: v1 used a purple accent (#6D4AE0) to stay visually distinct from ops.
 * Dropped on Priyam's instruction to share the ops app's brand guidelines. The
 * Android adaptive icon in app.json is still purple.
 */

export type ThemeTokens = {
  /** Canvas behind everything. */
  bg: string;
  /** Cards / panels. */
  surface: string;
  /** Recessed fills: input backgrounds, neutral pills. */
  surfaceAlt: string;
  /** Elevated overlays: sheets, dialogs. */
  surfaceRaised: string;
  border: string;
  /** Brand fill for buttons/active states. */
  accent: string;
  /** Pressed state of accent fills. */
  accentPressed: string;
  accentSoft: string;
  /** Accent used AS TEXT or icons — darker for contrast on light surfaces. */
  accentText: string;
  /** Ink on top of accent-filled controls. */
  onAccent: string;
  text: string;
  textMuted: string;
  textFaint: string;
  danger: string;
  dangerText: string;
  dangerSoft: string;
  warning: string;
  warningText: string;
  warningSoft: string;
  /** Money-positive figures (paid up, credit). */
  money: string;
  /** Card shadow color (alpha included). */
  shadow: string;
  /** Tab bar background. */
  tabBar: string;
  statusBarStyle: 'dark' | 'light';
};

export const lightTheme: ThemeTokens = {
  bg: '#F5F6F2',
  surface: '#FFFFFF',
  surfaceAlt: '#EFF1EC',
  surfaceRaised: '#FFFFFF',
  border: '#E6E9E2',
  accent: '#00C48C',
  accentPressed: '#00A878',
  accentSoft: 'rgba(0,196,140,0.12)',
  accentText: '#0C7A56',
  onAccent: '#06281F',
  text: '#101613',
  textMuted: '#5B6560',
  textFaint: '#959E98',
  danger: '#DC3D43',
  dangerText: '#B3261E',
  dangerSoft: 'rgba(220,61,67,0.10)',
  warning: '#D97706',
  warningText: '#8A5A00',
  warningSoft: 'rgba(217,119,6,0.12)',
  money: '#0C7A56',
  shadow: 'rgba(16,22,19,0.08)',
  tabBar: '#FFFFFF',
  statusBarStyle: 'dark',
};

/**
 * Flat export used throughout the app. There is only one theme, so screens
 * import this directly rather than reading a context on every render.
 *
 * `good`/`goodSoft` are kept from v1 so already-written screens keep compiling;
 * they now point at the emerald money tokens.
 */
export const colors = {
  bg: lightTheme.bg,
  surface: lightTheme.surface,
  surfaceAlt: lightTheme.surfaceAlt,
  surfaceRaised: lightTheme.surfaceRaised,
  border: lightTheme.border,
  accent: lightTheme.accent,
  accentPressed: lightTheme.accentPressed,
  accentSoft: lightTheme.accentSoft,
  accentText: lightTheme.accentText,
  onAccent: lightTheme.onAccent,
  text: lightTheme.text,
  textMuted: lightTheme.textMuted,
  textFaint: lightTheme.textFaint,
  danger: lightTheme.danger,
  dangerText: lightTheme.dangerText,
  dangerSoft: lightTheme.dangerSoft,
  warning: lightTheme.warning,
  warningText: lightTheme.warningText,
  warningSoft: lightTheme.warningSoft,
  money: lightTheme.money,
  /** @deprecated v1 name — use `money`. */
  good: lightTheme.money,
  /** @deprecated v1 name — use `accentSoft`. */
  goodSoft: lightTheme.accentSoft,
  shadow: lightTheme.shadow,
  tabBar: lightTheme.tabBar,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 999,
} as const;

/** 4pt spacing scale: space(4) => 16 */
export const space = (n: number) => n * 4;

/** Type scale (weights 600–800; use tabular numerals for money). */
export const type = {
  overline: 11,
  caption: 12,
  label: 13,
  body: 15,
  subtitle: 17,
  title: 20,
  screenTitle: 24,
  moneyHero: 32,
} as const;

/**
 * The layered soft shadow that defines the neo-minimal card. Android reads only
 * `elevation`, iOS only the shadow* keys — both are set so cards lift on either.
 */
export const cardShadow = {
  shadowColor: lightTheme.shadow,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 1,
  shadowRadius: 12,
  elevation: 2,
} as const;
