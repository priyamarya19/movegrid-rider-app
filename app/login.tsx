import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { colors, radius, space } from '@/constants/theme';
import { getTestRiders, requestOtp, testLoginAs, verifyOtp, type TestRider } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

// Two-step login: registered mobile → 6-digit OTP. Hindi-first copy with
// English inline, matching the rider base.
export default function LoginScreen() {
  const { signIn, signInWithToken, sessionExpired } = useAuth();
  const [step, setStep] = useState<'mobile' | 'otp' | 'pick'>('mobile');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<string | null>(null);
  const [isNewNumber, setIsNewNumber] = useState(false);
  // UAT tester mode: verify(9999999999, 0000) returns a tester token and the
  // rider picker opens; production never issues one.
  const [testerToken, setTesterToken] = useState<string | null>(null);
  const [riders, setRiders] = useState<TestRider[]>([]);
  const [riderSearch, setRiderSearch] = useState('');

  const mobileOk = mobile.replace(/\D/g, '').length === 10;

  const sendOtp = async () => {
    if (!mobileOk || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await requestOtp(mobile);
      setChannel(res.channel);
      setIsNewNumber(res.exists === false);
      setStep('otp');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the code');
    } finally {
      setBusy(false);
    }
  };

  const submitOtp = async () => {
    if (otp.trim().length < 4 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await verifyOtp(mobile, otp.trim());
      if (res.tester) {
        const list = await getTestRiders(res.token);
        setTesterToken(res.token);
        setRiders(list.riders);
        setStep('pick');
        setBusy(false);
        return;
      }
      await signInWithToken(res.token, { name: res.name, mobile });
      // AuthGate redirects to home.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
      setBusy(false);
    }
  };

  const pickRider = async (r: TestRider) => {
    if (!testerToken || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await testLoginAs(testerToken, r.id);
      await signInWithToken(res.token, { name: res.name, mobile: r.mobile });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open this rider');
      setBusy(false);
    }
  };

  const filteredRiders = riders.filter((r) => {
    const q = riderSearch.trim().toLowerCase();
    return !q || r.name.toLowerCase().includes(q) || (r.rider_code ?? '').toLowerCase().includes(q) || r.mobile.includes(q);
  });

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.content, step === 'pick' && styles.contentTop]}
          keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <Image source={require('@/assets/images/logo-icon.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.brandName}>MoveGrid Rider</Text>
            <Text style={styles.tag}>आपकी गाड़ी, आपका हिसाब</Text>
          </View>

          {sessionExpired ? <Text style={styles.notice}>Session खत्म हो गया — दोबारा लॉगिन करें</Text> : null}

          {step === 'mobile' ? (
            <View style={styles.card}>
              <Text style={styles.label}>रजिस्टर्ड मोबाइल नंबर · Mobile number</Text>
              <TextInput
                value={mobile}
                onChangeText={setMobile}
                placeholder="98765 43210"
                placeholderTextColor={colors.textFaint}
                keyboardType="phone-pad"
                maxLength={13}
                style={styles.input}
                autoFocus
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button title="OTP भेजें · Send OTP" onPress={sendOtp} loading={busy} disabled={!mobileOk || busy} />
              <Text style={styles.hint}>पुराने rider — registered number डालें · नए rider — अपना number डालें, account यहीं बनेगा</Text>
            </View>
          ) : step === 'otp' ? (
            <View style={styles.card}>
              <Text style={styles.label}>OTP डालें</Text>
              <Text style={styles.sub}>
                {channel === 'dev' || channel === 'test' ? 'अपने hub incharge se code lein' : `+91 ${mobile} par bheja gaya`}
              </Text>
              {isNewNumber ? (
                <Text style={styles.newBadge}>✨ नया account banega is number se — OTP ke baad KYC poora karein</Text>
              ) : null}
              <TextInput
                value={otp}
                onChangeText={setOtp}
                placeholder="••••••"
                placeholderTextColor={colors.textFaint}
                keyboardType="number-pad"
                maxLength={6}
                style={[styles.input, styles.otpInput]}
                autoFocus
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button title="लॉगिन करें · Login" onPress={submitOtp} loading={busy} disabled={otp.trim().length < 4 || busy} />
              <Pressable onPress={() => { setStep('mobile'); setOtp(''); setError(null); }}>
                <Text style={styles.link}>नंबर बदलें · Change number</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.label}>🧪 Tester mode — किस rider की app देखनी है?</Text>
              <TextInput
                value={riderSearch}
                onChangeText={setRiderSearch}
                placeholder="Search name / code / mobile"
                placeholderTextColor={colors.textFaint}
                style={styles.input}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              {/* Own scroll area — a capped plain View clips on Android with no way to reach the rest. */}
              <ScrollView style={styles.riderList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {filteredRiders.slice(0, 60).map((r, i) => (
                  <Pressable
                    key={r.id}
                    disabled={busy}
                    onPress={() => pickRider(r)}
                    style={({ pressed }) => [styles.riderRow, i > 0 && styles.riderRowBorder, pressed && { opacity: 0.6 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.riderName}>{r.name}</Text>
                      <Text style={styles.riderMeta}>
                        {r.rider_code ?? '—'} · {r.mobile}
                        {r.ev_number ? ` · ${r.ev_number}` : ' · no vehicle'}
                      </Text>
                    </View>
                    <Text style={styles.link}>→</Text>
                  </Pressable>
                ))}
                {filteredRiders.length === 0 ? <Text style={styles.hint}>No riders match.</Text> : null}
              </ScrollView>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, justifyContent: 'center', padding: space(5), gap: space(5) },
  // Picker step: top-anchored (centering an oversized card breaks scrolling).
  contentTop: { justifyContent: 'flex-start', paddingTop: space(10) },
  brand: { alignItems: 'center', gap: space(1.5) },
  logo: { width: 56, height: 56 },
  brandName: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  tag: { fontSize: 13, color: colors.textMuted },
  notice: { textAlign: 'center', color: colors.warning, fontSize: 13, fontWeight: '600' },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: space(5),
    gap: space(3),
  },
  label: { fontSize: 13, fontWeight: '700', color: colors.text },
  sub: { fontSize: 12, color: colors.textMuted, marginTop: -space(1.5) },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space(4),
    paddingVertical: space(3),
    fontSize: 16,
    color: colors.text,
  },
  otpInput: { textAlign: 'center', fontSize: 24, letterSpacing: 8, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 13 },
  hint: { fontSize: 12, color: colors.textFaint, textAlign: 'center' },
  link: { color: colors.accent, fontSize: 13, fontWeight: '700', textAlign: 'center', paddingVertical: space(1) },
  newBadge: { fontSize: 12, color: colors.accent, fontWeight: '600', lineHeight: 17 },
  riderList: { maxHeight: 440 },
  riderRow: { flexDirection: 'row', alignItems: 'center', gap: space(2), paddingVertical: space(2.5) },
  riderRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  riderName: { fontSize: 14, fontWeight: '700', color: colors.text },
  riderMeta: { fontSize: 11.5, color: colors.textMuted },
});
