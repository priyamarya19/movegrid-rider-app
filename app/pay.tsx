import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, StyleSheet } from 'react-native';

import { Button } from '@/components/ui/Button';
import { cardShadow, colors, radius, space } from '@/constants/theme';
import { submitPaymentClaim, uploadScreenshot } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatINR } from '@/lib/format';
import { useLang } from '@/lib/i18n';

// भुगतान करें — the rider pays through ANY UPI app they already use, then
// submits proof here. The claim goes to the ops verification queue; the ledger
// only moves when the team approves it.
export default function PayScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const { t } = useLang();
  const params = useLocalSearchParams<{ amount?: string; dailyRate?: string }>();

  const [amount, setAmount] = useState(params.amount ?? '');
  const [utr, setUtr] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const amountNum = Number(amount);
  const rate = params.dailyRate ? Number(params.dailyRate) : null;
  const daysPreview = rate && amountNum > 0 ? Math.floor(amountNum / rate) : 0;
  const canSubmit = amountNum > 0 && !!imageUri && !busy;

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  };

  const submit = async () => {
    if (!token || !canSubmit || !imageUri) return;
    setBusy(true);
    setError(null);
    try {
      const { key } = await uploadScreenshot(token, imageUri);
      await submitPaymentClaim(token, { amount: amountNum, utr: utr.trim() || null, screenshot_key: key });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('pay.submitFailed'));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <>
        <Stack.Screen options={{ title: t('pay.screenTitle') }} />
        <View style={styles.doneWrap}>
          <View style={styles.doneIcon}>
            <FontAwesome name="check" size={30} color={colors.good} />
          </View>
          <Text style={styles.doneTitle}>{t('pay.doneTitle')}</Text>
          <Text style={styles.doneSub}>{t('pay.doneSub', { amount: formatINR(amountNum) })}</Text>
          <Button title={t('pay.ok')} onPress={() => router.back()} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: t('pay.screenTitle') }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.label}>{t('pay.amountLabel')}</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="1680"
              placeholderTextColor={colors.textFaint}
              keyboardType="number-pad"
              style={[styles.input, styles.amountInput]}
            />
            {daysPreview > 0 ? (
              <Text style={styles.hintGood}>{t('pay.daysPreview', { days: daysPreview })}</Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.stepTitle}>{t('pay.step1')}</Text>
            <Text style={styles.stepSub}>{t('pay.step1Sub')}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.stepTitle}>{t('pay.step2')}</Text>
            {imageUri ? (
              <Pressable onPress={pickImage}>
                <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
                <Text style={styles.changePhoto}>{t('pay.changeScreenshot')}</Text>
              </Pressable>
            ) : (
              <Pressable onPress={pickImage} style={styles.upload}>
                <FontAwesome name="camera" size={18} color={colors.accent} />
                <Text style={styles.uploadText}>{t('pay.pickScreenshot')}</Text>
              </Pressable>
            )}
            <TextInput
              value={utr}
              onChangeText={setUtr}
              placeholder={t('pay.utrPlaceholder')}
              placeholderTextColor={colors.textFaint}
              style={styles.input}
              autoCapitalize="characters"
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            title={busy ? t('pay.submitting') : t('pay.submitForVerification')}
            onPress={submit}
            loading={busy}
            disabled={!canSubmit}
          />
          <Text style={styles.note}>{t('pay.footnote')}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space(4), gap: space(3), paddingBottom: space(10) },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: space(4),
    gap: space(2.5),
    ...cardShadow,
  },
  label: { fontSize: 13, fontWeight: '700', color: colors.text },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space(3.5),
    paddingVertical: space(2.5),
    fontSize: 15,
    color: colors.text,
  },
  amountInput: { fontSize: 22, fontWeight: '700' },
  hintGood: { fontSize: 12, color: colors.good, fontWeight: '600' },
  stepTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  stepSub: { fontSize: 12.5, color: colors.textMuted, lineHeight: 18 },
  upload: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space(1.5),
    paddingVertical: space(6),
  },
  uploadText: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  preview: { width: '100%', height: 180, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  changePhoto: { color: colors.accent, fontSize: 12, fontWeight: '700', textAlign: 'center', paddingTop: space(2) },
  error: { color: colors.danger, fontSize: 13 },
  note: { fontSize: 11.5, color: colors.textFaint, textAlign: 'center', lineHeight: 16 },
  doneWrap: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: space(6), gap: space(3) },
  doneIcon: {
    width: 72, height: 72, borderRadius: radius.full, backgroundColor: colors.goodSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  doneTitle: { fontSize: 19, fontWeight: '800', color: colors.text },
  doneSub: { fontSize: 13.5, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
