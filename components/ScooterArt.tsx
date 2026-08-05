import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, space, type } from '@/constants/theme';

/**
 * Placeholder artwork for a scooter card, used until real photos are uploaded
 * against vehicle_models.image_url from the dashboard.
 *
 * Drawn from plain Views rather than an image file: it scales to any card width,
 * adds nothing to the bundle, and — importantly — reads as an obvious
 * placeholder rather than pretending to be a photo of a scooter we don't have a
 * photo of. The brand initials carry the identification.
 */
export function ScooterArt({ brand }: { brand: string }) {
  const initials = brand
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={styles.frame}>
      <View style={styles.scene}>
        {/* body */}
        <View style={styles.deck} />
        <View style={styles.column} />
        <View style={styles.handlebar} />
        <View style={styles.seat} />
        {/* wheels */}
        <View style={[styles.wheel, styles.wheelFront]} />
        <View style={[styles.wheel, styles.wheelRear]} />
      </View>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{initials}</Text>
      </View>
    </View>
  );
}

const WHEEL = 26;

const styles = StyleSheet.create({
  frame: {
    height: 116,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  scene: { height: 92, marginHorizontal: space(6), position: 'relative' },
  deck: {
    position: 'absolute', left: 26, right: 26, bottom: 24, height: 9,
    borderRadius: radius.sm, backgroundColor: colors.accent,
  },
  column: {
    position: 'absolute', left: 30, bottom: 30, width: 9, height: 40,
    borderRadius: radius.sm, backgroundColor: colors.accent, transform: [{ rotate: '-14deg' }],
  },
  handlebar: {
    position: 'absolute', left: 16, bottom: 66, width: 34, height: 7,
    borderRadius: radius.full, backgroundColor: colors.accentText,
  },
  seat: {
    position: 'absolute', right: 24, bottom: 32, width: 46, height: 14,
    borderTopLeftRadius: radius.md, borderTopRightRadius: radius.sm,
    borderBottomLeftRadius: radius.sm, borderBottomRightRadius: radius.md,
    backgroundColor: colors.accentText,
  },
  wheel: {
    position: 'absolute', bottom: 6, width: WHEEL, height: WHEEL,
    borderRadius: radius.full, borderWidth: 5, borderColor: colors.textMuted,
    backgroundColor: colors.surfaceAlt,
  },
  wheelFront: { left: 18 },
  wheelRear: { right: 18 },
  badge: {
    position: 'absolute', top: space(3), right: space(3),
    paddingHorizontal: space(2.5), paddingVertical: space(1),
    borderRadius: radius.full, backgroundColor: colors.surface,
  },
  badgeText: { fontSize: type.overline, fontWeight: '900', color: colors.textMuted, letterSpacing: 0.5 },
});
