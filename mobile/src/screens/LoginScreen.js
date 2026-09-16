import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../api/client';
import { INK } from '../utils/chartColors';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      // No explicit navigation here — RootNavigator swaps to MainTabs on its
      // own as soon as `isAuthenticated` flips true.
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.logo}>🛒</Text>
          <Text style={styles.title}>Corner Grocery</Text>
          <Text style={styles.subtitle}>Owner &amp; manager dashboard</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@store.test"
              placeholderTextColor={INK.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={INK.muted}
              secureTextEntry
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [styles.button, (submitting || pressed) && styles.buttonPressed]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.buttonText}>{submitting ? 'Signing in…' : 'Sign in'}</Text>
          </Pressable>

          <Text style={styles.hint}>
            This app is for managers and admins only. Cashiers ring up sales on the in-store POS terminal.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  logo: { fontSize: 36, textAlign: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', textAlign: 'center', marginTop: 8 },
  subtitle: { fontSize: 13, color: INK.muted, textAlign: 'center', marginTop: 2, marginBottom: 20 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  error: { backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: 13, padding: 10, borderRadius: 8, marginBottom: 14 },
  button: { backgroundColor: '#16a34a', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  buttonPressed: { opacity: 0.85 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  hint: { fontSize: 11, color: INK.muted, textAlign: 'center', marginTop: 16, lineHeight: 16 },
});
