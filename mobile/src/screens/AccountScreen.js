import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../api/config';
import { INK } from '../utils/chartColors';

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  function confirmLogout() {
    Alert.alert('Sign out?', 'You can sign back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => logout() },
    ]);
  }

  return (
    <View style={[styles.flex, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.title}>Account</Text>

      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user?.name || '?').charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role}</Text>
          </View>
        </View>
      </View>

      <Pressable style={styles.logoutButton} onPress={confirmLogout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Corner Grocery Owner App</Text>
        <Text style={styles.footerMuted}>Connected to {API_URL}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f9fafb', paddingHorizontal: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    gap: 14,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: '#111827' },
  email: { fontSize: 12, color: INK.muted, marginTop: 2 },
  roleBadge: { alignSelf: 'flex-start', backgroundColor: '#f0fdf4', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginTop: 6 },
  roleText: { fontSize: 10, fontWeight: '700', color: '#16a34a', letterSpacing: 0.4 },
  logoutButton: { marginTop: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  logoutText: { color: '#dc2626', fontWeight: '700', fontSize: 14 },
  footer: { marginTop: 32, alignItems: 'center' },
  footerText: { fontSize: 12, color: INK.muted },
  footerMuted: { fontSize: 10, color: '#c3c2b7', marginTop: 4, textAlign: 'center', paddingHorizontal: 24 },
});
