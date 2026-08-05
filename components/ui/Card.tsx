import { View, StyleSheet, type ViewProps } from 'react-native';

import { cardShadow, colors, radius, space } from '@/constants/theme';

/**
 * Neo-minimal card: borderless white squircle lifted on a soft shadow, matching
 * the ops app. The v1 hairline border is gone — depth comes from the shadow.
 */
export function Card({ style, ...props }: ViewProps) {
  return <View style={[styles.card, style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: space(4),
    ...cardShadow,
  },
});
