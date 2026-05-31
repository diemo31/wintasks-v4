import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme';
import { useGlobal } from '../context/GlobalContext';
import PearlBackground from '../components/PearlBackground';

export default function LoginScreen({ navigation }) {
  const { users, login } = useGlobal();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phoneStatus, setPhoneStatus] = useState('none');

  useEffect(() => {
    if (phone.length < 6) {
      setPhoneStatus('none');
      return;
    }
    const timer = setTimeout(() => {
      const fullPhone = '+54' + phone.replace(/[^0-9]/g, '');
      const exists = users.some(u => u.phone === fullPhone);
      setPhoneStatus(exists ? 'exists' : 'not_found');
    }, 500);
    return () => clearTimeout(timer);
  }, [phone, users]);

  const handleLogin = () => {
    if (!phone || !password) {
      Alert.alert('Error', 'Completá todos los campos');
      return;
    }
    if (phoneStatus === 'not_found') {
      Alert.alert('Error', 'Este número no está registrado');
      return;
    }
    const fullPhone = '+54' + phone.replace(/[^0-9]/g, '');
    if (!login(fullPhone, password)) {
      Alert.alert('Error', 'Contraseña incorrecta');
    }
  };

  return (
    <PearlBackground>
      <View style={styles.container}>
        <Text style={styles.title}>Iniciar sesión</Text>
        <View style={styles.phoneRow}>
          <TextInput
            style={[styles.input, styles.phoneInput]}
            placeholder="Teléfono"
            placeholderTextColor={Colors.textLight}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          {phoneStatus === 'exists' && <Ionicons name="checkmark-circle" size={24} color={Colors.success} style={styles.statusIcon} />}
          {phoneStatus === 'not_found' && <Ionicons name="close-circle" size={24} color={Colors.error} style={styles.statusIcon} />}
        </View>
        <View style={styles.pinRow}>
          <TextInput
            style={[styles.input, styles.pinInput]}
            placeholder="Contraseña"
            placeholderTextColor={Colors.textLight}
            autoCapitalize="none"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color={Colors.textLight} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Ingresar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Volver</Text>
        </TouchableOpacity>
      </View>
    </PearlBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: Colors.text, marginBottom: 32, textAlign: 'center' },
  input: { backgroundColor: Colors.white, padding: 16, borderRadius: 12, marginBottom: 12, fontSize: 16, color: Colors.text, borderWidth: 1, borderColor: Colors.surface },
  phoneRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  phoneInput: { flex: 1, marginBottom: 0 },
  statusIcon: { position: 'absolute', right: 14 },
  pinRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  pinInput: { flex: 1, marginBottom: 0 },
  eyeButton: { position: 'absolute', right: 14, padding: 4 },
  button: { backgroundColor: Colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  buttonText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
  link: { color: Colors.primary, textAlign: 'center', marginTop: 16, fontSize: 14 },
});
