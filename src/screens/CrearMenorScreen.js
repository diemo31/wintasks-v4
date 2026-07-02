import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Platform, Keyboard, Share, Linking } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme';
import { useGlobal, getPasswordErrors } from '../context/GlobalContext';
import PearlBackground from '../components/PearlBackground';

const COUNTRY_CODES = [
  { code: '+93', flag: '🇦🇫', label: 'Afganistán' },
  { code: '+355', flag: '🇦🇱', label: 'Albania' },
  { code: '+49', flag: '🇩🇪', label: 'Alemania' },
  { code: '+54', flag: '🇦🇷', label: 'Argentina' },
  { code: '+61', flag: '🇦🇺', label: 'Australia' },
  { code: '+43', flag: '🇦🇹', label: 'Austria' },
  { code: '+55', flag: '🇧🇷', label: 'Brasil' },
  { code: '+56', flag: '🇨🇱', label: 'Chile' },
  { code: '+57', flag: '🇨🇴', label: 'Colombia' },
  { code: '+86', flag: '🇨🇳', label: 'China' },
  { code: '+506', flag: '🇨🇷', label: 'Costa Rica' },
  { code: '+53', flag: '🇨🇺', label: 'Cuba' },
  { code: '+45', flag: '🇩🇰', label: 'Dinamarca' },
  { code: '+593', flag: '🇪🇨', label: 'Ecuador' },
  { code: '+20', flag: '🇪🇬', label: 'Egipto' },
  { code: '+503', flag: '🇸🇻', label: 'El Salvador' },
  { code: '+34', flag: '🇪🇸', label: 'España' },
  { code: '+1', flag: '🇺🇸', label: 'Estados Unidos' },
  { code: '+52', flag: '🇲🇽', label: 'México' },
  { code: '+51', flag: '🇵🇪', label: 'Perú' },
  { code: '+48', flag: '🇵🇱', label: 'Polonia' },
  { code: '+44', flag: '🇬🇧', label: 'Reino Unido' },
  { code: '+598', flag: '🇺🇾', label: 'Uruguay' },
  { code: '+58', flag: '🇻🇪', label: 'Venezuela' },
];

export default function CrearMenorScreen({ navigation }) {
  const { registerChild, users } = useGlobal();
  const scrollRef = useRef(null);
  const [kbHeight, setKbHeight] = useState(0);
  const inputRefs = useRef({});

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', e => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const scrollToInput = useCallback((key) => {
    const ref = inputRefs.current[key];
    if (!ref || !scrollRef.current) return;
    setTimeout(() => {
      ref.measureLayout?.(scrollRef.current.getInnerViewNode(), (x, y) => {
        scrollRef.current?.scrollTo({ y: y - 60, animated: true });
      }, () => {});
    }, 100);
  }, []);

  const setInputRef = useCallback((key) => (el) => { inputRefs.current[key] = el; }, []);
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[3]);
  const [showCountries, setShowCountries] = useState(false);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [alias, setAlias] = useState('');
  const [fechaNac, setFechaNac] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [phoneExists, setPhoneExists] = useState(false);

  const getExpectedDigits = (code) => {
    if (code === '+54') return 10;
    if (code === '+52') return 10;
    if (code === '+34') return 9;
    if (code === '+1') return 10;
    return 0;
  };

  useEffect(() => {
    const raw = phone.replace(/[^0-9]/g, '');
    const expected = getExpectedDigits(selectedCountry.code);
    if (expected > 0 && raw.length === expected) {
      const full = selectedCountry.code + raw;
      setPhoneExists(users.some(u => u.phone === full));
    } else {
      setPhoneExists(false);
    }
  }, [phone, selectedCountry, users]);

  const handleDateChange = (text) => {
    const digits = text.replace(/[^0-9]/g, '');
    let formatted = '';
    if (digits.length > 0) formatted = digits.slice(0, 2);
    if (digits.length > 2) formatted += '/' + digits.slice(2, 4);
    if (digits.length > 4) formatted += '/' + digits.slice(4, 8);
    setFechaNac(formatted);
  };

  const handleDatePicker = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const d = selectedDate.getDate().toString().padStart(2, '0');
      const m = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
      const y = selectedDate.getFullYear();
      setFechaNac(`${d}/${m}/${y}`);
    }
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
  };

  const handleCrear = async () => {
    if (!nombre || !apellido || !alias || !fechaNac || !email || !phone || !password || !confirmPassword) {
      Alert.alert('Error', 'Completá todos los campos');
      return;
    }
    if (nombre === apellido) {
      Alert.alert('Error', 'Nombre y apellido no pueden ser iguales');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }
    const passwordErrors = getPasswordErrors(password);
    if (passwordErrors.length > 0) {
      Alert.alert('Error', passwordErrors.join('\n'));
      return;
    }
    const parts = fechaNac.split('/');
    if (parts.length !== 3 || parts[2].length !== 4) {
      Alert.alert('Error', 'Fecha inválida. Usá DD/MM/AAAA');
      return;
    }
    const nac = new Date(parts[2], parts[1] - 1, parts[0]);
    const hoy = new Date();
    let ageNum = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) ageNum--;
    if (ageNum < 0) {
      Alert.alert('Error', 'La fecha de nacimiento no puede ser futura');
      return;
    }
    if (ageNum >= 18) {
      Alert.alert('Error', 'El menor debe tener menos de 18 años');
      return;
    }
    if (ageNum <= 9) {
      Alert.alert('Error', 'El menor debe tener más de 9 años');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email)) {
      Alert.alert('Error', 'Correo electrónico inválido');
      return;
    }
    const fullPhone = selectedCountry.code + phone.replace(/[^0-9]/g, '');
    if (users.some(u => u.phone === fullPhone)) {
      Alert.alert('Error', 'Número de teléfono ya registrado');
      return;
    }
    if (users.some(u => u.email === email)) {
      Alert.alert('Error', 'Correo electrónico ya registrado');
      return;
    }
    const result = await registerChild({ nombre, apellido, email, alias, phone: fullPhone, age: ageNum, fechaNac, password });
    if (!result.success) {
      Alert.alert('Error', result.errors.join('\n'));
    } else {
      Alert.alert('Listo', `La cuenta de ${alias} fue creada`, [
        { text: 'Invitar por WhatsApp', onPress: () => {
          const msg = encodeURIComponent(`¡Hola! Te invito a usar WinTasks. Ingresá con:\nUsuario: ${alias}\nContraseña: (la que creamos)\nhttps://wintasks.app`);
          Linking.openURL(`whatsapp://send?text=${msg}`).catch(() => {
            Share.share({ message: `¡Hola! Te invito a usar WinTasks. Ingresá con:\nUsuario: ${alias}\nContraseña: (la que creamos)\nhttps://wintasks.app` });
          });
          navigation.goBack();
        }},
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  };

  const passwordErrors = password.length > 0 ? getPasswordErrors(password) : [];
  const parts = fechaNac.split('/');
  const fechaOk = parts.length === 3 && parts[2].length === 4;
  let ageNum = -1;
  let edadOk = false;
  if (fechaOk) {
    const nac = new Date(parts[2], parts[1] - 1, parts[0]);
    const hoy = new Date();
    ageNum = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) ageNum--;
    edadOk = ageNum >= 10 && ageNum <= 17;
  }
  const emailOk = (() => {
    if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email)) return false;
    const tld = email.split('@')[1]?.split('.').pop()?.toLowerCase();
    const TLD_COMMUNES = ['com','net','org','io','gov','edu','int','mil','arpa',
      'uk','fr','de','es','it','jp','cn','br','ru','au','ca','mx','ar','cl','co','uy',
      'info','mobi','me','tv','biz','pro','name','eus','gal','cat','blog','app','dev',
      'tech','shop','site','xyz','online','store'];
    return TLD_COMMUNES.includes(tld) && !users.some(u => u.email === email);
  })();
  const passOk = /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && password.length >= 6 && password.length <= 12;
  const passMatch = password === confirmPassword && confirmPassword.length > 0;
  const formValid = nombre.length > 0 && apellido.length > 0 && nombre !== apellido && alias.length > 0 && fechaOk && edadOk && emailOk && passOk && passMatch && phone.length > 0;

  return (
    <PearlBackground>
      <ScrollView ref={scrollRef} contentContainerStyle={[styles.content, { paddingBottom: kbHeight + 24 }]} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Crear cuenta de menor</Text>
        <Text style={styles.subtitle}>Completá los datos del menor</Text>

        <TextInput style={styles.input} placeholder="Nombre *" placeholderTextColor={Colors.textLight} value={nombre} onChangeText={setNombre} />
        <TextInput style={styles.input} placeholder="Apellido *" placeholderTextColor={Colors.textLight} value={apellido} onChangeText={setApellido} />
        {nombre.length > 0 && apellido.length > 0 && nombre === apellido && (
          <Text style={styles.errorText}>✗ Nombre y apellido no pueden ser iguales</Text>
        )}

        <View style={[styles.row, { marginBottom: 12 }]}>
          <View style={styles.halfInput}>
            <TextInput style={[styles.input, { marginBottom: 0 }]} placeholder="Usuario *" placeholderTextColor={Colors.textLight} autoCapitalize="none" value={alias} onChangeText={setAlias} />
          </View>
          <View style={styles.halfInput}>
            <TextInput style={[styles.input, { marginBottom: 0, paddingRight: 36 }]} placeholder="F. de Nac. *" placeholderTextColor={Colors.textLight} keyboardType="number-pad" value={fechaNac} onChangeText={handleDateChange} maxLength={10} />
            <TouchableOpacity style={{ position: 'absolute', right: 10, top: 0, bottom: 0, justifyContent: 'center', padding: 4 }} onPress={() => setShowDatePicker(true)}>
              <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
        {showDatePicker && (
          <DateTimePicker
            value={(() => {
              const p = fechaNac.split('/');
              if (p.length === 3 && p[2].length === 4) return new Date(p[2], p[1] - 1, p[0]);
              return new Date(2015, 0, 1);
            })()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()}
            onChange={handleDatePicker}
          />
        )}
        {fechaNac.length >= 8 && fechaOk && ageNum < 0 && (
          <Text style={styles.errorText}>✗ La fecha no puede ser futura</Text>
        )}
        {fechaNac.length >= 8 && fechaOk && ageNum >= 0 && ageNum < 10 && (
          <Text style={styles.errorText}>✗ Debe tener al menos 10 años</Text>
        )}
        {fechaNac.length >= 8 && fechaOk && ageNum >= 18 && (
          <Text style={styles.errorText}>✗ Debe tener menos de 18 años</Text>
        )}
        {fechaNac.length >= 8 && !fechaOk && (
          <Text style={styles.errorText}>✗ Formato DD/MM/AAAA</Text>
        )}

        <TextInput ref={setInputRef('email')} onFocus={() => scrollToInput('email')} style={styles.input} placeholder="Correo electrónico *" placeholderTextColor={Colors.textLight} keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
        {email.length > 0 && !emailOk && (
          <Text style={styles.errorText}>✗ Formato de correo inválido</Text>
        )}
        {email.length > 0 && emailOk && users.some(u => u.email === email) && (
          <Text style={styles.errorText}>✗ Correo electrónico ya registrado</Text>
        )}

        <View style={styles.phoneRow}>
          <TouchableOpacity style={styles.countrySelector} onPress={() => setShowCountries(!showCountries)}>
            <Text style={styles.countryText}>{selectedCountry.flag} {selectedCountry.code}</Text>
            <Text style={styles.arrow}>{showCountries ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, position: 'relative' }}>
            <TextInput ref={setInputRef('phone')} onFocus={() => scrollToInput('phone')} style={styles.phoneInput} placeholder="Teléfono *" placeholderTextColor={Colors.textLight} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
            {(() => {
              const raw = phone.replace(/[^0-9]/g, '');
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
        {showCountries && COUNTRY_CODES.map(c => (
          <TouchableOpacity
            key={c.code + c.label}
            style={[styles.countryOption, selectedCountry.code === c.code && styles.countryOptionActive]}
            onPress={() => { setSelectedCountry(c); setShowCountries(false); }}
          >
            <Text style={styles.countryText}>{c.flag} {c.code} {c.label}</Text>
          </TouchableOpacity>
        ))}

        <View style={styles.pinRow}>
          <TextInput ref={setInputRef('pass')} onFocus={() => scrollToInput('pass')} style={[styles.input, styles.pinInput]} placeholder="Contraseña (6-12 caracteres) *" placeholderTextColor={Colors.textLight} autoCapitalize="none" secureTextEntry={!showPassword} value={password} onChangeText={handlePasswordChange} />
          <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color={Colors.textLight} />
          </TouchableOpacity>
        </View>
        {password.length > 0 && (
          <View style={styles.passwordHint}>
            <Text style={[styles.passwordHintText, /[A-Z]/.test(password) && styles.passwordOk]}>
              {/[A-Z]/.test(password) ? '✓' : '✗'} 1 Mayúscula
            </Text>
            <Text style={[styles.passwordHintText, /[a-z]/.test(password) && styles.passwordOk]}>
              {/[a-z]/.test(password) ? '✓' : '✗'} 1 Minúscula
            </Text>
            <Text style={[styles.passwordHintText, /\d/.test(password) && styles.passwordOk]}>
              {/\d/.test(password) ? '✓' : '✗'} 1 Número
            </Text>
            <Text style={[styles.passwordHintText, password.length >= 6 && password.length <= 12 && styles.passwordOk]}>
              {password.length >= 6 && password.length <= 12 ? '✓' : '✗'} 6-12 caracteres
            </Text>
          </View>
        )}

        <View style={styles.pinRow}>
          <TextInput ref={setInputRef('confirm')} onFocus={() => scrollToInput('confirm')} style={[styles.input, styles.pinInput]} placeholder="Repetir contraseña *" placeholderTextColor={Colors.textLight} autoCapitalize="none" secureTextEntry={!showPassword} value={confirmPassword} onChangeText={setConfirmPassword} />
          <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color={Colors.textLight} />
          </TouchableOpacity>
        </View>
        {confirmPassword.length > 0 && confirmPassword !== password && (
          <Text style={styles.errorText}>✗ Las contraseñas no coinciden</Text>
        )}
        {confirmPassword.length > 0 && confirmPassword === password && (
          <Text style={[styles.errorText, { color: Colors.success }]}>✓ Coinciden</Text>
        )}

        <TouchableOpacity style={[styles.button, !formValid && styles.buttonDisabled]} onPress={handleCrear} disabled={!formValid}>
          <Text style={styles.buttonText}>Crear cuenta</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Volver</Text>
        </TouchableOpacity>
      </ScrollView>
    </PearlBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, flexGrow: 1, justifyContent: 'flex-start', paddingTop: 32 },
  title: { fontSize: 28, fontWeight: 'bold', color: Colors.text, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: Colors.textLight, textAlign: 'center', marginBottom: 24 },
  row: { flexDirection: 'row', gap: 8 },
  input: {
    backgroundColor: Colors.white, padding: 14, borderRadius: 12, marginBottom: 12,
    fontSize: 16, color: Colors.text, borderWidth: 1, borderColor: Colors.surface,
  },
  halfInput: { flex: 1 },
  errorText: { fontSize: 12, color: Colors.error, marginBottom: 6, paddingHorizontal: 4 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  countrySelector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white,
    height: 44, paddingHorizontal: 10, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.surface, marginRight: 8, gap: 4,
  },
  countryText: { fontSize: 15, color: Colors.text },
  arrow: { fontSize: 12, color: Colors.textLight },
  phoneInput: {
    flex: 1, backgroundColor: Colors.white, paddingVertical: 12, paddingLeft: 14, paddingRight: 36,
    borderRadius: 8, fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.surface,
  },
  countryOption: { backgroundColor: Colors.white, padding: 14, borderRadius: 8, marginBottom: 4, borderWidth: 1, borderColor: Colors.surface },
  countryOptionActive: { borderColor: Colors.primary },
  pinRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  pinInput: { flex: 1, marginBottom: 0 },
  eyeButton: { position: 'absolute', right: 14, padding: 4 },
  passwordHint: { paddingHorizontal: 4, marginBottom: 6 },
  passwordHintText: { fontSize: 12, color: Colors.error, marginBottom: 0 },
  passwordOk: { color: Colors.success },
  button: { backgroundColor: '#E05A47', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 12, paddingHorizontal: 16 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
  link: { color: Colors.primary, textAlign: 'center', marginTop: 16, fontSize: 14 },
});
