import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View, StyleSheet } from 'react-native';

import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { colors, radius, space } from '@/constants/theme';
import { updateDocuments, uploadScreenshot } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { clearQueryCache } from '@/lib/queryCache';

// Add / replace PAN and DL after KYC — the upgrade path from low-speed to
// high-speed: upload here → team verifies → high-speed allotment gate opens.
export default function DocumentsScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [pan, setPan] = useState('');
  const [panUri, setPanUri] = useState<string | null>(null);
  const [dlNumber, setDlNumber] = useState('');
  const [dlFrontUri, setDlFrontUri] = useState<string | null>(null);
  const [dlBackUri, setDlBackUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (set: (u: string) => void) => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled && result.assets[0]) set(result.assets[0].uri);
  };

  const panReady = /^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/.test(pan.trim()) && !!panUri;
  const dlReady = dlNumber.trim().length >= 8 && !!dlFrontUri;
  const canSubmit = (panReady || dlReady) && !busy;

  const submit = async () => {
    if (!token || !canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const body: Parameters<typeof updateDocuments>[1] = {};
      if (panReady && panUri) {
        body.pan = pan.trim().toUpperCase();
        body.pan_key = (await uploadScreenshot(token, panUri, 'kyc')).key;
      }
      if (dlReady && dlFrontUri) {
        body.dl_number = dlNumber.trim().toUpperCase();
        body.dl_front_key = (await uploadScreenshot(token, dlFrontUri, 'kyc')).key;
        if (dlBackUri) body.dl_back_key = (await uploadScreenshot(token, dlBackUri, 'kyc')).key;
      }
      await updateDocuments(token, body);
      clearQueryCache();
      toast('Documents jama ho gaye — team verify karegi', 'success');
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submit failed — try again');
    } finally {
      setBusy(false);
    }
  };

  const Doc = ({ uri, onPick, label }: { uri: string | null; onPick: () => void; label: string }) => (
    <Pressable onPress={onPick} style={[styles.docBox, uri && styles.docBoxDone]}>
      {uri ? <Image source={{ uri }} style={styles.docThumb} resizeMode="cover" /> : <FontAwesome name="camera" size={16} color={colors.accent} />}
      <Text style={styles.docLabel}>{label}</Text>
      {uri ? <FontAwesome name="check-circle" size={15} color={colors.good} /> : null}
    </Pressable>
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Documents', headerBackTitle: 'Back' }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>
          High-speed गाड़ी ke liye PAN aur DL zaroori hai. Yahan upload karein — team verify karegi, phir aap high-speed le sakte hain. Jo section update nahi karna, use khali chhod dein.
        </Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>PAN</Text>
          <TextInput
            value={pan}
            onChangeText={(v) => setPan(v.toUpperCase())}
            placeholder="ABCDE1234F"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="characters"
            style={styles.input}
          />
          <Doc uri={panUri} onPick={() => pick(setPanUri)} label="PAN card photo" />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Driving Licence</Text>
          <TextInput
            value={dlNumber}
            onChangeText={(v) => setDlNumber(v.toUpperCase())}
            placeholder="DL number"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="characters"
            style={styles.input}
          />
          <Doc uri={dlFrontUri} onPick={() => pick(setDlFrontUri)} label="DL front photo" />
          <Doc uri={dlBackUri} onPick={() => pick(setDlBackUri)} label="DL back photo (optional)" />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title={busy ? 'Upload ho raha hai…' : 'Submit karein'} onPress={submit} loading={busy} disabled={!canSubmit} />
        <Text style={styles.note}>Dono section bharna zaroori nahi — jo add karna hai sirf wahi bharein (number + photo saath mein).</Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space(4), gap: space(3), paddingBottom: space(10) },
  intro: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: space(4), gap: space(2.5),
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  input: {
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: space(3.5), paddingVertical: space(2.5), fontSize: 14.5, color: colors.text,
  },
  docBox: {
    flexDirection: 'row', alignItems: 'center', gap: space(3),
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border,
    borderRadius: radius.md, padding: space(3),
  },
  docBoxDone: { borderStyle: 'solid', borderColor: colors.good },
  docThumb: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  docLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  error: { color: colors.danger, fontSize: 13 },
  note: { fontSize: 11.5, color: colors.textFaint, textAlign: 'center', lineHeight: 16 },
});
