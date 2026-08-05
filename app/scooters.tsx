import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { ScooterArt } from '@/components/ScooterArt';
import { ErrorState, LoadingState } from '@/components/ui/QueryStates';
import { useToast } from '@/components/ui/Toast';
import { colors, radius, space, type } from '@/constants/theme';
import { clearScooterPreference, getMe, getScooters, setScooterPreference, type RiderMe, type Scooter } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatINR } from '@/lib/format';
import { useLang } from '@/lib/i18n';
import { useApiQuery } from '@/lib/useApiQuery';

/**
 * The scooter catalog — what MOVEGRID rents, one card per brand.
 *
 * Shows every brand regardless of stock: a rider deciding whether to sign up
 * should see the whole range, and a brand that's fully deployed today isn't
 * gone. Nothing here reserves a vehicle, which the footer note says plainly —
 * over-promising at this screen is what turns into an argument at the counter.
 */
export default function ScootersScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { t } = useLang();
  const showToast = useToast();

  const listFetcher = useCallback((tk: string) => getScooters(tk), []);
  const meFetcher = useCallback((tk: string) => getMe(tk), []);
  const q = useApiQuery<{ scooters: Scooter[] }>(listFetcher, [], { cacheKey: 'scooters' });
  const me = useApiQuery<RiderMe>(meFetcher, [], { cacheKey: 'me' });

  // Optimistic local copy so the tick lands instantly on a slow connection.
  const [pendingBrand, setPendingBrand] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const chosen = pendingBrand ?? me.data?.preferred_brand ?? null;

  async function choose(brand: string) {
    if (!token) return;
    const previous = chosen;
    const next = previous === brand ? null : brand;
    setPendingBrand(next);
    setSaving(brand);
    try {
      if (next) {
        await setScooterPreference(token, next);
        showToast(t('scooters.savedToast'), 'success');
      } else {
        await clearScooterPreference(token);
      }
      me.refetch();
    } catch (e) {
      // Put the UI back where it was — a silent revert is worse than a message.
      setPendingBrand(previous);
      showToast(e instanceof Error ? e.message : t('common.somethingWrong'), 'error');
    } finally {
      setSaving(null);
    }
  }

  const scooters = q.data?.scooters ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.topTitle}>{t('scooters.title')}</Text>
        <View style={styles.back} />
      </View>

      {q.loading ? (
        <LoadingState label={t('common.loading')} />
      ) : q.error ? (
        <ErrorState message={q.error} onRetry={q.refetch} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={q.refreshing} onRefresh={q.refetch} tintColor={colors.accent} />
          }>
          <Text style={styles.subtitle}>{t('scooters.subtitle')}</Text>

          {scooters.map((s) => (
            <ScooterCard
              key={s.brand}
              scooter={s}
              chosen={chosen === s.brand}
              busy={saving === s.brand}
              onChoose={() => choose(s.brand)}
            />
          ))}

          <Text style={styles.note}>{t('scooters.note')}</Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function ScooterCard({
  scooter: s, chosen, busy, onChoose,
}: { scooter: Scooter; chosen: boolean; busy: boolean; onChoose: () => void }) {
  const { t } = useLang();

  // A brand with one price shows one number; a range only appears if the models
  // under that brand genuinely differ.
  const daily = s.daily_min === s.daily_max
    ? formatINR(s.daily_min)
    : `${formatINR(s.daily_min)}–${formatINR(s.daily_max)}`;
  const weekly = s.weekly_min === s.weekly_max
    ? formatINR(s.weekly_min)
    : `${formatINR(s.weekly_min)}–${formatINR(s.weekly_max)}`;

  return (
    <Card style={[styles.card, chosen && styles.cardChosen]}>
      {s.image_url ? (
        <Image source={{ uri: s.image_url }} style={styles.photo} resizeMode="cover" />
      ) : (
        <ScooterArt brand={s.brand} />
      )}

      <View style={styles.cardHead}>
        <Text style={styles.brand}>{s.brand}</Text>
        {s.high_speed ? (
          <View style={styles.hsPill}>
            <Text style={styles.hsPillText}>⚡</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.priceRow}>
        <View>
          <Text style={styles.price}>{daily}</Text>
          <Text style={styles.priceUnit}>{t('scooters.perDay')}</Text>
        </View>
        <View style={styles.priceDivider} />
        <View>
          <Text style={styles.price}>{weekly}</Text>
          <Text style={styles.priceUnit}>{t('scooters.perWeek')}</Text>
        </View>
      </View>

      {s.high_speed ? <Text style={styles.hsNote}>{t('scooters.highSpeed')}</Text> : null}

      <Pressable
        onPress={onChoose}
        disabled={busy}
        style={({ pressed }) => [
          styles.chooseBtn,
          chosen ? styles.chooseBtnOn : styles.chooseBtnOff,
          (pressed || busy) && { opacity: 0.7 },
        ]}>
        <Text style={[styles.chooseText, chosen && { color: colors.onAccent }]}>
          {chosen ? t('scooters.wanted') : t('scooters.want')}
        </Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: space(4), paddingVertical: space(3),
  },
  back: { width: 40 },
  backText: { fontSize: type.title, color: colors.text, fontWeight: '700' },
  topTitle: { fontSize: type.subtitle, fontWeight: '800', color: colors.text },
  content: { padding: space(4), gap: space(4), paddingBottom: space(10) },
  subtitle: { fontSize: type.label, color: colors.textMuted, marginTop: -space(1) },

  card: { gap: space(3) },
  cardChosen: { borderWidth: 2, borderColor: colors.accent },
  photo: { height: 116, borderRadius: radius.xl, backgroundColor: colors.surfaceAlt },

  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  brand: { fontSize: type.title, fontWeight: '800', color: colors.text, flex: 1 },
  hsPill: {
    paddingHorizontal: space(2), paddingVertical: space(0.5),
    borderRadius: radius.full, backgroundColor: colors.warningSoft,
  },
  hsPillText: { fontSize: type.caption },

  priceRow: { flexDirection: 'row', alignItems: 'center', gap: space(5) },
  priceDivider: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: colors.border },
  price: { fontSize: type.title, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  priceUnit: { fontSize: type.caption, color: colors.textMuted, marginTop: -2 },

  hsNote: { fontSize: type.caption, color: colors.warningText, fontWeight: '600' },

  chooseBtn: { borderRadius: radius.lg, paddingVertical: space(3.5), alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  chooseBtnOff: { backgroundColor: colors.surfaceAlt },
  chooseBtnOn: { backgroundColor: colors.accent },
  chooseText: { fontSize: type.label, fontWeight: '800', color: colors.text },

  note: { fontSize: type.caption, color: colors.textFaint, lineHeight: 18, textAlign: 'center' },
});
