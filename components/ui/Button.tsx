import { ActivityIndicator, Pressable, Text, StyleSheet, View } from 'react-native';

import { colors, radius, space, type } from '@/constants/theme';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /**
   * primary   — emerald fill, dark ink (the one action a screen wants)
   * secondary — recessed neutral fill (side-by-side alternatives)
   * danger    — destructive
   */
  variant?: 'primary' | 'secondary' | 'danger';
  /** Optional leading glyph, e.g. a phone or map pin. */
  icon?: string;
};

export function Button({ title, onPress, loading, disabled, variant = 'primary', icon }: Props) {
  const isDisabled = disabled || loading;
  const bg =
    variant === 'danger' ? colors.danger : variant === 'secondary' ? colors.surfaceAlt : colors.accent;
  const fg = variant === 'secondary' ? colors.text : variant === 'danger' ? '#fff' : colors.onAccent;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg },
        isDisabled && styles.disabled,
        pressed && !isDisabled && variant === 'primary' && { backgroundColor: colors.accentPressed },
        pressed && !isDisabled && variant !== 'primary' && styles.pressed,
      ]}
      onPress={onPress}
      disabled={isDisabled}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Text style={[styles.icon, { color: fg }]}>{icon}</Text> : null}
          <Text style={[styles.text, { color: fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.lg,
    paddingVertical: space(4),
    paddingHorizontal: space(4),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  icon: { fontSize: type.subtitle },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.75 },
  text: { fontSize: type.body + 1, fontWeight: '800' },
});
