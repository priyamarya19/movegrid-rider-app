import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ErrorState, LoadingState } from '@/components/ui/QueryStates';
import { colors, radius, space, type } from '@/constants/theme';
import { getCities, setMyCity, type CityOption } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLang } from '@/lib/i18n';
import { useApiQuery } from '@/lib/useApiQuery';

/**
 * City step — the second thing a rider does, right after OTP.
 *
 * "City" is the rider-facing word for what the backend calls a hub: picking
 * Noida sets assigned_hub_id, which is what makes the next screen able to show
 * an address and a phone number. Options come from the hubs table, so hub #2
 * appears here without an app release.
 *
 * Riders who already have a hub never see this screen — home routes past it.
 */
export default function CityScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { t } = useLang();
  const fetcher = useCallback((tk: string) => getCities(tk), []);
  const q = useApiQuery<{ cities: CityOption[] }>(fetcher, [], { cacheKey: 'cities' });

  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cities = q.data?.cities ?? [];
  // One city today: preselect it so this is a single tap, not a puzzle.
  const choice = selected ?? (cities.length === 1 ? cities[0].hub_id : null);

  async function confirm() {
    if (!choice || !token) return;
    setSaving(true);
    setError(null);
    try {
      await setMyCity(token, choice);
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('city.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {q.loading ? (
        <LoadingState label={t('common.loading')} />
      ) : q.error ? (
        <ErrorState message={q.error} onRetry={q.refetch} />
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>{t('city.title')}</Text>
            <Text style={styles.subtitle}>{t('city.subtitle')}</Text>

            <View style={{ gap: space(3), marginTop: space(2) }}>
              {cities.map((c) => {
                const active = choice === c.hub_id;
                return (
                  <Pressable key={c.hub_id} onPress={() => setSelected(c.hub_id)}>
                    <Card style={[styles.city, active && styles.cityActive]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cityName}>{c.city}</Text>
                        <Text style={styles.cityHub}>
                          {[c.hub_name, c.area].filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                      <View style={[styles.radio, active && styles.radioOn]}>
                        {active ? <Text style={styles.tick}>✓</Text> : null}
                      </View>
                    </Card>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.note}>{t('city.comingSoon')}</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>

          <View style={styles.footer}>
            <Button title={t('common.continue')} onPress={confirm} loading={saving} disabled={!choice} />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space(5), gap: space(2), paddingBottom: space(8) },
  title: { fontSize: type.screenTitle, fontWeight: '800', color: colors.text, letterSpacing: -0.4 },
  subtitle: { fontSize: type.body, color: colors.textMuted, marginBottom: space(3) },
  city: { flexDirection: 'row', alignItems: 'center', gap: space(3) },
  cityActive: { borderWidth: 2, borderColor: colors.accent },
  cityName: { fontSize: type.subtitle, fontWeight: '800', color: colors.text },
  cityHub: { fontSize: type.caption, color: colors.textMuted, marginTop: 2 },
  radio: {
    width: 26, height: 26, borderRadius: radius.full,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  tick: { color: colors.onAccent, fontSize: type.caption, fontWeight: '900' },
  note: { fontSize: type.caption, color: colors.textFaint, marginTop: space(3), lineHeight: 18 },
  error: { fontSize: type.label, color: colors.dangerText, marginTop: space(3), fontWeight: '600' },
  footer: { padding: space(5), paddingTop: space(3) },
});
