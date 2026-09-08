import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { supabase } from '../lib/supabase';
import ConsentScreen from './ConsentScreen';

export default function RegisterScreen({ navigation }) {
  const [step, setStep] = useState('consent'); // 'consent' | 'form'
  const [consents, setConsents] = useState(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleConsentAccepted(acceptedConsents) {
    setConsents(acceptedConsents);
    setStep('form');
  }

  async function handleRegister() {
    setError('');
    if (!fullName || !email || !password || !confirmPassword) {
      setError('Compila tutti i campi obbligatori');
      return;
    }
    if (password !== confirmPassword) {
      setError('Le password non coincidono');
      return;
    }
    if (password.length < 6) {
      setError('La password deve essere di almeno 6 caratteri');
      return;
    }

    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone,
          gdpr_accepted: true,
          gdpr_accepted_at: new Date().toISOString(),
          marketing_accepted: consents?.marketing || false,
        },
      },
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
    } else {
      setStep('success');
    }
  }

  // Step 1 — Consenso
  if (step === 'consent') {
    return (
      <View style={{ flex: 1 }}>
        <ConsentScreen onAccept={handleConsentAccepted} />
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate('Login')}>
          <Text style={styles.linkText}>
            Hai già un account? <Text style={styles.linkBold}>Accedi</Text>
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Step 3 — Successo
  if (step === 'success') {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successEmoji}>🎉</Text>
        <Text style={styles.successTitle}>Account creato!</Text>
        <Text style={styles.successSubtitle}>
          Controlla la tua email per confermare l'account.
        </Text>
        <TouchableOpacity
          style={styles.successButton}
          onPress={() => navigation.navigate('Login')}>
          <Text style={styles.successButtonText}>Vai al login →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Step 2 — Form registrazione
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.inner}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep('consent')}>
            <Text style={styles.backText}>← Indietro</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Crea account</Text>
          <Text style={styles.subtitle}>
            Inizia a prenotare in pochi secondi
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome completo *</Text>
            <TextInput
              style={styles.input}
              placeholder="Mario Rossi"
              placeholderTextColor="#BBBBBB"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="la-tua@email.com"
              placeholderTextColor="#BBBBBB"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefono</Text>
            <TextInput
              style={styles.input}
              placeholder="+39 333 1234567"
              placeholderTextColor="#BBBBBB"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password *</Text>
            <TextInput
              style={styles.input}
              placeholder="Minimo 6 caratteri"
              placeholderTextColor="#BBBBBB"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Conferma password *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ripeti la password"
              placeholderTextColor="#BBBBBB"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠ {error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Crea account</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  inner: { paddingHorizontal: 32, paddingTop: 60, paddingBottom: 40 },
  header: { marginBottom: 36 },
  backText: {
    fontSize: 15,
    color: '#888888',
    fontWeight: '500',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 15, color: '#888888', marginTop: 6 },
  form: { gap: 16 },
  inputGroup: { gap: 6 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444444',
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1A1A1A',
  },
  errorBox: {
    backgroundColor: '#FFF3F3',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorText: { fontSize: 13, color: '#E53935', fontWeight: '500' },
  button: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  linkButton: { alignItems: 'center', paddingVertical: 8 },
  linkText: { fontSize: 14, color: '#888888' },
  linkBold: { color: '#1A1A1A', fontWeight: '700' },
  alreadyAccount: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  alreadyAccountText: { fontSize: 14, color: '#888888' },
  alreadyAccountBold: { color: '#1A1A1A', fontWeight: '700' },
  successContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  successEmoji: { fontSize: 64, marginBottom: 8 },
  successTitle: { fontSize: 28, fontWeight: '700', color: '#1A1A1A' },
  successSubtitle: {
    fontSize: 15,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 22,
  },
  successButton: {
    marginTop: 24,
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  successButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
