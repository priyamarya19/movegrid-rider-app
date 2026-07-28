import { useCallback } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { ErrorState, LoadingState } from '@/components/ui/QueryStates';
import { colors, radius, space } from '@/constants/theme';
import { getMe, getMyRent, type RiderMe, type RiderRent } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatDate, formatINR } from '@/lib/format';
import { useApiQuery } from '@/lib/useApiQuery';

// My Rent — the three answers above the fold: how much do I owe, by when,
// and one button to pay (Pay lands in Week 2 with payment claims).
export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const meFetcher = useCallback((t: string) => getMe(t), []);
  const rentFetcher = useCallback((t: string) => getMyRent(t), []);
  const me = useApiQuery<RiderMe>(meFetcher, [], { cacheKey: 'me' });
  const rent = useApiQuery<RiderRent>(rentFetcher, [], { cacheKey: 'me:rent' });

  const loading = me.loading || rent.loading;
  const error = me.error ?? rent.error;
  const r = rent.data;
  const owes = (r?.outstanding_now ?? 0) > 0;

  const refetchAll = () => {
    me.refetch();
    rent.refetch();
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

              <Pressable
                style={styles.payBtn}
                onPress={() => Alert.alert('जल्द आ रहा है', 'UPI se payment + screenshot upload agle update mein aayega. Tab tak apne hub incharge ko payment dein.')}>
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
            </>
          ) : (
            <Card>
              <Text style={styles.noVehicle}>अभी कोई गाड़ी allot नहीं है। अपने hub se sampark करें।</Text>
              {me.data?.hub ? <Text style={styles.hubLine}>Hub: {me.data.hub.name}</Text> : null}
            </Card>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
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
  payBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space(2), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowLabel: { color: colors.textMuted, fontSize: 13.5 },
  rowValue: { color: colors.text, fontSize: 13.5, fontWeight: '700' },
  noVehicle: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  hubLine: { color: colors.text, fontSize: 13, fontWeight: '600', marginTop: space(2) },
});
