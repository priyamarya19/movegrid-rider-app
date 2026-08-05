import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View, StyleSheet } from 'react-native';

import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/QueryStates';
import { colors, radius, space, type } from '@/constants/theme';
import { getMyClaims, getMyRent, type PaymentClaim, type RiderRent } from '@/lib/api';
import { formatDate, formatINR } from '@/lib/format';
import { useLang } from '@/lib/i18n';
import { useApiQuery } from '@/lib/useApiQuery';

// मेरा खाता — every rupee the rider ever paid (Payments) and the week-wise
// view (Weeks), mirroring the dashboard's rent cycle exactly.
export default function LedgerScreen() {
  const { t } = useLang();
  const fetcher = useCallback((tk: string) => getMyRent(tk), []);
  const claimsFetcher = useCallback((tk: string) => getMyClaims(tk), []);
  const { data, loading, refreshing, error, refetch } = useApiQuery<RiderRent>(fetcher, [], { cacheKey: 'me:rent' });
  const claimsQ = useApiQuery<{ claims: PaymentClaim[] }>(claimsFetcher, [], { cacheKey: 'me:claims' });
  const [tab, setTab] = useState<'payments' | 'weeks'>('payments');

  if (loading) return <LoadingState label={t('ledger.loading')} />;
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
      ? { label: t('ledger.statusCollected'), bg: colors.accentSoft, fg: colors.money }
      : s === 'Partial'
        ? { label: t('ledger.statusPartial'), bg: colors.warningSoft, fg: colors.warningText }
        : s === 'Overdue'
          ? { label: t('ledger.statusOverdue'), bg: colors.dangerSoft, fg: colors.dangerText }
          : { label: t('ledger.statusPending'), bg: colors.surfaceAlt, fg: colors.textMuted };

  const tabs = [
    { key: 'payments' as const, label: t('ledger.tabPayments') },
    { key: 'weeks' as const, label: t('ledger.tabWeeks') },
  ];

  return (
    <View style={styles.screen}>
      <View style={styles.tabs}>
        {tabs.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => setTab(item.key)}
            style={[styles.tabBtn, tab === item.key && styles.tabOn]}>
            <Text style={[styles.tabText, tab === item.key && styles.tabTextOn]}>{item.label}</Text>
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
                <Text style={styles.totalLabel}>{t('ledger.totalPaid')}</Text>
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
                  <View
                    style={[
                      styles.chip,
                      { backgroundColor: c.status === 'pending' ? colors.accentSoft : colors.dangerSoft },
                    ]}>
                    <Text
                      style={[
                        styles.chipText,
                        { color: c.status === 'pending' ? colors.accentText : colors.dangerText },
                      ]}>
                      {c.status === 'pending' ? t('ledger.claimReview') : t('ledger.claimRejected')}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          }
          ListEmptyComponent={<EmptyState icon="inbox" message={t('ledger.noPayments')} />}
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
                    {t('ledger.rentFor', {
                      from: formatDate(item.period_start),
                      to: formatDate(item.period_end),
                    })}
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
          ListEmptyComponent={<EmptyState icon="calendar" message={t('ledger.noWeeks')} />}
          renderItem={({ item }) => {
            const chip = statusChip(item.status);
            return (
              <View style={styles.payRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.weekTitle}>
                    {t('ledger.week', { n: item.week_no })} · {formatDate(item.period_start)} –{' '}
                    {formatDate(item.period_end)}
                  </Text>
                  <Text style={styles.payMeta}>
                    {formatINR(Math.round(item.paid))} / {formatINR(Math.round(item.amount))}
                    {item.due_date ? ` · ${t('ledger.due', { date: formatDate(item.due_date) })}` : ''}
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
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    padding: 3,
  },
  tabBtn: { flex: 1, paddingVertical: space(2.5), alignItems: 'center', borderRadius: radius.full },
  tabOn: { backgroundColor: colors.surface },
  tabText: { fontSize: type.label, fontWeight: '700', color: colors.textMuted },
  tabTextOn: { color: colors.text },
  content: { padding: space(4), paddingTop: space(2), paddingBottom: space(10) },
  totalCard: { marginBottom: space(2), alignItems: 'flex-start', gap: 2 },
  totalLabel: {
    fontSize: type.overline, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  totalValue: { fontSize: type.screenTitle, fontWeight: '800', color: colors.money },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: space(3.5),
    marginBottom: space(2),
  },
  payAmount: { fontSize: type.subtitle, fontWeight: '800', color: colors.text },
  payMeta: { fontSize: type.caption, color: colors.textMuted, marginTop: 1 },
  payPeriod: { fontSize: type.overline, color: colors.textFaint, marginTop: 1 },
  received: { color: colors.money, fontSize: type.subtitle, fontWeight: '800' },
  weekTitle: { fontSize: type.label, fontWeight: '700', color: colors.text },
  rejectedRow: { borderWidth: 1, borderColor: 'rgba(220,61,67,0.3)' },
  rejectReason: { fontSize: type.overline, color: colors.dangerText, marginTop: 2 },
  chip: { borderRadius: radius.full, paddingHorizontal: space(2.5), paddingVertical: space(1) },
  chipText: { fontSize: type.overline, fontWeight: '800' },
});
