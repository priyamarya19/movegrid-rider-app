import { useRouter, type Href } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { ErrorState, LoadingState } from '@/components/ui/QueryStates';
import { colors, radius, space } from '@/constants/theme';
import { getMe, getMyClaims, getMyRent, type PaymentClaim, type RiderMe, type RiderRent } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatDate, formatINR } from '@/lib/format';
import { useApiQuery } from '@/lib/useApiQuery';

// My Rent — the three answers above the fold: how much do I owe, by when,
// and one button to pay (Pay lands in Week 2 with payment claims).
export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const meFetcher = useCallback((t: string) => getMe(t), []);
  const rentFetcher = useCallback((t: string) => getMyRent(t), []);
  const claimsFetcher = useCallback((t: string) => getMyClaims(t), []);
  const me = useApiQuery<RiderMe>(meFetcher, [], { cacheKey: 'me' });
  const rent = useApiQuery<RiderRent>(rentFetcher, [], { cacheKey: 'me:rent' });
  const claims = useApiQuery<{ claims: PaymentClaim[] }>(claimsFetcher, [], { cacheKey: 'me:claims' });

  const loading = me.loading || rent.loading;
  const error = me.error ?? rent.error;
  const r = rent.data;
  const owes = (r?.outstanding_now ?? 0) > 0;
  const pendingClaims = (claims.data?.claims ?? []).filter((c) => c.status === 'pending');
  const pendingClaimTotal = pendingClaims.reduce((s, c) => s + c.amount, 0);

  const refetchAll = () => {
    me.refetch();
    rent.refetch();
    claims.refetch();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {loading ? (
        <LoadingState label="लोड हो रहा है…" />
      ) : error ? (
        <ErrorState message={error} onRetry={refetchAll} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={me.refreshing || rent.refreshing} onRefresh={refetchAll} tintColor={colors.accent} />}>
          <View style={styles.header}>
            <Text style={styles.greeting}>नमस्ते, {user?.name?.split(' ')[0] ?? 'Rider'} 👋</Text>
            <Pressable onPress={() => Alert.alert('Sign out', 'लॉगआउट करें?', [{ text: 'नहीं', style: 'cancel' }, { text: 'हाँ', onPress: () => void signOut() }])}>
              <Text style={styles.signout}>Logout</Text>
            </Pressable>
          </View>

          {r?.has_active_assignment ? (
            <>
              <Card style={[styles.hero, owes ? styles.heroDue : styles.heroOk]}>
                <Text style={styles.heroLabel}>{owes ? 'बकाया · Outstanding' : 'बकाया नहीं · All paid'}</Text>
                <Text style={[styles.heroAmount, { color: owes ? colors.danger : colors.good }]}>
                  {formatINR(r.outstanding_now)}
                </Text>
                {owes && r.next_due_date ? (
                  <Text style={styles.heroSub}>
                    Due date: {formatDate(r.next_due_date)}
                    {r.rent_credit > 0 ? ` · ${formatINR(r.rent_credit)} credit adjusted` : ''}
                  </Text>
                ) : (
                  <Text style={styles.heroSub}>
                    {r.next_due_date ? `अगला due date: ${formatDate(r.next_due_date)}` : ''}
                  </Text>
                )}
              </Card>

              {pendingClaims.length > 0 ? (
                <Card style={styles.reviewCard}>
                  <Text style={styles.reviewText}>
                    ⏳ {formatINR(pendingClaimTotal)} ka payment review mein hai — verify hone par yahan adjust ho jayega.
                  </Text>
                </Card>
              ) : null}

              <Pressable
                style={styles.payBtn}
                onPress={() =>
                  router.push({
                    pathname: '/pay',
                    params: {
                      amount: owes ? String(r.outstanding_now) : '',
                      dailyRate: r.daily_rent != null ? String(r.daily_rent) : '',
                    },
                  })
                }>
                <Text style={styles.payBtnText}>अभी भुगतान करें · Pay now</Text>
              </Pressable>

              <Card>
                <Row label="Paid through" value={r.paid_through_date ? formatDate(r.paid_through_date) : '—'} />
                <Row label="Next due" value={r.next_due_date ? formatDate(r.next_due_date) : '—'} warn={owes} />
                <Row label="Daily rate" value={r.daily_rent ? formatINR(r.daily_rent) : '—'} />
                {r.rent_credit > 0 ? <Row label="Credit balance" value={formatINR(r.rent_credit)} good /> : null}
              </Card>

              {me.data?.vehicle ? (
                <Card>
                  <Row label={`🛵 ${me.data.vehicle.ev_number}`} value={me.data.vehicle.model ?? ''} />
                  <Row
                    label="आपके पास कब से"
                    value={formatDate(me.data.vehicle.assigned_date)}
                  />
                  {r.payments[0] ? (
                    <Row label="Last payment" value={`${formatINR(r.payments[0].amount)} · ${formatDate(r.payments[0].date)}`} />
                  ) : null}
                </Card>
              ) : null}

              <DocumentsRow me={me.data} onPress={() => router.push('/documents' as Href)} />
            </>
          ) : (
            <OnboardingTracker me={me.data} onStartKyc={() => router.push('/kyc')} />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// PAN / DL status + the upgrade path to high-speed. डॉक्युमेंट state comes live
// from the server: on-file → verified by the team → high-speed gate opens.
function DocumentsRow({ me, onPress }: { me: RiderMe | null; onPress: () => void }) {
  const d = me?.documents;
  if (!d) return null;
  const badge = (x: { on_file: boolean; verified: boolean }) =>
    x.verified ? '✓' : x.on_file ? 'verify baaki' : '✗';
  const allVerified = d.pan.verified && d.dl.verified;
  return (
    <Pressable onPress={onPress}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space(3) }}>
        <Text style={{ fontSize: 18 }}>📄</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.docRowTitle}>Documents · PAN {badge(d.pan)} · DL {badge(d.dl)}</Text>
          <Text style={styles.docRowSub}>
            {allVerified ? 'High-speed गाड़ी ke liye ready ✓' : 'High-speed गाड़ी ke liye PAN + DL upload karein'}
          </Text>
        </View>
        <Text style={{ color: colors.accent, fontWeight: '800' }}>→</Text>
      </Card>
    </Pressable>
  );
}

// New / vehicle-less rider: the onboarding journey replaces the rent screens.
// Steps light up from live data — KYC submitted → docs verified (the ops team's
// KYC-verify buttons) → visit the hub for handover.
function OnboardingTracker({ me, onStartKyc }: { me: RiderMe | null; onStartKyc: () => void }) {
  const kyc = me?.kyc;
  const steps = [
    { title: 'Account बन गया', sub: me?.rider_code ?? '', state: 'done' as const },
    {
      title: 'KYC पूरा करें',
      sub: kyc?.submitted ? 'Documents jama ho gaye' : 'Naam, pata, documents',
      state: kyc?.submitted ? ('done' as const) : ('active' as const),
    },
    {
      title: 'Verification',
      sub: kyc?.docs_verified ? 'Documents verify ho gaye ✓' : kyc?.submitted ? 'Team check kar rahi hai — aam taur par same day' : 'KYC ke baad',
      state: kyc?.docs_verified ? ('done' as const) : kyc?.submitted ? ('active' as const) : ('todo' as const),
    },
    {
      title: 'Hub par aayein — गाड़ी ready',
      sub: me?.hub ? `${me.hub.name} hub` : 'Verification ke baad',
      state: kyc?.docs_verified ? ('active' as const) : ('todo' as const),
    },
  ];

  return (
    <>
      <Card style={{ gap: space(3) }}>
        {steps.map((s, i) => (
          <View key={s.title} style={styles.trackStep}>
            <View
              style={[
                styles.trackDot,
                s.state === 'done' && { backgroundColor: colors.good },
                s.state === 'active' && { backgroundColor: colors.accent },
              ]}>
              <Text style={styles.trackDotText}>{s.state === 'done' ? '✓' : i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.trackTitle, s.state === 'todo' && { color: colors.textFaint }]}>{s.title}</Text>
              {s.sub ? <Text style={styles.trackSub}>{s.sub}</Text> : null}
            </View>
          </View>
        ))}
      </Card>
      {!kyc?.submitted ? (
        <Pressable style={styles.payBtn} onPress={onStartKyc}>
          <Text style={styles.payBtnText}>KYC शुरू करें · Complete KYC</Text>
        </Pressable>
      ) : kyc?.docs_verified && me?.hub ? (
        <Card style={styles.reviewCard}>
          <Text style={styles.reviewText}>
            🎉 Documents verified! {me.hub.name} hub par aakar apni गाड़ी le jaayein. Saath laayein: original Aadhaar.
          </Text>
        </Card>
      ) : null}
    </>
  );
}

function Row({ label, value, warn, good }: { label: string; value: string; warn?: boolean; good?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, warn && { color: colors.warning }, good && { color: colors.good }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space(4), gap: space(3), paddingBottom: space(10) },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space(2) },
  greeting: { fontSize: 20, fontWeight: '800', color: colors.text },
  signout: { fontSize: 12, fontWeight: '700', color: colors.textFaint },
  hero: { alignItems: 'flex-start', gap: 2, borderWidth: 1 },
  heroDue: { borderColor: 'rgba(192,57,43,0.25)', backgroundColor: '#FFF9F8' },
  heroOk: { borderColor: 'rgba(14,147,132,0.25)', backgroundColor: '#F5FBFA' },
  heroLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  heroAmount: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  heroSub: { fontSize: 12.5, color: colors.textMuted },
  payBtn: { backgroundColor: colors.accent, borderRadius: radius.lg, paddingVertical: space(3.5), alignItems: 'center' },
  reviewCard: { backgroundColor: colors.accentSoft, borderWidth: 0 },
  reviewText: { fontSize: 12.5, color: colors.accent, fontWeight: '600', lineHeight: 18 },
  payBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space(2), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowLabel: { color: colors.textMuted, fontSize: 13.5 },
  rowValue: { color: colors.text, fontSize: 13.5, fontWeight: '700' },
  noVehicle: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  hubLine: { color: colors.text, fontSize: 13, fontWeight: '600', marginTop: space(2) },
  trackStep: { flexDirection: 'row', gap: space(3), alignItems: 'flex-start' },
  trackDot: {
    width: 24, height: 24, borderRadius: radius.full, backgroundColor: colors.border,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  trackDotText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  trackTitle: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  trackSub: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  docRowTitle: { fontSize: 13.5, fontWeight: '700', color: colors.text },
  docRowSub: { fontSize: 11.5, color: colors.textMuted, marginTop: 1 },
});
