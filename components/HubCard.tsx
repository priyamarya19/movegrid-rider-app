import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { colors, radius, space, type } from '@/constants/theme';
import { useLang } from '@/lib/i18n';
import type { RiderHub } from '@/lib/api';

/**
 * "Come to the hub" card: where to go, and who to call when you get lost.
 *
 * Both actions are conditional on real data. The map button only appears once
 * a map_link is saved on the hub — a button that opens nothing is worse than no
 * button — and the call button needs a contact mobile. Address falls back to
 * area + city from the API so the card is never empty.
 */
export function HubCard({ hub }: { hub: RiderHub }) {
  const { t } = useLang();

  const openMaps = async () => {
    if (!hub.map_link) return;
    const ok = await Linking.canOpenURL(hub.map_link).catch(() => false);
    if (!ok) return Alert.alert(t('common.somethingWrong'));
    await Linking.openURL(hub.map_link);
  };

  const call = async () => {
    const number = hub.contact?.mobile;
    if (!number) return;
    const url = `tel:${number.replace(/[^\d+]/g, '')}`;
    const ok = await Linking.canOpenURL(url).catch(() => false);
    if (!ok) return Alert.alert(t('common.somethingWrong'));
    await Linking.openURL(url);
  };

  const hasMap = !!hub.map_link;
  const hasCall = !!hub.contact?.mobile;

  return (
    <Card style={{ gap: space(3) }}>
      <View>
        <Text style={styles.overline}>{t('hub.yourHub')}</Text>
        <Text style={styles.hubName}>{hub.name}</Text>
        {hub.address ? <Text style={styles.address}>{hub.address}</Text> : null}
      </View>

      {hasMap || hasCall ? (
        <View style={styles.actions}>
          {hasMap ? (
            <Action label={t('hub.openMaps')} icon="📍" onPress={openMaps} primary />
          ) : null}
          {hasCall ? (
            <Action
              label={
                hub.contact?.name
                  ? t('hub.call', { name: hub.contact.name.split(' ')[0] })
                  : t('hub.callGeneric')
              }
              icon="📞"
              onPress={call}
            />
          ) : null}
        </View>
      ) : null}

      {hasCall && hub.contact?.name ? (
        <Text style={styles.contactLine}>
          {hub.contact.name} · {hub.contact.mobile}
        </Text>
      ) : null}
    </Card>
  );
}

function Action({
  label, icon, onPress, primary,
}: { label: string; icon: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        primary ? styles.actionPrimary : styles.actionPlain,
        pressed && { opacity: 0.75 },
      ]}>
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={[styles.actionLabel, primary && { color: colors.onAccent }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overline: {
    fontSize: type.overline, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  hubName: { fontSize: type.title, fontWeight: '800', color: colors.text, marginTop: 2 },
  address: { fontSize: type.label, color: colors.textMuted, marginTop: space(1), lineHeight: 20 },
  actions: { flexDirection: 'row', gap: space(2) },
  action: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: space(1.5), paddingVertical: space(3), borderRadius: radius.lg, minHeight: 46,
  },
  actionPrimary: { backgroundColor: colors.accent },
  actionPlain: { backgroundColor: colors.surfaceAlt },
  actionIcon: { fontSize: type.body },
  actionLabel: { fontSize: type.label, fontWeight: '800', color: colors.text, flexShrink: 1 },
  contactLine: { fontSize: type.caption, color: colors.textFaint },
});
