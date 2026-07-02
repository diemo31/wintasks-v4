import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Platform, KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgXml } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme';
import { useGlobal, getPasswordErrors } from '../context/GlobalContext';
import { supabase } from '../lib/supabase';

const LOGO_SVG = `<svg width="600" height="120" viewBox="0 0 600 120" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(95, 15)">
    <rect x="0" y="0" width="90" height="90" rx="22" fill="#E05A47"/>
    <g transform="scale(0.18)">
        <rect x="116" y="140" width="280" height="250" rx="32" fill="#FFFFFF" />
        <rect x="146" y="100" width="24" height="70" rx="12" fill="#FFFFFF" />
        <rect x="211" y="100" width="24" height="70" rx="12" fill="#FFFFFF" />
        <rect x="276" y="100" width="24" height="70" rx="12" fill="#FFFFFF" />
        <rect x="341" y="100" width="24" height="70" rx="12" fill="#FFFFFF" />
        <rect x="140" y="200" width="232" height="166" rx="12" fill="#E05A47"/>
        <path d="M 180 290 L 230 340 L 310 240" fill="none" stroke="#FFFFFF" stroke-width="26" stroke-linecap="round" stroke-linejoin="round" />
    </g>
  </g>
  <text x="195" y="80" font-family="system-ui, sans-serif" font-size="64" fill="#FFFFFF">
    <tspan font-weight="800" fill="#E05A47">Win</tspan><tspan font-weight="300" fill="#A89F96">Tasks</tspan>
  </text>
</svg>`;

const COUNTRY_CODES = [
  { code: '+93', flag: '🇦🇫', label: 'Afganistán' },
  { code: '+355', flag: '🇦🇱', label: 'Albania' },
  { code: '+49', flag: '🇩🇪', label: 'Alemania' },
  { code: '+376', flag: '🇦🇩', label: 'Andorra' },
  { code: '+244', flag: '🇦🇴', label: 'Angola' },
  { code: '+54', flag: '🇦🇷', label: 'Argentina' },
  { code: '+374', flag: '🇦🇲', label: 'Armenia' },
  { code: '+61', flag: '🇦🇺', label: 'Australia' },
  { code: '+43', flag: '🇦🇹', label: 'Austria' },
  { code: '+994', flag: '🇦🇿', label: 'Azerbaiyán' },
  { code: '+973', flag: '🇧🇭', label: 'Baréin' },
  { code: '+32', flag: '🇧🇪', label: 'Bélgica' },
  { code: '+591', flag: '🇧🇴', label: 'Bolivia' },
  { code: '+55', flag: '🇧🇷', label: 'Brasil' },
  { code: '+359', flag: '🇧🇬', label: 'Bulgaria' },
  { code: '+56', flag: '🇨🇱', label: 'Chile' },
  { code: '+86', flag: '🇨🇳', label: 'China' },
  { code: '+57', flag: '🇨🇴', label: 'Colombia' },
  { code: '+506', flag: '🇨🇷', label: 'Costa Rica' },
  { code: '+53', flag: '🇨🇺', label: 'Cuba' },
  { code: '+45', flag: '🇩🇰', label: 'Dinamarca' },
  { code: '+593', flag: '🇪🇨', label: 'Ecuador' },
  { code: '+20', flag: '🇪🇬', label: 'Egipto' },
  { code: '+503', flag: '🇸🇻', label: 'El Salvador' },
  { code: '+971', flag: '🇦🇪', label: 'Emiratos Árabes Unidos' },
  { code: '+34', flag: '🇪🇸', label: 'España' },
  { code: '+1', flag: '🇺🇸', label: 'Estados Unidos' },
  { code: '+389', flag: '🇲🇰', label: 'Macedonia del Norte' },
  { code: '+212', flag: '🇲🇦', label: 'Marruecos' },
  { code: '+52', flag: '🇲🇽', label: 'México' },
  { code: '+377', flag: '🇲🇨', label: 'Mónaco' },
  { code: '+51', flag: '🇵🇪', label: 'Perú' },
  { code: '+48', flag: '🇵🇱', label: 'Polonia' },
  { code: '+351', flag: '🇵🇹', label: 'Portugal' },
  { code: '+44', flag: '🇬🇧', label: 'Reino Unido' },
  { code: '+1', flag: '🇩🇴', label: 'República Dominicana' },
  { code: '+40', flag: '🇷🇴', label: 'Rumania' },
  { code: '+7', flag: '🇷🇺', label: 'Rusia' },
  { code: '+381', flag: '🇷🇸', label: 'Serbia' },
  { code: '+27', flag: '🇿🇦', label: 'Sudáfrica' },
  { code: '+46', flag: '🇸🇪', label: 'Suecia' },
  { code: '+41', flag: '🇨🇭', label: 'Suiza' },
  { code: '+66', flag: '🇹🇭', label: 'Tailandia' },
  { code: '+886', flag: '🇹🇼', label: 'Taiwán' },
  { code: '+90', flag: '🇹🇷', label: 'Turquía' },
  { code: '+598', flag: '🇺🇾', label: 'Uruguay' },
  { code: '+58', flag: '🇻🇪', label: 'Venezuela' },
  { code: '+84', flag: '🇻🇳', label: 'Vietnam' },
];

export default function RegisterScreen({ navigation }) {
  const { register, users } = useGlobal();
  const [step, setStep] = useState('phone');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[5]);
  const [phone, setPhone] = useState('');
  const [showCountries, setShowCountries] = useState(false);
  const [phoneExists, setPhoneExists] = useState(false);
  const [codeRequested, setCodeRequested] = useState(false);
  const [timer, setTimer] = useState(0);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [alias, setAlias] = useState('');
  const [fechaNac, setFechaNac] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState([]);
  const [tutorCode, setTutorCode] = useState('');
  const [referralCode, setReferralCode] = useState('');

  const getExpectedDigits = (code) => {
    if (code === '+54') return 10;
    if (code === '+52') return 10;
    if (code === '+34') return 9;
    if (code === '+1') return 10;
    return 0;
  };

  const checkProfileExists = async (searchText) => {
    if (users.some(u => u.phone === searchText || u.email === searchText || u.alias === searchText)) return true;
    try {
      const { data } = await supabase.rpc('lookup_profile', { search_text: searchText });
      return data && data.length > 0;
    } catch (_) { return false; }
  };

  const lookupProfile = async (searchText) => {
    try {
      const { data } = await supabase.rpc('lookup_profile', { search_text: searchText });
      return data?.[0] || null;
    } catch (_) { return null; }
  };

  useEffect(() => {
    const raw = phone.replace(/[^0-9]/g, '');
    const expected = getExpectedDigits(selectedCountry.code);
    if (expected > 0 && raw.length === expected) {
      const full = selectedCountry.code + raw;
      (async () => setPhoneExists(await checkProfileExists(full)))();
    } else {
      setPhoneExists(false);
    }
  }, [phone, selectedCountry]);

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

  const validatePhone = async () => {
    const raw = phone.replace(/[^0-9]/g, '');
    const fullPhone = selectedCountry.code + raw;

    if (await checkProfileExists(fullPhone)) {
      Alert.alert('Error', 'Este número ya está registrado');
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

  const handleRequestCode = async () => {
    if (!(await validatePhone())) return;
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
        setStep('profile');
      } else {
        setIsPhoneVerified(false);
        setOtpError(true);
      }
    } else {
      setIsPhoneVerified(false);
      setOtpError(false);
    }
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    if (text.length > 0) {
      setPasswordErrors(getPasswordErrors(text));
    } else {
      setPasswordErrors([]);
    }
  };

  const handleRegister = async () => {
    if (!nombre || !apellido || !email || !alias || !fechaNac || !password || !confirmPassword) {
      Alert.alert('Error', 'Completá todos los campos');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
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
    if (ageNum >= 18 && tutorCode) {
      Alert.alert('Error', 'Los adultos no necesitan código de tutor');
      return;
    }
    if (ageNum < 18 && !tutorCode) {
      Alert.alert('Error', 'Los menores necesitan un código de tutor');
      return;
    }
    let tutorUuid = null;
    if (ageNum < 18) {
      const tutor = await lookupProfile(tutorCode);
      if (!tutor || tutor.user_role !== 'adulto') {
        Alert.alert('Error', 'El código de tutor no es válido. Debe ser el teléfono de un adulto registrado.');
        return;
      }
      tutorUuid = tutor.user_id;
    }
    const fullPhone = selectedCountry.code + phone.replace(/[^0-9]/g, '');
    const result = await register({ nombre, apellido, email, alias, phone: fullPhone, fechaNac, age: ageNum, password, tutorCode: tutorUuid, referralCode });
    if (!result.success) {
      Alert.alert('Error', result.errors.join('\n'));
    }
  };

  if (step === 'phone') {
    return (
<LinearGradient colors={['#FFFFFF', '#FFD699', '#C06000']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <View style={{ alignItems: 'center', paddingTop: 50 }}>
        <SvgXml xml={LOGO_SVG} width={343} height={68} />
      </View>
      <ScrollView style={styles.phoneContainer} contentContainerStyle={[styles.content, { justifyContent: 'flex-start', paddingTop: 60 }]} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>¡Bienvenid@!</Text>
          <Text style={styles.subtitle}>Verificá tu celular</Text>
          <Text style={styles.hint}>Te enviaremos un código SMS</Text>

        <View style={styles.phoneRow}>
          <TouchableOpacity style={styles.countrySelector} onPress={() => setShowCountries(!showCountries)}>
            <Text style={styles.countryText}>{selectedCountry.flag} {selectedCountry.code}</Text>
            <Text style={styles.arrow}>{showCountries ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, position: 'relative' }}>
            <TextInput style={styles.phoneInput} placeholder="Número de celular" placeholderTextColor={Colors.textLight} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
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
        {phoneExists && <Text style={styles.phoneError}>Este número ya está registrado</Text>}
        {!phoneExists && selectedCountry.code === '+54' && <Text style={styles.phoneHint}>Sin 0, 9 ni 15 — ej. BA 11 1234 5678</Text>}
        {!phoneExists && selectedCountry.code === '+52' && <Text style={styles.phoneHint}>10 dígitos — ej: 55 1234 5678</Text>}
        {!phoneExists && selectedCountry.code === '+34' && <Text style={styles.phoneHint}>9 dígitos — ej: 612 345 678</Text>}
        {!phoneExists && selectedCountry.code === '+1' && <Text style={styles.phoneHint}>10 dígitos — ej: 305 123 4567</Text>}

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
          style={[styles.button, (codeRequested || phone.length < 6 || phoneExists) && styles.buttonDisabled]}
          onPress={handleRequestCode}
          disabled={codeRequested || phone.length < 6 || phoneExists}
        >
          <Text style={styles.buttonText}>
            {codeRequested ? `Reenviar en ${formatTime(timer)}` : 'Solicitar código'}
          </Text>
        </TouchableOpacity>

        {codeRequested && (
          <View style={styles.otpRow}>
            <TextInput
              style={[styles.otpInput, otpError && styles.inputError, isPhoneVerified && styles.inputSuccess]}
              placeholder="- - - - - -"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={handleOtpChange}
              editable={!isPhoneVerified}
            />
            {isPhoneVerified && <Text style={styles.verifiedIcon}>✓</Text>}
            {otpError && <Text style={styles.errorIcon}>✗</Text>}
          </View>
        )}

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Volver</Text>
        </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#FFFFFF', '#FFD699', '#C06000']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <ScrollView style={styles.profileContainer} contentContainerStyle={[styles.content, styles.profileContent]} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Completá tu perfil</Text>
      <Text style={styles.subtitle}>Tus datos personales</Text>

      <TextInput style={styles.input} placeholder="Nombre *" placeholderTextColor={Colors.textLight} value={nombre} onChangeText={setNombre} />
      <TextInput style={styles.input} placeholder="Apellido *" placeholderTextColor={Colors.textLight} value={apellido} onChangeText={setApellido} />
      {nombre.length > 0 && apellido.length > 0 && nombre === apellido && (
        <Text style={[styles.passwordHintText, { marginBottom: 6 }]}>✗ Nombre y apellido no pueden ser iguales</Text>
      )}
      <TextInput style={styles.input} placeholder="Correo electrónico *" placeholderTextColor={Colors.textLight} keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
      {email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
        <Text style={[styles.passwordHintText, { marginBottom: 6 }]}>✗ Formato de correo inválido</Text>
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
            return new Date(2010, 0, 1);
          })()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          onChange={handleDatePicker}
        />
      )}
      {(() => {
        const parts = fechaNac.split('/');
        if (parts.length !== 3 || parts[2].length !== 4) return null;
        const nac = new Date(parts[2], parts[1] - 1, parts[0]);
        if (isNaN(nac.getTime())) return null;
        const hoy = new Date();
        if (nac > hoy) return <Text style={[styles.passwordHintText, { marginBottom: 6 }]}>✗ La fecha no puede ser futura</Text>;
        let edad = hoy.getFullYear() - nac.getFullYear();
        const m = hoy.getMonth() - nac.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
        if (edad < 18) return <Text style={[styles.passwordHintText, { marginBottom: 6 }]}>✗ Debe ser mayor de 18 años</Text>;
        return <Text style={[styles.passwordHintText, styles.passwordOk, { marginBottom: 6 }]}>✓ Edad válida</Text>;
      })()}
      <View style={styles.pinRow}>
        <TextInput style={[styles.input, styles.pinInput]} placeholder="Contraseña (6-12 caracteres)" placeholderTextColor={Colors.textLight} autoCapitalize="none" secureTextEntry={!showPassword} value={password} onChangeText={handlePasswordChange} />
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
        <TextInput style={[styles.input, styles.pinInput]} placeholder="Repetir contraseña *" placeholderTextColor={Colors.textLight} autoCapitalize="none" secureTextEntry={!showPassword} value={confirmPassword} onChangeText={setConfirmPassword} />
        <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color={Colors.textLight} />
        </TouchableOpacity>
      </View>
      {confirmPassword.length > 0 && confirmPassword !== password && (
        <Text style={[styles.passwordHintText, { marginBottom: 12 }]}>✗ Las contraseñas no coinciden</Text>
      )}
      {confirmPassword.length > 0 && confirmPassword === password && (
        <Text style={[styles.passwordHintText, styles.passwordOk, { marginBottom: 12 }]}>✓ Coinciden</Text>
      )}
      {(() => {
        const parts = fechaNac.split('/');
        if (parts.length !== 3) return null;
        const nac = new Date(parts[2], parts[1] - 1, parts[0]);
        const hoy = new Date();
        let edad = hoy.getFullYear() - nac.getFullYear();
        const m = hoy.getMonth() - nac.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
        return edad < 18 ? (
          <TextInput style={styles.input} placeholder="Código del tutor (ej: +541111111111)" placeholderTextColor={Colors.textLight} value={tutorCode} onChangeText={setTutorCode} />
        ) : (
          <TextInput style={styles.input} placeholder="Código de invitación (opcional)" placeholderTextColor={Colors.textLight} value={referralCode} onChangeText={setReferralCode} />
        );
      })()}

      {(() => {
        const parts = fechaNac.split('/');
        const fechaOk = parts.length === 3 && parts[2].length === 4;
        const nac = fechaOk ? new Date(parts[2], parts[1] - 1, parts[0]) : null;
        const hoy = new Date();
        const notFuture = nac && nac <= hoy;
        let edadOk = false;
        if (nac && notFuture) {
          let e = hoy.getFullYear() - nac.getFullYear();
          const m = hoy.getMonth() - nac.getMonth();
          if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) e--;
          edadOk = e >= 18;
        }
        const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        const passOk = /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && password.length >= 6 && password.length <= 12;
        const passMatch = password === confirmPassword && confirmPassword.length > 0;
        const nameOk = nombre.length > 0 && apellido.length > 0 && nombre !== apellido;
        const aliasOk = alias.length > 0;
        const formValid = nameOk && emailOk && fechaOk && notFuture && edadOk && passOk && passMatch && aliasOk;
        return (
          <TouchableOpacity style={[styles.button, !formValid && styles.buttonDisabled]} onPress={handleRegister} disabled={!formValid}>
            <Text style={styles.buttonText}>Crear cuenta</Text>
          </TouchableOpacity>
        );
      })()}
      <TouchableOpacity onPress={() => { setStep('phone'); setOtp(''); setIsPhoneVerified(false); setCodeRequested(false); }}>
        <Text style={styles.link}>Volver</Text>
      </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { justifyContent: 'center', padding: 24, flexGrow: 1 },
  title: { fontSize: 28, fontWeight: 'bold', color: Colors.text, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: Colors.textLight, textAlign: 'center', marginBottom: 4 },
  hint: { fontSize: 12, color: Colors.textLight, textAlign: 'center', marginBottom: 32 },
  phoneRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 12,
  },
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
  phoneHint: { fontSize: 12, color: Colors.textLight, marginTop: 3, paddingLeft: 100 },
  phoneError: { fontSize: 12, color: Colors.error, marginTop: 3, paddingLeft: 100 },
  countryOption: { backgroundColor: Colors.white, padding: 14, borderRadius: 8, marginBottom: 4, borderWidth: 1, borderColor: Colors.surface },
  countryOptionActive: { borderColor: Colors.primary },
  input: {
    backgroundColor: Colors.white, padding: 16, borderRadius: 12, marginBottom: 12,
    fontSize: 16, color: Colors.text, borderWidth: 1, borderColor: Colors.surface,
  },
  inputError: { borderColor: Colors.error },
  inputSuccess: { borderColor: Colors.success },
  button: { backgroundColor: '#E05A47', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
  otpRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, gap: 12 },
  otpInput: {
    backgroundColor: Colors.white, padding: 16, borderRadius: 12, fontSize: 24, textAlign: 'center',
    letterSpacing: 8, borderWidth: 1, borderColor: Colors.surface, width: 200, color: Colors.text,
  },
  verifiedIcon: { fontSize: 24, color: Colors.success, fontWeight: 'bold' },
  errorIcon: { fontSize: 24, color: Colors.error, fontWeight: 'bold' },
  link: { color: Colors.primary, textAlign: 'center', marginTop: 16, fontSize: 14 },
  passwordHint: { paddingHorizontal: 4, marginBottom: 6 },
  passwordHintText: { fontSize: 12, color: Colors.error, marginBottom: 0 },
  passwordOk: { color: Colors.success },
  pinRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  pinInput: { flex: 1, marginBottom: 0 },
  eyeButton: { position: 'absolute', right: 14, padding: 4 },
  phoneContainer: { flex: 1 },
  phoneContent: { justifyContent: 'flex-start', paddingTop: 40 },
  profileContainer: { flex: 1 },
  profileContent: { justifyContent: 'flex-start', paddingTop: 32 },
  row: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },
});
