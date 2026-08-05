import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { HubCard } from '@/components/HubCard';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { ErrorState, LoadingState } from '@/components/ui/QueryStates';
import { colors, radius, space, type } from '@/constants/theme';
import {
  getMe, getMyClaims, getMyHub, getMyRent,
  type PaymentClaim, type RiderHub, type RiderMe, type RiderRent,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatDate, formatINR } from '@/lib/format';
import { useLang } from '@/lib/i18n';
import { useApiQuery } from '@/lib/useApiQuery';

/**
 * Home — one screen, three lives:
 *
 *  1. No city picked yet          → punted to /city
 *  2. No scooter yet              → onboarding: where to go, who to call, KYC
 *  3. Holding a scooter           → My Rent: what's owed, by when, pay button
 *
 * The state comes from the server every time (has_active_assignment, kyc.*,
 * hub_chosen) rather than from anything remembered on the device, so a handover
 * or a KYC approval at the hub is reflected the moment the rider pulls down.
 */
export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { t } = useLang();

  const meFetcher = useCallback((tk: string) => getMe(tk), []);
  const rentFetcher = useCallback((tk: string) => getMyRent(tk), []);
  const claimsFetcher = useCallback((tk: string) => getMyClaims(tk), []);
  const hubFetcher = useCallback((tk: string) => getMyHub(tk), []);

  const me = useApiQuery<RiderMe>(meFetcher, [], { cacheKey: 'me' });
  const rent = useApiQuery<RiderRent>(rentFetcher, [], { cacheKey: 'me:rent' });
  const claims = useApiQuery<{ claims: PaymentClaim[] }>(claimsFetcher, [], { cacheKey: 'me:claims' });
  const hub = useApiQuery<{ hub: RiderHub | null }>(hubFetcher, [], { cacheKey: 'me:hub' });

  const loading = me.loading || rent.loading;
  const error = me.error ?? rent.error;
  const r = rent.data;
  const owes = (r?.outstanding_now ?? 0) > 0;
  const pendingClaims = (claims.data?.claims ?? []).filter((c) => c.status === 'pending');
  const pendingClaimTotal = pendingClaims.reduce((s, c) => s + c.amount, 0);

  // A rider with no hub can't be shown an address or an ops number, so the city
  // step comes first. Guarded on loaded data — never redirect off a null.
  useEffect(() => {
    if (me.data && me.data.hub_chosen === false) router.replace('/city' as Href);
  }, [me.data, router]);

  const refetchAll = () => {
    me.refetch();
    rent.refetch();
    claims.refetch();
    hub.refetch();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {loading ? (
        <LoadingState label={t('common.loading')} />
      ) : error ? (
        <ErrorState message={error} onRetry={refetchAll} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={me.refreshing || rent.refreshing}
              onRefresh={refetchAll}
              tintColor={colors.accent}
            />
          }>
          <View style={styles.header}>
            <Text style={styles.greeting}>
              {t('home.greeting', { name: user?.name?.split(' ')[0] ?? 'Rider' })} 👋
            </Text>
            <LanguageToggle compact />
          </View>

          {r?.has_active_assignment ? (
            <RentView
              r={r}
              me={me.data}
              owes={owes}
              pendingClaimTotal={pendingClaimTotal}
              hasPendingClaims={pendingClaims.length > 0}
              onPay={() =>
                router.push({
                  pathname: '/pay',
                  params: {
                    amount: owes ? String(r.outstanding_now) : '',
                    dailyRate: r.daily_rent != null ? String(r.daily_rent) : '',
                  },
                })
              }
              onDocuments={() => router.push('/documents' as Href)}
            />
          ) : (
            <OnboardingView
              me={me.data}
              hub={hub.data?.hub ?? null}
              onStartKyc={() => router.push('/kyc')}
              onScooters={() => router.push('/scooters' as Href)}
            />
          )}

          <Pressable
            style={styles.signoutRow}
            onPress={() =>
              Alert.alert(t('common.logout'), t('common.logoutConfirm'), [
                { text: t('common.no'), style: 'cancel' },
                { text: t('common.yes'), onPress: () => void signOut() },
              ])
            }>
            <Text style={styles.signout}>{t('common.logout')}</Text>
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Rider holding a scooter: the money answers, above the fold ───────────────
function RentView({
  r, me, owes, pendingClaimTotal, hasPendingClaims, onPay, onDocuments,
}: {
  r: RiderRent;
  me: RiderMe | null;
  owes: boolean;
  pendingClaimTotal: number;
  hasPendingClaims: boolean;
  onPay: () => void;
  onDocuments: () => void;
}) {
  const { t } = useLang();
  return (
    <>
      <Card style={[styles.hero, owes ? styles.heroDue : styles.heroOk]}>
        <Text style={styles.heroLabel}>{owes ? t('rent.outstanding') : t('rent.allPaid')}</Text>
        <Text style={[styles.heroAmount, { color: owes ? colors.dangerText : colors.money }]}>
          {formatINR(r.outstanding_now)}
        </Text>
        {owes && r.next_due_date ? (
          <Text style={styles.heroSub}>
            {t('rent.dueDate')}: {formatDate(r.next_due_date)}
            {r.rent_credit > 0 ? ` · ${t('rent.creditAdjusted', { amount: formatINR(r.rent_credit) })}` : ''}
          </Text>
        ) : (
          <Text style={styles.heroSub}>
            {r.next_due_date ? `${t('rent.nextDue')}: ${formatDate(r.next_due_date)}` : ''}
          </Text>
        )}
      </Card>

      {hasPendingClaims ? (
        <Card style={styles.reviewCard}>
          <Text style={styles.reviewText}>
            ⏳ {t('rent.claimInReview', { amount: formatINR(pendingClaimTotal) })}
          </Text>
        </Card>
      ) : null}

      <Button title={t('rent.payNow')} onPress={onPay} />

      <Card>
        <Row label={t('rent.paidThrough')} value={r.paid_through_date ? formatDate(r.paid_through_date) : '—'} />
        <Row label={t('rent.nextDue')} value={r.next_due_date ? formatDate(r.next_due_date) : '—'} warn={owes} />
        <Row label={t('rent.dailyRate')} value={r.daily_rent ? formatINR(r.daily_rent) : '—'} />
        {r.rent_credit > 0 ? <Row label={t('rent.creditBalance')} value={formatINR(r.rent_credit)} good /> : null}
      </Card>

      {me?.vehicle ? (
        <Card>
          <Row label={`🛵 ${me.vehicle.ev_number}`} value={me.vehicle.model ?? ''} />
          <Row label={t('rent.since')} value={formatDate(me.vehicle.assigned_date)} />
          {r.payments[0] ? (
            <Row
              label={t('rent.lastPayment')}
              value={`${formatINR(r.payments[0].amount)} · ${formatDate(r.payments[0].date)}`}
            />
          ) : null}
        </Card>
      ) : null}

      <DocumentsRow me={me} onPress={onDocuments} />
    </>
  );
}

// ── Rider without a scooter: get them to the hub ─────────────────────────────
// The tracker tells them where they are; the hub card tells them where to go.
// Both are visible at once deliberately — "your KYC is pending" with no address
// underneath it is the thing that generates a phone call.
function OnboardingView({
  me, hub, onStartKyc, onScooters,
}: {
  me: RiderMe | null;
  hub: RiderHub | null;
  onStartKyc: () => void;
  onScooters: () => void;
}) {
  const { t } = useLang();
  const kyc = me?.kyc;
  const verified = !!kyc?.docs_verified;

  const steps = [
    { title: t('onb.accountCreated'), sub: me?.rider_code ?? '', state: 'done' as const },
    {
      title: t('onb.completeKyc'),
      sub: kyc?.submitted ? t('onb.kycDone') : t('onb.completeKycSub'),
      state: kyc?.submitted ? ('done' as const) : ('active' as const),
    },
    {
      title: t('onb.verification'),
      sub: verified
        ? t('onb.verificationDone')
        : kyc?.submitted
          ? t('onb.verificationWaiting')
          : t('onb.verificationLater'),
      state: verified ? ('done' as const) : kyc?.submitted ? ('active' as const) : ('todo' as const),
    },
    {
      title: t('onb.visitHub'),
      sub: hub?.name ?? me?.hub?.name ?? t('onb.visitHubLater'),
      state: verified ? ('active' as const) : ('todo' as const),
    },
  ];

  return (
    <>
      {!kyc?.submitted ? (
        <Card style={styles.pendingBanner}>
          <Text style={styles.pendingTitle}>{t('hub.pendingTitle')}</Text>
          <Text style={styles.pendingBody}>{t('hub.pendingBody')}</Text>
        </Card>
      ) : null}

      {hub ? <HubCard hub={hub} /> : null}

      {!kyc?.submitted ? (
        <Button title={t('onb.startKyc')} onPress={onStartKyc} variant="secondary" icon="📝" />
      ) : verified && hub ? (
        <Card style={styles.reviewCard}>
          <Text style={styles.reviewText}>🎉 {t('onb.readyMessage', { hub: hub.name })}</Text>
        </Card>
      ) : null}

      <Card style={{ gap: space(3) }}>
        {steps.map((s, i) => (
          <View key={s.title} style={styles.trackStep}>
            <View
              style={[
                styles.trackDot,
                s.state === 'done' && { backgroundColor: colors.money },
                s.state === 'active' && { backgroundColor: colors.accent },
              ]}>
              <Text style={[styles.trackDotText, s.state === 'active' && { color: colors.onAccent }]}>
                {s.state === 'done' ? '✓' : i + 1}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.trackTitle, s.state === 'todo' && { color: colors.textFaint }]}>
                {s.title}
              </Text>
              {s.sub ? <Text style={styles.trackSub}>{s.sub}</Text> : null}
            </View>
          </View>
        ))}
      </Card>

      <Pressable onPress={onScooters}>
        <Card style={styles.scootersRow}>
          <Text style={{ fontSize: 22 }}>🛵</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.scootersTitle}>{t('hub.viewScooters')}</Text>
            {me?.preferred_brand ? (
              <Text style={styles.scootersSub}>{me.preferred_brand} · {t('scooters.wanted')}</Text>
            ) : (
              <Text style={styles.scootersSub}>{t('scooters.subtitle')}</Text>
            )}
          </View>
          <Text style={styles.chevron}>→</Text>
        </Card>
      </Pressable>
    </>
  );
}

// PAN / DL status + the upgrade path to high-speed, live from the server:
// on file → verified by the team → the high-speed gate opens.
function DocumentsRow({ me, onPress }: { me: RiderMe | null; onPress: () => void }) {
  const { t } = useLang();
  const d = me?.documents;
  if (!d) return null;
  const badge = (x: { on_file: boolean; verified: boolean }) =>
    x.verified ? '✓' : x.on_file ? t('docs.verifyPending') : '✗';
  const allVerified = d.pan.verified && d.dl.verified;
  return (
    <Pressable onPress={onPress}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space(3) }}>
        <Text style={{ fontSize: 18 }}>📄</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.docRowTitle}>
            {t('docs.title')} · PAN {badge(d.pan)} · DL {badge(d.dl)}
          </Text>
          <Text style={styles.docRowSub}>
            {allVerified ? t('docs.readyHighSpeed') : t('docs.needHighSpeed')}
          </Text>
        </View>
        <Text style={styles.chevron}>→</Text>
      </Card>
    </Pressable>
  );
}

function Row({ label, value, warn, good }: { label: string; value: string; warn?: boolean; good?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, warn && { color: colors.warningText }, good && { color: colors.money }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space(4), gap: space(3), paddingBottom: space(12) },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space(2) },
  greeting: { fontSize: type.title, fontWeight: '800', color: colors.text, flexShrink: 1 },
  signoutRow: { alignItems: 'center', paddingVertical: space(4) },
  signout: { fontSize: type.caption, fontWeight: '700', color: colors.textFaint },

  hero: { alignItems: 'flex-start', gap: 2 },
  heroDue: { backgroundColor: '#FFF9F8' },
  heroOk: { backgroundColor: '#F3FBF7' },
  heroLabel: {
    fontSize: type.overline, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  heroAmount: { fontSize: type.moneyHero, fontWeight: '800', letterSpacing: -0.5 },
  heroSub: { fontSize: type.caption, color: colors.textMuted },

  reviewCard: { backgroundColor: colors.accentSoft },
  reviewText: { fontSize: type.caption, color: colors.accentText, fontWeight: '600', lineHeight: 18 },

  pendingBanner: { backgroundColor: colors.warningSoft, gap: space(1) },
  pendingTitle: { fontSize: type.subtitle, fontWeight: '800', color: colors.warningText },
  pendingBody: { fontSize: type.label, color: colors.text, lineHeight: 20 },

  row: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space(2),
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  rowLabel: { color: colors.textMuted, fontSize: type.label },
  rowValue: { color: colors.text, fontSize: type.label, fontWeight: '700' },

  trackStep: { flexDirection: 'row', gap: space(3), alignItems: 'flex-start' },
  trackDot: {
    width: 24, height: 24, borderRadius: radius.full, backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  trackDotText: { color: '#fff', fontSize: type.overline, fontWeight: '800' },
  trackTitle: { fontSize: type.body, fontWeight: '700', color: colors.text },
  trackSub: { fontSize: type.caption, color: colors.textMuted, marginTop: 1 },

  scootersRow: { flexDirection: 'row', alignItems: 'center', gap: space(3) },
  scootersTitle: { fontSize: type.label, fontWeight: '800', color: colors.text },
  scootersSub: { fontSize: type.caption, color: colors.textMuted, marginTop: 1 },

  docRowTitle: { fontSize: type.label, fontWeight: '700', color: colors.text },
  docRowSub: { fontSize: type.caption, color: colors.textMuted, marginTop: 1 },
  chevron: { color: colors.accentText, fontWeight: '800', fontSize: type.body },
});
