import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View, StyleSheet } from 'react-native';

import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/QueryStates';
import { colors, radius, space } from '@/constants/theme';
import { getMyClaims, getMyRent, type PaymentClaim, type RiderRent } from '@/lib/api';
import { formatDate, formatINR } from '@/lib/format';
import { useApiQuery } from '@/lib/useApiQuery';

// मेरा खाता — every rupee the rider ever paid (Payments) and the week-wise
// view (Weeks), mirroring the dashboard's rent cycle exactly.
export default function LedgerScreen() {
  const fetcher = useCallback((t: string) => getMyRent(t), []);
  const claimsFetcher = useCallback((t: string) => getMyClaims(t), []);
  const { data, loading, refreshing, error, refetch } = useApiQuery<RiderRent>(fetcher, [], { cacheKey: 'me:rent' });
  const claimsQ = useApiQuery<{ claims: PaymentClaim[] }>(claimsFetcher, [], { cacheKey: 'me:claims' });
  const [tab, setTab] = useState<'payments' | 'weeks'>('payments');

  if (loading) return <LoadingState label="खाता लोड हो रहा है…" />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const payments = data?.payments ?? [];
  // Claims still in play (pending) or recently rejected sit ABOVE the confirmed
  // ledger, so the rider always sees where their submission stands.
  const openClaims = (claimsQ.data?.claims ?? []).filter((c) => c.status !== 'approved').slice(0, 5);
  const refetchAll = () => {
    refetch();
    claimsQ.refetch();
  };
  const weeks = [...(data?.weeks ?? [])].reverse();

  const statusChip = (s: string) =>
    s === 'Collected'
      ? { label: 'जमा ✓', bg: colors.goodSoft, fg: colors.good }
      : s === 'Partial'
        ? { label: 'आधा जमा', bg: colors.warningSoft, fg: colors.warning }
        : s === 'Overdue'
          ? { label: 'बकाया', bg: colors.dangerSoft, fg: colors.danger }
          : { label: 'बाकी', bg: colors.surfaceAlt, fg: colors.textMuted };

  return (
    <View style={styles.screen}>
      <View style={styles.tabs}>
        {(
          [
            { key: 'payments', label: 'Payments' },
            { key: 'weeks', label: 'हफ़्ते · Weeks' },
          ] as const
        ).map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={[styles.tabBtn, tab === t.key && styles.tabOn]}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextOn]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'payments' ? (
        <FlatList
          data={payments}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetchAll} tintColor={colors.accent} />}
          ListHeaderComponent={
            <View>
              <Card style={styles.totalCard}>
                <Text style={styles.totalLabel}>कुल जमा · Total paid</Text>
                <Text style={styles.totalValue}>{formatINR(Math.round(data?.total_paid ?? 0))}</Text>
              </Card>
              {openClaims.map((c) => (
                <View key={c.id} style={[styles.payRow, c.status === 'rejected' && styles.rejectedRow]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.payAmount}>{formatINR(c.amount)}</Text>
                    <Text style={styles.payMeta}>
                      {formatDate(c.date)}
                      {c.utr ? ` · ${c.utr}` : ''}
                    </Text>
                    {c.status === 'rejected' && c.reject_reason ? (
                      <Text style={styles.rejectReason}>❌ {c.reject_reason}</Text>
                    ) : null}
                  </View>
                  <View style={[styles.chip, { backgroundColor: c.status === 'pending' ? colors.accentSoft : colors.dangerSoft }]}>
                    <Text style={[styles.chipText, { color: c.status === 'pending' ? colors.accent : colors.danger }]}>
                      {c.status === 'pending' ? 'Review में' : 'Reject हुआ'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          }
          ListEmptyComponent={<EmptyState icon="inbox" message="अभी कोई payment नहीं।" />}
          renderItem={({ item }) => (
            <View style={styles.payRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.payAmount}>{formatINR(item.amount)}</Text>
                <Text style={styles.payMeta}>
                  {formatDate(item.date)}
                  {item.mode ? ` · ${item.mode}` : ''}
                </Text>
                {item.period_start && item.period_end ? (
                  <Text style={styles.payPeriod}>
                    {formatDate(item.period_start)} – {formatDate(item.period_end)} का किराया
                  </Text>
                ) : null}
              </View>
              <Text style={styles.received}>✓</Text>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={weeks}
          keyExtractor={(w) => `${w.week_no}-${w.period_start}`}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={colors.accent} />}
          ListEmptyComponent={<EmptyState icon="calendar" message="अभी कोई हफ़्ता नहीं।" />}
          renderItem={({ item }) => {
            const chip = statusChip(item.status);
            return (
              <View style={styles.payRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.weekTitle}>
                    Week {item.week_no} · {formatDate(item.period_start)} – {formatDate(item.period_end)}
                  </Text>
                  <Text style={styles.payMeta}>
                    {formatINR(Math.round(item.paid))} / {formatINR(Math.round(item.amount))}
                    {item.due_date ? ` · due ${formatDate(item.due_date)}` : ''}
                  </Text>
                </View>
                <View style={[styles.chip, { backgroundColor: chip.bg }]}>
                  <Text style={[styles.chipText, { color: chip.fg }]}>{chip.label}</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  tabs: {
    flexDirection: 'row',
    margin: space(4),
    marginBottom: space(2),
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  tabBtn: { flex: 1, paddingVertical: space(2.5), alignItems: 'center', backgroundColor: colors.surface },
  tabOn: { backgroundColor: colors.accentSoft },
  tabText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  tabTextOn: { color: colors.accent },
  content: { padding: space(4), paddingTop: space(2), paddingBottom: space(10) },
  totalCard: { marginBottom: space(2), alignItems: 'flex-start', gap: 2 },
  totalLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  totalValue: { fontSize: 24, fontWeight: '800', color: colors.accent },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: space(3.5),
    marginBottom: space(2),
  },
  payAmount: { fontSize: 16, fontWeight: '800', color: colors.text },
  payMeta: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  payPeriod: { fontSize: 11.5, color: colors.textFaint, marginTop: 1 },
  received: { color: colors.good, fontSize: 16, fontWeight: '800' },
  weekTitle: { fontSize: 13.5, fontWeight: '700', color: colors.text },
  rejectedRow: { borderColor: 'rgba(192,57,43,0.3)' },
  rejectReason: { fontSize: 11.5, color: colors.danger, marginTop: 2 },
  chip: { borderRadius: radius.full, paddingHorizontal: space(2.5), paddingVertical: space(1) },
  chipText: { fontSize: 11, fontWeight: '800' },
});
