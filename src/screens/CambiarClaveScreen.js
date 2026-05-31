import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme';
import { useGlobal, getPasswordErrors } from '../context/GlobalContext';

export default function CambiarClaveScreen({ navigation, route }) {
  const { currentUser, updatePassword } = useGlobal();
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!route.params?.fromDrawer) return;
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (e.data.action.type === 'GO_BACK' || e.data.action.type === 'POP') {
        e.preventDefault();
        navigation.navigate('DashboardAdulto', { openDrawer: true });
      }
    });
    return unsub;
  }, [navigation, route.params?.fromDrawer]);

  useEffect(() => {
    if (newPassword.length > 0) {
      setPasswordErrors(getPasswordErrors(newPassword));
    } else {
      setPasswordErrors([]);
    }
  }, [newPassword]);

  const handleChangePassword = () => {
    setSubmitted(true);

    if (currentPassword !== currentUser?.password) {
      return;
    }

    if (currentPassword === newPassword) {
      return;
    }

    if (newPassword !== confirmPassword) {
      return;
    }

    const errors = getPasswordErrors(newPassword);
    if (errors.length > 0) {
      return;
    }

    updatePassword(currentUser.id, newPassword);
    setSubmitted(false);
    Alert.alert('Clave actualizada', 'Tu clave se cambió correctamente.', [
      { text: 'OK', onPress: () => navigation.navigate('DashboardAdulto', { openDrawer: !!route.params?.fromDrawer }) },
    ]);
  };

  const currentOk = currentUser && currentPassword === currentUser.password;
  const newFormatOk = passwordErrors.length === 0 && newPassword.length > 0;
  const notSame = currentPassword.length > 0 && newPassword.length > 0 && currentPassword !== newPassword;
  const confirmOk = confirmPassword.length > 0 && newPassword === confirmPassword;
  const allOk = currentOk && newFormatOk && notSame && confirmOk;

  return (
    <LinearGradient colors={['#FFFFFF', '#FFD699', '#C06000']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Cambiar clave</Text>
          <Text style={styles.sectionSubtitle}>Ingresá tu clave actual y elegí una nueva.</Text>

          <Text style={styles.label}>Clave actual</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput, submitted && !currentOk && currentPassword.length > 0 && styles.inputError]}
              placeholder="Ingresá tu clave actual"
              placeholderTextColor={Colors.textLight}
              autoCapitalize="none"
              secureTextEntry={!showCurrent}
              value={currentPassword}
              onChangeText={(t) => { setCurrentPassword(t); setSubmitted(false); }}
            />
            <TouchableOpacity style={styles.eyeButton} onPress={() => setShowCurrent(!showCurrent)}>
              <Ionicons name={showCurrent ? 'eye-off' : 'eye'} size={22} color={Colors.textLight} />
            </TouchableOpacity>
          </View>
          {currentPassword.length > 0 && currentOk && (
            <Text style={styles.fieldOk}>✓ Clave correcta</Text>
          )}
          {submitted && !currentOk && currentPassword.length > 0 && (
            <Text style={styles.fieldError}>✗ Clave incorrecta</Text>
          )}

          <View style={styles.divider} />

          <Text style={styles.label}>Nueva clave</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Nueva clave (6-12 caracteres)"
              placeholderTextColor={Colors.textLight}
              autoCapitalize="none"
              secureTextEntry={!showNew}
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TouchableOpacity style={styles.eyeButton} onPress={() => setShowNew(!showNew)}>
              <Ionicons name={showNew ? 'eye-off' : 'eye'} size={22} color={Colors.textLight} />
            </TouchableOpacity>
          </View>
          {newPassword.length > 0 && (
            <View style={styles.hintList}>
              <Text style={[styles.hintText, /[A-Z]/.test(newPassword) && styles.hintOk]}>
                {/[A-Z]/.test(newPassword) ? '✓' : '✗'} 1 Mayúscula
              </Text>
              <Text style={[styles.hintText, /[a-z]/.test(newPassword) && styles.hintOk]}>
                {/[a-z]/.test(newPassword) ? '✓' : '✗'} 1 Minúscula
              </Text>
              <Text style={[styles.hintText, /\d/.test(newPassword) && styles.hintOk]}>
                {/\d/.test(newPassword) ? '✓' : '✗'} 1 Número
              </Text>
              <Text style={[styles.hintText, newPassword.length >= 6 && newPassword.length <= 12 && styles.hintOk]}>
                {newPassword.length >= 6 && newPassword.length <= 12 ? '✓' : '✗'} 6-12 caracteres
              </Text>
            </View>
          )}

          <Text style={[styles.label, { marginTop: 8 }]}>Repetir nueva clave</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput, submitted && !confirmOk && confirmPassword.length > 0 && styles.inputError]}
              placeholder="Repetí la nueva clave"
              placeholderTextColor={Colors.textLight}
              autoCapitalize="none"
              secureTextEntry={!showConfirm}
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); setSubmitted(false); }}
            />
            <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirm(!showConfirm)}>
              <Ionicons name={showConfirm ? 'eye-off' : 'eye'} size={22} color={Colors.textLight} />
            </TouchableOpacity>
          </View>
          {confirmPassword.length > 0 && confirmOk && (
            <Text style={styles.fieldOk}>✓ Coinciden</Text>
          )}
          {submitted && !confirmOk && confirmPassword.length > 0 && (
            <Text style={styles.fieldError}>✗ Las claves no coinciden</Text>
          )}

          {submitted && !notSame && currentPassword.length > 0 && newPassword.length > 0 && currentPassword === newPassword && (
            <Text style={[styles.fieldError, { marginTop: 8 }]}>✗ La nueva clave no puede ser igual a la actual</Text>
          )}

          <TouchableOpacity
            style={[styles.button, !allOk && styles.buttonDisabled]}
            onPress={handleChangePassword}
            disabled={!allOk}
          >
            <Text style={styles.buttonText}>Cambiar clave</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingTop: 32 },
  card: {
    backgroundColor: Colors.white, borderRadius: 24, padding: 20,
    elevation: 4, shadowColor: '#1e293b', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 10,
  },
  sectionTitle: {
    fontSize: 17, fontWeight: '900', color: '#E05A47', marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 11.2, color: '#64748b', marginBottom: 20, fontWeight: '400',
  },
  label: {
    fontSize: 13, color: '#1e293b', fontWeight: '600', marginBottom: 6,
  },
  divider: {
    height: 1, backgroundColor: '#e2e8f0', marginVertical: 16,
  },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 4,
  },
  input: {
    flex: 1, backgroundColor: Colors.white, padding: 16, borderRadius: 12,
    fontSize: 16, color: Colors.text, borderWidth: 1, borderColor: '#e2e8f0',
  },
  passwordInput: {
    paddingRight: 50,
  },
  inputError: { borderColor: Colors.error },
  eyeButton: { position: 'absolute', right: 14, padding: 4, zIndex: 1 },
  fieldOk: { fontSize: 12, color: Colors.success, marginBottom: 2 },
  fieldError: { fontSize: 12, color: Colors.error, marginBottom: 2 },
  hintList: { paddingLeft: 4, marginBottom: 4 },
  hintText: { fontSize: 12, color: Colors.error, marginBottom: 1 },
  hintOk: { color: Colors.success },
  button: { backgroundColor: '#E05A47', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
});
