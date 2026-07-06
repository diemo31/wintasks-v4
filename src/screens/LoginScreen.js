import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme';
import { useGlobal, getPasswordErrors } from '../context/GlobalContext';
import { supabase } from '../lib/supabase';
import PearlBackground from '../components/PearlBackground';

export default function LoginScreen({ navigation }) {
  const { users, login, setUsers } = useGlobal();
  const scrollRef = useRef(null);
  const [kbHeight, setKbHeight] = useState(0);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resolvedUser, setResolvedUser] = useState(null);

  const [recovery, setRecovery] = useState(null);
  const [recEmail, setRecEmail] = useState('');
  const [genCode, setGenCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [recNewPass, setRecNewPass] = useState('');
  const [recConfirmPass, setRecConfirmPass] = useState('');
  const [recShowPass, setRecShowPass] = useState(false);
  const [recPassErrors, setRecPassErrors] = useState([]);

  const handleRecNewPassChange = (text) => {
    setRecNewPass(text);
    setRecPassErrors(text.length > 0 ? getPasswordErrors(text) : []);
  };

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', e => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
  }, [kbHeight]);

  useEffect(() => {
    const t = setTimeout(async () => {
      const val = identifier.trim();
      if (!val || val.length < 3) { setResolvedUser(null); return; }
      const local = matchUser(val);
      if (local) { setResolvedUser(local); return; }
      const r = await resolveUser(val);
      setResolvedUser(r);
    }, 400);
    return () => clearTimeout(t);
  }, [identifier]);


  const matchUser = (val) => {
    const digits = val.replace(/\D/g, '');
    return users.find(u => u.email === val || (digits.length > 5 && u.phone.replace(/\D/g, '').endsWith(digits)));
  };

  const resolveUser = async (val) => {
    const local = matchUser(val);
    if (local) return local;
    try {
      const { data, error } = await supabase.rpc('find_user_for_login', { search_text: val });
      if (!error && data && data.length > 0) {
        const u = data[0];
        return { id: u.user_id, email: u.user_email, alias: u.user_alias, phone: u.user_phone };
      }
    } catch (_) {}
    return null;
  };

  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert('Error', 'Completá todos los campos');
      return;
    }
    const val = identifier.trim();
    let matched = matchUser(val);
    if (!matched) matched = await resolveUser(val);
    const email = matched?.email || val;
    const ok = await login(email, password);
    if (!ok) {
      Alert.alert('Error', matched ? 'Contraseña incorrecta' : 'Usuario no encontrado. Probá con tu correo electrónico.');
    }
  };

  const maskEmail = (email) => {
    const [local, domain] = email.split('@');
    if (!domain) return email;
    const visible = Math.min(3, Math.floor(local.length / 2));
    return local.slice(0, visible) + '*****@' + domain;
  };

  const [recUser, setRecUser] = useState(null);

  const handleStartRecovery = async () => {
    const val = identifier.trim();
    if (!val) { Alert.alert('Ayuda', 'Primero ingresá tu usuario, teléfono o correo'); return; }
    let user = matchUser(val);
    if (!user) user = await resolveUser(val);
    if (!user) { Alert.alert('No encontrado', 'No encontramos un usuario con esos datos. Probá con tu correo electrónico.'); return; }
    if (!user.email) { Alert.alert('Sin correo', 'Este usuario no tiene correo registrado'); return; }
    setRecUser(user);
    setRecEmail('');
    setRecovery('email');
  };

  const handleCheckEmail = () => {
    if (recEmail.trim().toLowerCase() !== recUser.email.toLowerCase()) {
      Alert.alert('Error', 'El correo no coincide con el registrado');
      return;
    }
    setRecEmail(recUser.email);
    const code = String(Math.floor(100000 + Math.random() * 900000));
    Alert.alert('Código enviado', `Se envió un código a ${recUser.email}. Verificá tu correo.`, [
      { text: 'Entendido', onPress: () => {
        Alert.alert('Modo prueba', `El código es ${code}`, [
          { text: 'OK', onPress: () => { setGenCode(code); setInputCode(''); setRecovery('code'); } },
        ]);
      }},
    ]);
  };

  const handleVerifyCode = () => {
    if (inputCode !== genCode) { Alert.alert('Error', 'Código incorrecto'); return; }
    setRecovery('newpass');
  };

  const handleResetPassword = async () => {
    if (!recNewPass || !recConfirmPass) {
      Alert.alert('Error', 'Completá todos los campos');
      return;
    }
    if (recNewPass !== recConfirmPass) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }
    const errors = getPasswordErrors(recNewPass);
    if (errors.length > 0) {
      Alert.alert('Contraseña inválida', errors.join('\n'));
      return;
    }
    if (recUser) {
      const { error } = await supabase.rpc('recover_password', { user_id: recUser.id, new_password: recNewPass });
      if (error) {
        Alert.alert('Error', 'No se pudo actualizar la contraseña');
        return;
      }
      setUsers(prev => prev.map(u => u.id === recUser.id ? { ...u, password: recNewPass } : u));
      Alert.alert('Listo', 'Contraseña actualizada', [
        { text: 'OK', onPress: () => { setRecovery(null); setPassword(''); setRecNewPass(''); setRecConfirmPass(''); } },
      ]);
    }
  };

  const user = resolvedUser;

  return (
    <PearlBackground>
      <ScrollView ref={scrollRef} contentContainerStyle={[styles.container, { paddingBottom: kbHeight + 24 }]} keyboardShouldPersistTaps="handled">
        {recovery === null ? (
          <>
            <Text style={styles.title}>Iniciar sesión</Text>
            <Text style={styles.fieldLabel}>Teléfono o correo</Text>
            <View style={styles.fieldRow}>
              <TextInput
                style={[styles.input, { marginBottom: 0 }]}
                placeholder="Ingresá tu teléfono o correo"
                placeholderTextColor={Colors.textLight}
                autoCapitalize="none"
                value={identifier}
                onChangeText={setIdentifier}
              />
              {identifier.length >= 10 && (
                <View style={styles.statusIcon}>
                  <Ionicons name={user ? 'checkmark-circle' : 'close-circle'} size={22} color={user ? Colors.success : Colors.error} />
                </View>
              )}
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
            <TouchableOpacity style={styles.forgotBtn} onPress={handleStartRecovery}>
              <Text style={styles.forgotLink}>Olvidé mi contraseña</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={handleLogin}>
              <Text style={styles.buttonText}>Ingresar</Text>
            </TouchableOpacity>
          </>
        ) : recovery === 'email' ? (
          <>
            <Text style={styles.title}>Restablecer contraseña</Text>
            <Text style={styles.fieldLabel}>Ingresá el correo electrónico registrado</Text>
            <Text style={styles.emailHint}>Correo registrado: {recUser ? maskEmail(recUser.email) : ''}</Text>
            <View style={styles.fieldRow}>
              <TextInput style={[styles.input, { marginBottom: 0 }]} value={recEmail} onChangeText={setRecEmail} placeholder="Tu correo completo" placeholderTextColor={Colors.textLight} autoCapitalize="none" keyboardType="email-address" />
              {recEmail.length > 2 && (
                <View style={styles.statusIcon}>
                  <Ionicons name={recEmail.toLowerCase() === recUser?.email.toLowerCase() ? 'checkmark-circle' : 'close-circle'} size={22} color={recEmail.toLowerCase() === recUser?.email.toLowerCase() ? Colors.success : Colors.error} />
                </View>
              )}
            </View>
            <TouchableOpacity style={[styles.button, recEmail.toLowerCase() !== recUser?.email.toLowerCase() && styles.buttonDisabled]} onPress={handleCheckEmail} disabled={recEmail.toLowerCase() !== recUser?.email.toLowerCase()}>
              <Text style={styles.buttonText}>Solicitar código</Text>
            </TouchableOpacity>
          </>
        ) : recovery === 'code' ? (
          <>
            <Text style={styles.title}>Código de verificación</Text>
            <Text style={styles.fieldLabel}>Ingresá el código que enviamos a {recEmail}</Text>
            <TextInput style={styles.input} value={inputCode} onChangeText={setInputCode} placeholder="Código de 6 dígitos" placeholderTextColor={Colors.textLight} keyboardType="number-pad" maxLength={6} />
            <TouchableOpacity style={styles.button} onPress={handleVerifyCode}>
              <Text style={styles.buttonText}>Verificar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 12 }} onPress={handleCheckEmail}>
              <Text style={styles.link}>Reenviar código</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.title}>Nueva contraseña</Text>
            <View style={styles.pinRow}>
              <TextInput style={[styles.input, styles.pinInput]} placeholder="Nueva contraseña" placeholderTextColor={Colors.textLight} autoCapitalize="none" secureTextEntry={!recShowPass} value={recNewPass} onChangeText={handleRecNewPassChange} />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setRecShowPass(!recShowPass)}>
                <Ionicons name={recShowPass ? 'eye-off' : 'eye'} size={22} color={Colors.textLight} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.passwordHintText, /[A-Z]/.test(recNewPass) && styles.passwordOk]}>✗ Debe tener al menos una mayúscula</Text>
            <Text style={[styles.passwordHintText, /[a-z]/.test(recNewPass) && styles.passwordOk]}>✗ Debe tener al menos una minúscula</Text>
            <Text style={[styles.passwordHintText, /\d/.test(recNewPass) && styles.passwordOk]}>✗ Debe tener al menos un número</Text>
            <Text style={[styles.passwordHintText, recNewPass.length >= 6 && recNewPass.length <= 12 && styles.passwordOk]}>✗ Debe tener entre 6 y 12 caracteres</Text>
            <View style={styles.pinRow}>
              <TextInput style={[styles.input, styles.pinInput]} placeholder="Repetir contraseña" placeholderTextColor={Colors.textLight} autoCapitalize="none" secureTextEntry={!recShowPass} value={recConfirmPass} onChangeText={setRecConfirmPass} />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setRecShowPass(!recShowPass)}>
                <Ionicons name={recShowPass ? 'eye-off' : 'eye'} size={22} color={Colors.textLight} />
              </TouchableOpacity>
            </View>
            {recConfirmPass.length > 0 && (
              <Text style={[styles.passwordHintText, { marginBottom: 12 }, recNewPass === recConfirmPass && styles.passwordOk]}>
                {recNewPass === recConfirmPass ? '✓ Coinciden' : '✗ Las contraseñas no coinciden'}
              </Text>
            )}
            <TouchableOpacity style={styles.button} onPress={handleResetPassword}>
              <Text style={styles.buttonText}>Cambiar contraseña</Text>
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity onPress={() => { if (recovery) setRecovery(null); else navigation.goBack(); }}>
          <Text style={styles.link}>{recovery ? 'Volver al inicio de sesión' : 'Volver'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </PearlBackground>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, flexGrow: 1, justifyContent: 'flex-start', paddingTop: 80 },
  title: { fontSize: 28, fontWeight: 'bold', color: Colors.text, marginBottom: 32, textAlign: 'center' },
  input: { backgroundColor: Colors.white, padding: 16, borderRadius: 12, marginBottom: 12, fontSize: 16, color: Colors.text, borderWidth: 1, borderColor: Colors.surface, paddingRight: 40 },
  fieldRow: { position: 'relative', marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6, paddingHorizontal: 2 },
  statusIcon: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  pinRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  pinInput: { flex: 1, marginBottom: 0 },
  eyeButton: { position: 'absolute', right: 14, padding: 4 },
  button: { backgroundColor: Colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
  link: { color: Colors.primary, textAlign: 'center', marginTop: 16, fontSize: 14 },
  forgotBtn: { alignSelf: 'flex-start', marginTop: 2, marginBottom: 4 },
  forgotLink: { color: Colors.primary, fontSize: 13, fontWeight: '500' },
  emailHint: { fontSize: 14, color: Colors.textLight, marginBottom: 12, fontStyle: 'italic' },
  passwordHintText: { fontSize: 12, color: Colors.error, marginBottom: 0 },
  passwordOk: { color: Colors.success },
});
