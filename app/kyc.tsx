import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, StyleSheet } from 'react-native';

import { Button } from '@/components/ui/Button';
import { cardShadow, colors, radius, space } from '@/constants/theme';
import { submitKyc, uploadScreenshot } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLang } from '@/lib/i18n';
import { clearQueryCache } from '@/lib/queryCache';

// In-app KYC wizard — 3 steps, Hindi-first. PAN + DL become mandatory only when
// the rider wants a high-speed vehicle (the standing hub rule). Bank details are
// collected here too (decision: in-app, not at the hub).
type DocKey = 'profile' | 'aadhaarFront' | 'aadhaarBack' | 'pan' | 'dlFront' | 'dlBack';

export default function KycScreen() {
  const { token, user } = useAuth();
  const { t } = useLang();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — personal
  const [name, setName] = useState(user?.name === 'New Rider' ? '' : (user?.name ?? ''));
  const [currentAddress, setCurrentAddress] = useState('');
  const [sameAddress, setSameAddress] = useState(true);
  const [permanentAddress, setPermanentAddress] = useState('');
  const [employer, setEmployer] = useState('');
  const [pref, setPref] = useState<'low_speed' | 'high_speed' | null>(null);

  // Step 2 — references + bank
  const [famName, setFamName] = useState('');
  const [famMobile, setFamMobile] = useState('');
  const [localName, setLocalName] = useState('');
  const [localMobile, setLocalMobile] = useState('');
  const [bank, setBank] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [account, setAccount] = useState('');

  // Step 3 — documents
  const [aadhaar, setAadhaar] = useState('');
  const [pan, setPan] = useState('');
  const [dlNumber, setDlNumber] = useState('');
  const [docs, setDocs] = useState<Partial<Record<DocKey, string>>>({});

  const high = pref === 'high_speed';

  const pick = async (key: DocKey) => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled && result.assets[0]) setDocs((d) => ({ ...d, [key]: result.assets[0].uri }));
  };

  const step1Ok = name.trim().length >= 3 && currentAddress.trim().length >= 10 && pref !== null;
  const step2Ok =
    famName.trim().length >= 3 && famMobile.replace(/\D/g, '').length === 10 &&
    bank.trim().length > 0 && /^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(ifsc.trim()) && /^\d{9,18}$/.test(account.replace(/\s/g, ''));
  const step3Ok =
    /^\d{12}$/.test(aadhaar.replace(/\s/g, '')) && !!docs.aadhaarFront && !!docs.aadhaarBack &&
    (!high || (/^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/.test(pan.trim()) && !!docs.pan && dlNumber.trim().length >= 8 && !!docs.dlFront));

  const submit = async () => {
    if (!token || !step3Ok || busy) return;
    setBusy(true);
    setError(null);
    try {
      const uploaded: Partial<Record<DocKey, string>> = {};
      for (const [key, uri] of Object.entries(docs) as [DocKey, string][]) {
        const r = await uploadScreenshot(token, uri, 'kyc');
        uploaded[key] = r.key;
      }
      await submitKyc(token, {
        name: name.trim(),
        current_address: currentAddress.trim(),
        permanent_address: sameAddress ? undefined : permanentAddress.trim(),
        employer: employer.trim() || undefined,
        vehicle_pref: pref!,
        aadhaar: aadhaar.replace(/\s/g, ''),
        pan: pan.trim() || undefined,
        dl_number: dlNumber.trim() || undefined,
        family_ref_name: famName.trim(),
        family_ref_mobile: famMobile.replace(/\D/g, ''),
        local_ref_name: localName.trim() || undefined,
        local_ref_mobile: localMobile.replace(/\D/g, '') || undefined,
        bank: bank.trim(),
        ifsc: ifsc.trim().toUpperCase(),
        account_number: account.replace(/\s/g, ''),
        profile_photo_key: uploaded.profile,
        aadhaar_front_key: uploaded.aadhaarFront!,
        aadhaar_back_key: uploaded.aadhaarBack!,
        pan_key: uploaded.pan,
        dl_front_key: uploaded.dlFront,
        dl_back_key: uploaded.dlBack,
      });
      clearQueryCache(); // home must refetch the new KYC state
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.somethingWrong'));
    } finally {
      setBusy(false);
    }
  };

  const DocPicker = ({ dkey, label, required }: { dkey: DocKey; label: string; required?: boolean }) => (
    <Pressable onPress={() => pick(dkey)} style={[styles.docBox, docs[dkey] && styles.docBoxDone]}>
      {docs[dkey] ? (
        <Image source={{ uri: docs[dkey]! }} style={styles.docThumb} resizeMode="cover" />
      ) : (
        <FontAwesome name="camera" size={16} color={colors.accent} />
      )}
      <Text style={styles.docLabel}>
        {label}
        {required ? ' *' : ''}
      </Text>
      {docs[dkey] ? <FontAwesome name="check-circle" size={15} color={colors.good} /> : null}
    </Pressable>
  );

  return (
    <>
      <Stack.Screen options={{ title: t('kyc.screenTitle'), headerBackTitle: t('kyc.back') }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.progress}>
            {[1, 2, 3].map((s) => (
              <View key={s} style={[styles.progressSeg, s <= step && styles.progressOn]} />
            ))}
          </View>
          <Text style={styles.stepHint}>{t('kyc.step', { n: step })}</Text>

          {step === 1 ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t('kyc.s1Title')}</Text>
              <Field label={t('kyc.name')} value={name} onChange={setName} placeholder={t('kyc.namePlaceholder')} />
              <Field label={t('kyc.currentAddress')} value={currentAddress} onChange={setCurrentAddress} placeholder={t('kyc.addressPlaceholder')} multiline />
              <Pressable style={styles.checkRow} onPress={() => setSameAddress((v) => !v)}>
                <FontAwesome name={sameAddress ? 'check-square' : 'square-o'} size={18} color={colors.accent} />
                <Text style={styles.checkLabel}>{t('kyc.sameAddress')}</Text>
              </Pressable>
              {!sameAddress ? (
                <Field label={t('kyc.permanentAddress')} value={permanentAddress} onChange={setPermanentAddress} placeholder={t('kyc.permanentPlaceholder')} multiline />
              ) : null}
              <Field label={t('kyc.work')} value={employer} onChange={setEmployer} placeholder="Zomato / Blinkit / Porter…" />

              <Text style={styles.label}>{t('kyc.whichScooter')}</Text>
              <View style={styles.prefRow}>
                {(
                  [
                    { key: 'low_speed', label: t('kyc.lowSpeed'), sub: t('kyc.lowSpeedSub') },
                    { key: 'high_speed', label: t('kyc.highSpeed'), sub: t('kyc.highSpeedSub') },
                  ] as const
                ).map((o) => (
                  <Pressable key={o.key} onPress={() => setPref(o.key)} style={[styles.prefBtn, pref === o.key && styles.prefOn]}>
                    <Text style={[styles.prefLabel, pref === o.key && { color: colors.accentText }]}>{o.label}</Text>
                    <Text style={styles.prefSub}>{o.sub}</Text>
                  </Pressable>
                ))}
              </View>
              <Button title={t('kyc.next')} onPress={() => setStep(2)} disabled={!step1Ok} />
            </View>
          ) : step === 2 ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t('kyc.s2Title')}</Text>
              <Field label={t('kyc.famName')} value={famName} onChange={setFamName} placeholder={t('kyc.famNamePlaceholder')} />
              <Field label={t('kyc.famMobile')} value={famMobile} onChange={setFamMobile} placeholder={t('kyc.tenDigits')} keyboard="phone-pad" />
              <Field label={t('kyc.localName')} value={localName} onChange={setLocalName} placeholder={t('kyc.localNamePlaceholder')} />
              <Field label={t('kyc.localMobile')} value={localMobile} onChange={setLocalMobile} placeholder={t('kyc.tenDigits')} keyboard="phone-pad" />
              <View style={styles.divider} />
              <Field label={t('kyc.bank')} value={bank} onChange={setBank} placeholder="SBI / PNB / …" />
              <Field label={t('kyc.ifsc')} value={ifsc} onChange={(v) => setIfsc(v.toUpperCase())} placeholder="SBIN0001234" autoCap="characters" />
              <Field label={t('kyc.account')} value={account} onChange={setAccount} placeholder={t('kyc.accountPlaceholder')} keyboard="number-pad" />
              <View style={styles.navRow}>
                <Button title={t('kyc.back')} onPress={() => setStep(1)} variant="secondary" />
                <View style={{ flex: 1 }}>
                  <Button title={t('kyc.next')} onPress={() => setStep(3)} disabled={!step2Ok} />
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t('kyc.s3Title')}</Text>
              <Field label={t('kyc.aadhaar')} value={aadhaar} onChange={setAadhaar} placeholder={t('kyc.aadhaarPlaceholder')} keyboard="number-pad" />
              <DocPicker dkey="aadhaarFront" label={t('kyc.aadhaarFront')} required />
              <DocPicker dkey="aadhaarBack" label={t('kyc.aadhaarBack')} required />
              <DocPicker dkey="profile" label={t('kyc.selfie')} />
              <View style={styles.divider} />
              <Text style={styles.subNote}>
                {high ? t('kyc.docsHigh') : t('kyc.docsLow')}
              </Text>
              <Field label={`PAN number${high ? ' *' : ''}`} value={pan} onChange={(v) => setPan(v.toUpperCase())} placeholder="ABCDE1234F" autoCap="characters" />
              <DocPicker dkey="pan" label={t('kyc.panPhoto')} required={high} />
              <Field label={`${t('kyc.dlNumber')}${high ? ' *' : ''}`} value={dlNumber} onChange={(v) => setDlNumber(v.toUpperCase())} placeholder={t('kyc.dlNumber')} autoCap="characters" />
              <DocPicker dkey="dlFront" label={t('kyc.dlFront')} required={high} />
              <DocPicker dkey="dlBack" label={t('kyc.dlBack')} />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <View style={styles.navRow}>
                <Button title={t('kyc.back')} onPress={() => setStep(2)} variant="secondary" />
                <View style={{ flex: 1 }}>
                  <Button title={busy ? t('kyc.uploading') : t('kyc.submit')} onPress={submit} loading={busy} disabled={!step3Ok || busy} />
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

function Field({
  label, value, onChange, placeholder, multiline, keyboard, autoCap,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string;
  multiline?: boolean; keyboard?: 'phone-pad' | 'number-pad'; autoCap?: 'characters';
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        multiline={multiline}
        keyboardType={keyboard}
        autoCapitalize={autoCap ?? 'sentences'}
        style={[styles.input, multiline && { minHeight: 64, textAlignVertical: 'top' }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space(4), gap: space(3), paddingBottom: space(10) },
  progress: { flexDirection: 'row', gap: space(1.5) },
  progressSeg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  progressOn: { backgroundColor: colors.accent },
  stepHint: { fontSize: 11, color: colors.textFaint, fontWeight: '700' },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.xxl,
    padding: space(4), gap: space(3), ...cardShadow,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  label: { fontSize: 12.5, fontWeight: '700', color: colors.text },
  input: {
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: space(3.5), paddingVertical: space(2.5), fontSize: 14.5, color: colors.text,
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  checkLabel: { fontSize: 13, color: colors.textMuted },
  prefRow: { flexDirection: 'row', gap: space(2.5) },
  prefBtn: {
    flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg,
    padding: space(3), alignItems: 'center', gap: 2,
  },
  prefOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  prefLabel: { fontSize: 14, fontWeight: '800', color: colors.text },
  prefSub: { fontSize: 10.5, color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.border },
  subNote: { fontSize: 12.5, color: colors.textMuted, fontWeight: '600' },
  docBox: {
    flexDirection: 'row', alignItems: 'center', gap: space(3),
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border,
    borderRadius: radius.md, padding: space(3),
  },
  docBoxDone: { borderStyle: 'solid', borderColor: colors.good },
  docThumb: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  docLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  navRow: { flexDirection: 'row', gap: space(2.5), alignItems: 'stretch' },
  error: { color: colors.danger, fontSize: 13 },
});
