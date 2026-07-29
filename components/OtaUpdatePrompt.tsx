import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View, StyleSheet } from 'react-native';

import { colors, radius, space } from '@/constants/theme';

// OTA update dialog: on launch, check EAS Update; if a new bundle exists, ask
// the rider to apply it now (download + reload) or later (Expo applies it on
// the next cold start automatically). Never shown in dev.
export function OtaUpdatePrompt() {
  const [state, setState] = useState<'hidden' | 'available' | 'downloading'>('hidden');

  useEffect(() => {
    if (__DEV__) return;
    let live = true;
    (async () => {
      try {
        const result = await Updates.checkForUpdateAsync();
        if (live && result.isAvailable) setState('available');
      } catch {
        // No connection / update server unreachable — stay silent, try next launch.
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  const applyNow = async () => {
    setState('downloading');
    try {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync(); // app restarts on the new version
    } catch {
      setState('hidden'); // download failed — the next launch will retry
    }
  };

  if (state === 'hidden') return null;

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.emoji}>🚀</Text>
          <Text style={styles.title}>नया update आया है</Text>
          <Text style={styles.sub}>
            App ka naya version taiyaar hai — behtar features aur fixes ke saath.
          </Text>
          {state === 'downloading' ? (
            <View style={styles.downloading}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.downloadingText}>Update ho raha hai… app khud restart hoga</Text>
            </View>
          ) : (
            <>
              <Pressable style={styles.primaryBtn} onPress={applyNow}>
                <Text style={styles.primaryText}>अभी update करें · Update now</Text>
              </Pressable>
              <Pressable onPress={() => setState('hidden')} hitSlop={8}>
                <Text style={styles.laterText}>बाद में · Later</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: space(6) },
  card: {
    width: '100%', maxWidth: 340, backgroundColor: colors.surface, borderRadius: radius.xl,
    padding: space(6), alignItems: 'center', gap: space(2.5),
  },
  emoji: { fontSize: 34 },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  sub: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19 },
  primaryBtn: {
    alignSelf: 'stretch', backgroundColor: colors.accent, borderRadius: radius.lg,
    paddingVertical: space(3), alignItems: 'center', marginTop: space(1.5),
  },
  primaryText: { color: '#fff', fontSize: 14.5, fontWeight: '800' },
  laterText: { color: colors.textFaint, fontSize: 13, fontWeight: '700', paddingVertical: space(1) },
  downloading: { alignItems: 'center', gap: space(2), paddingVertical: space(2) },
  downloadingText: { fontSize: 12.5, color: colors.textMuted },
});
