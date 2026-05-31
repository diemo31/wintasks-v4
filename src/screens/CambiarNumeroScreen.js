import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme';
import { useGlobal } from '../context/GlobalContext';

const COUNTRY_CODES = [
  { code: '+54', flag: '🇦🇷', label: 'Argentina' },
  { code: '+55', flag: '🇧🇷', label: 'Brasil' },
  { code: '+34', flag: '🇪🇸', label: 'España' },
  { code: '+1', flag: '🇺🇸', label: 'Estados Unidos' },
  { code: '+52', flag: '🇲🇽', label: 'México' },
  { code: '+598', flag: '🇺🇾', label: 'Uruguay' },
  { code: '+56', flag: '🇨🇱', label: 'Chile' },
  { code: '+57', flag: '🇨🇴', label: 'Colombia' },
  { code: '+51', flag: '🇵🇪', label: 'Perú' },
];

const getExpectedDigits = (code) => {
  if (code === '+54') return 10;
  if (code === '+52') return 10;
  if (code === '+34') return 9;
  if (code === '+1') return 10;
  return 0;
};

export default function CambiarNumeroScreen({ navigation, route }) {
  const { currentUser, users, updatePhone } = useGlobal();
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [newPhone, setNewPhone] = useState('');
  const [showCountries, setShowCountries] = useState(false);
  const [phoneExists, setPhoneExists] = useState(false);
  const [codeRequested, setCodeRequested] = useState(false);
  const [timer, setTimer] = useState(0);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);

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
    const raw = newPhone.replace(/[^0-9]/g, '');
    const expected = getExpectedDigits(selectedCountry.code);
    if (expected > 0 && raw.length === expected) {
      const full = selectedCountry.code + raw;
      setPhoneExists(full !== currentUser?.phone && users.some(u => u.phone === full));
    } else {
      setPhoneExists(false);
    }
  }, [newPhone, selectedCountry, users, currentUser]);

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer(prev => prev - 1), 1000);
    } else if (timer === 0 && codeRequested && !isPhoneVerified) {
      setCodeRequested(false);
    }
    return () => clearInterval(interval);
  }, [timer, codeRequested, isPhoneVerified]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const validatePhone = () => {
    const raw = newPhone.replace(/[^0-9]/g, '');
    const full = selectedCountry.code + raw;

    if (full === currentUser?.phone) {
      Alert.alert('Error', 'El número ingresado es el mismo que el actual');
      return false;
    }

    const exists = users.find(u => u.phone === full);
    if (exists) {
      Alert.alert('Error', 'Este número ya está registrado por otro usuario');
      return false;
    }

    if (selectedCountry.code === '+54') {
      if (raw.length !== 10) {
        Alert.alert('Error', 'Número inválido. Ej: 11 1234 5678 (sin 0 ni 15)');
        return false;
      }
    } else if (selectedCountry.code === '+52') {
      if (raw.length !== 10) {
        Alert.alert('Error', 'Número inválido. Debe tener 10 dígitos');
        return false;
      }
    } else if (selectedCountry.code === '+34') {
      if (raw.length !== 9) {
        Alert.alert('Error', 'Número inválido. Debe tener 9 dígitos');
        return false;
      }
    } else if (selectedCountry.code === '+1') {
      if (raw.length < 10 || raw.length > 11) {
        Alert.alert('Error', 'Número inválido. Debe tener 10 dígitos');
        return false;
      }
    } else {
      if (raw.length < 6 || raw.length > 15) {
        Alert.alert('Error', 'Número inválido');
        return false;
      }
    }
    return true;
  };

  const handleRequestCode = () => {
    if (!validatePhone()) return;
    setCodeRequested(true);
    setTimer(120);
    setOtp('');
    setOtpError(false);
    Alert.alert('Simulación SMS', 'Has recibido un SMS.\nTu código es: 123456');
  };

  const handleOtpChange = (text) => {
    setOtp(text);
    if (text.length === 6) {
      if (text === '123456') {
        setIsPhoneVerified(true);
        setOtpError(false);
        setTimer(0);
      } else {
        setIsPhoneVerified(false);
        setOtpError(true);
      }
    } else {
      setIsPhoneVerified(false);
      setOtpError(false);
    }
  };

  const handleConfirmChange = () => {
    const raw = newPhone.replace(/[^0-9]/g, '');
    const full = selectedCountry.code + raw;
    updatePhone(currentUser.id, full);
    Alert.alert('Número actualizado', 'Tu número de teléfono se cambió correctamente.', [
      { text: 'OK', onPress: () => navigation.navigate('DashboardAdulto', { openDrawer: !!route.params?.fromDrawer }) },
    ]);
  };

  const handleCancelChange = () => {
    setNewPhone('');
    setOtp('');
    setCodeRequested(false);
    setIsPhoneVerified(false);
    setOtpError(false);
    setTimer(0);
  };

  return (
    <LinearGradient colors={['#FFFFFF', '#FFD699', '#C06000']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Cambiar mi número</Text>
          <Text style={styles.sectionSubtitle}>Verificá tu nuevo número con un código SMS.</Text>

          <Text style={styles.label}>Número actual</Text>
          <View style={styles.currentPhoneRow}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={styles.currentPhone}>{currentUser?.phone || ''}</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.label}>Nuevo número</Text>
          <View style={styles.phoneRow}>
            <TouchableOpacity style={styles.countrySelector} onPress={() => setShowCountries(!showCountries)}>
              <Text style={styles.countryText}>{selectedCountry.flag} {selectedCountry.code}</Text>
              <Text style={styles.arrow}>{showCountries ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            <View style={{ flex: 1, position: 'relative' }}>
              <TextInput
                style={styles.phoneInput}
                placeholder="Número de celular"
                placeholderTextColor={Colors.textLight}
                keyboardType="phone-pad"
                value={newPhone}
                onChangeText={setNewPhone}
                editable={!codeRequested && !isPhoneVerified}
              />
              {(() => {
                const raw = newPhone.replace(/[^0-9]/g, '');
                const expected = getExpectedDigits(selectedCountry.code);
                if (expected > 0 && raw.length === expected) {
                  return (
                    <View style={{ position: 'absolute', right: 10, top: 0, bottom: 0, justifyContent: 'center' }}>
                      <Ionicons name={phoneExists ? 'close-circle' : 'checkmark-circle'} size={20} color={phoneExists ? Colors.error : Colors.success} />
                    </View>
                  );
                }
                return null;
              })()}
            </View>
          </View>
          {phoneExists && <Text style={styles.hintError}>Este número ya está registrado</Text>}
          {!phoneExists && selectedCountry.code === '+54' && <Text style={styles.hint}>Sin 0, 9 ni 15 — ej. BA 11 1234 5678</Text>}

          {showCountries && COUNTRY_CODES.map(c => (
            <TouchableOpacity
              key={c.code + c.label}
              style={[styles.countryOption, selectedCountry.code === c.code && styles.countryOptionActive]}
              onPress={() => { setSelectedCountry(c); setShowCountries(false); }}
            >
              <Text style={styles.countryText}>{c.flag} {c.code} {c.label}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[styles.button, (codeRequested || newPhone.length < 6 || phoneExists || isPhoneVerified) && styles.buttonDisabled]}
            onPress={handleRequestCode}
            disabled={codeRequested || newPhone.length < 6 || phoneExists || isPhoneVerified}
          >
            <Text style={styles.buttonText}>
              {codeRequested ? `Reenviar en ${formatTime(timer)}` : 'Solicitar código'}
            </Text>
          </TouchableOpacity>

          {codeRequested && !isPhoneVerified && (
            <View style={styles.otpRow}>
              <TextInput
                style={[styles.otpInput, otpError && styles.inputError]}
                placeholder="- - - - - -"
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={handleOtpChange}
              />
              {otpError && <Ionicons name="close-circle" size={24} color={Colors.error} />}
            </View>
          )}

          {isPhoneVerified && (
            <>
              <View style={styles.verifiedRow}>
                <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
                <Text style={styles.verifiedText}>Número verificado</Text>
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmChange}>
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  <Text style={styles.confirmButtonText}>Cambiar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={handleCancelChange}>
                  <Ionicons name="close" size={20} color="#64748b" />
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
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
  currentPhoneRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f0fdf4', padding: 14, borderRadius: 12,
    marginBottom: 16,
  },
  currentPhone: {
    fontSize: 16, color: '#166534', fontWeight: '600',
  },
  divider: {
    height: 1, backgroundColor: '#e2e8f0', marginBottom: 16,
  },
  phoneRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 6,
  },
  countrySelector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white,
    height: 44, paddingHorizontal: 10, borderRadius: 8,
    borderWidth: 1, borderColor: '#e2e8f0', marginRight: 8, gap: 4,
  },
  countryText: { fontSize: 15, color: Colors.text },
  arrow: { fontSize: 12, color: Colors.textLight },
  phoneInput: {
    flex: 1, backgroundColor: Colors.white, paddingVertical: 12, paddingLeft: 14, paddingRight: 36,
    borderRadius: 8, fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: '#e2e8f0',
  },
  hint: { fontSize: 12, color: Colors.textLight, marginTop: 3, paddingLeft: 100 },
  hintError: { fontSize: 12, color: Colors.error, marginTop: 3, paddingLeft: 100 },
  countryOption: { backgroundColor: Colors.white, padding: 14, borderRadius: 8, marginBottom: 4, borderWidth: 1, borderColor: '#e2e8f0' },
  countryOptionActive: { borderColor: Colors.primary },
  button: { backgroundColor: '#E05A47', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
  otpRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, gap: 12 },
  otpInput: {
    backgroundColor: Colors.white, padding: 16, borderRadius: 12, fontSize: 24, textAlign: 'center',
    letterSpacing: 8, borderWidth: 1, borderColor: '#e2e8f0', width: 200, color: Colors.text,
  },
  inputError: { borderColor: Colors.error },
  verifiedRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 16, paddingVertical: 12, backgroundColor: '#f0fdf4', borderRadius: 12,
  },
  verifiedText: { fontSize: 15, color: '#166534', fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  confirmButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#16a34a', padding: 14, borderRadius: 12,
  },
  confirmButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  cancelButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#f1f5f9', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0',
  },
  cancelButtonText: { color: '#64748b', fontSize: 15, fontWeight: '600' },
});
