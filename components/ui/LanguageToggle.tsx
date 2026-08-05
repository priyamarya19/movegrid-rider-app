import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, space, type } from '@/constants/theme';
import { useLang, type Lang } from '@/lib/i18n';

/**
 * हिंदी | English segmented switch.
 *
 * Both labels always render in their own script, never translated — a rider who
 * can't read the current language still recognises the one they want. That's
 * the whole point of putting it at the top of login.
 */
export function LanguageToggle({ compact }: { compact?: boolean }) {
  const { lang, setLang } = useLang();

  const Option = ({ value, label }: { value: Lang; label: string }) => {
    const active = lang === value;
    return (
      <Pressable
        onPress={() => setLang(value)}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        style={[
          styles.option,
          compact && styles.optionCompact,
          active && { backgroundColor: colors.surface },
        ]}>
        <Text style={[styles.label, compact && styles.labelCompact, active && styles.labelActive]}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <Option value="hi" label="हिंदी" />
      <Option value="en" label="English" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    padding: 3,
    alignSelf: 'flex-start',
  },
  wrapCompact: { padding: 2 },
  option: {
    paddingVertical: space(2),
    paddingHorizontal: space(4),
    borderRadius: radius.full,
    minWidth: 76,
    alignItems: 'center',
  },
  optionCompact: { paddingVertical: space(1.25), paddingHorizontal: space(3), minWidth: 0 },
  label: { fontSize: type.label, fontWeight: '700', color: colors.textMuted },
  labelCompact: { fontSize: type.caption },
  labelActive: { color: colors.text },
});
