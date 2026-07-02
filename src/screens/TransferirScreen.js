import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme';
import { useGlobal } from '../context/GlobalContext';

const COUNTRIES = [
  { code: '+54', flag: '🇦🇷', label: 'Argentina' },
  { code: '+52', flag: '🇲🇽', label: 'México' },
  { code: '+34', flag: '🇪🇸', label: 'España' },
  { code: '+1', flag: '🇺🇸', label: 'EE.UU.' },
  { code: '+57', flag: '🇨🇴', label: 'Colombia' },
  { code: '+56', flag: '🇨🇱', label: 'Chile' },
  { code: '+51', flag: '🇵🇪', label: 'Perú' },
  { code: '+58', flag: '🇻🇪', label: 'Venezuela' },
];

const stripPhone = (str) => str.replace(/[\s\-\(\)\+]/g, '');

export default function TransferirScreen({ navigation }) {
  const { currentUser, users, getUserTokens, getUserLoyaltyPoints, transferTokens, moveTokens, moveLoyaltyPoints } = useGlobal();
  const [countryIdx, setCountryIdx] = useState(0);
  const [showCountries, setShowCountries] = useState(false);
  const [phone, setPhone] = useState('');
  const [recipient, setRecipient] = useState(null);
  const [type, setType] = useState('tokens');
  const [amount, setAmount] = useState('');

  const myTokens = getUserTokens(currentUser?.id);
  const myPoints = getUserLoyaltyPoints(currentUser?.id);
  const available = type === 'tokens' ? myTokens : myPoints;

  const country = COUNTRIES[countryIdx];

  const handlePhoneChange = (text) => {
    setPhone(text);
    const full = stripPhone(country.code + text);
    const found = users.find(u => u.id !== currentUser?.id && stripPhone(u.phone) === full);
    setRecipient(found || null);
  };

  const selectCountry = (idx) => {
    setCountryIdx(idx);
    setShowCountries(false);
    setPhone('');
    setRecipient(null);
  };

  const handleTransfer = () => {
    if (!recipient) {
      Alert.alert('Error', 'No se encontró un usuario con ese teléfono');
      return;
    }
    const val = Number(amount);
    if (!val || val <= 0) {
      Alert.alert('Error', 'Ingresá un monto válido');
      return;
    }
    if (val > available) {
      Alert.alert('Error', 'No tenés saldo suficiente');
      return;
    }

    const isFromChild = currentUser.role === 'menor';
    const isToAdult = recipient.role === 'adulto';
    const isToChild = recipient.role === 'menor';
    const isFromAdult = currentUser.role === 'adulto';

    // Minor→Adult: only tutor allowed
    if (isFromChild && isToAdult && recipient.id !== currentUser.tutorId) {
      Alert.alert('Error', 'Solo podés transferir tokens a tu tutor.');
      return;
    }

    const confirmAndTransfer = () => {
      if (type === 'puntos') {
        const ok = moveLoyaltyPoints(currentUser.id, recipient.id, val);
        if (ok) {
          Alert.alert('Transferido', `Se transfirieron ${val} puntos a ${recipient.alias}.`, [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        } else {
          Alert.alert('Error', 'No se pudo completar la transferencia de puntos');
        }
        return;
      }

      let expiryMode = 'all';
      let lockTokens = false;

      if (isFromChild && isToAdult) {
        // Minor→Adult tutor: only valid non-transfer tokens
        expiryMode = 'transfer';
      } else if (isFromAdult && isToChild) {
        // Adult→Minor: lock if not own child
        const isOwnChild = currentUser.id === recipient.tutorId;
        if (!isOwnChild) lockTokens = true;
      }
      // Minor→Minor falls through (all, fromChildTransfer=true via isCrossChild)
      // Adult→Adult falls through (all, no lock)

      const result = transferTokens(currentUser.id, recipient.id, val, expiryMode, lockTokens);

      const goBack = () => navigation.goBack();

      if (isToAdult && (result.transferred > 0 || result.expiredSkipped > 0 || result.transferSkipped > 0)) {
        const parts = [];
        if (result.transferred > 0) parts.push(`Se transfirieron ${result.transferred} tokens a ${recipient.alias}.`);
        if (result.expiredSkipped > 0) parts.push(`${result.expiredSkipped} tokens estaban vencidos y no se transfirieron.`);
        if (result.transferSkipped > 0) parts.push(`${result.transferSkipped} tokens provenían de transferencias y no pueden transferirse a un adulto.`);
        Alert.alert('Transferencia', parts.join(' '), [{ text: 'OK', onPress: result.transferred > 0 ? goBack : undefined }]);
        if (result.transferred <= 0) return;
        goBack();

      } else if (isToChild && isFromChild && result.transferred > 0) {
        // Minor→Minor: tiered messages
        const msgs = [];
        if (result.transferredExpired > 0) {
          msgs.push(`${result.transferredExpired} tokens ya estaban vencidos y no se recuperan una vez que ${recipient.alias} los canjee.`);
        }
        if (result.transferredValid > 0) {
          msgs.push(`${result.transferredValid} tokens estaban vigentes pero al transferirlos a otro menor pierden su vigencia y no pueden recuperarse.`);
        }
        Alert.alert('Transferencia completada', msgs.join('\n\n') + '\n\nRevisá la transacción con cuidado porque no puede revertirse.', [
          { text: 'OK', onPress: goBack },
        ]);

      } else if (result.transferred > 0) {
        Alert.alert('Transferido', `Se transfirieron ${result.transferred} tokens a ${recipient.alias}.`, [
          { text: 'OK', onPress: goBack },
        ]);

      } else if (result.expiredSkipped > 0 || result.transferSkipped > 0) {
        const parts = [];
        if (result.expiredSkipped > 0) parts.push('vencidos');
        if (result.transferSkipped > 0) parts.push('de transferencias');
        Alert.alert('Error', `Todos los tokens están ${parts.join(' o ')} y no pueden transferirse a un adulto.`);

      } else {
        Alert.alert('Error', 'No se pudo completar la transferencia');
      }
    };

    const msgParts = [`Vas a transferir ${val} tokens a ${recipient.alias} (${recipient.role === 'adulto' ? 'adulto' : 'menor'}).`];
    if (isFromChild && isToAdult) {
      msgParts.push('Los tokens vencidos o provenientes de transferencias no se transferirán.');
    } else if (isFromChild && isToChild) {
      msgParts.push('Al transferir a otro menor, los tokens pierden su vigencia y no pueden recuperarse.');
    } else if (isFromAdult && isToChild && currentUser.id !== recipient.tutorId) {
      msgParts.push('Como no sos su tutor, estos tokens no podrán volver a tu cuenta.');
    }
    msgParts.push('Revisá la transacción con cuidado porque no puede revertirse.');

    Alert.alert('Confirmar transferencia', msgParts.join('\n\n'), [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Transferir', style: 'destructive', onPress: confirmAndTransfer },
    ]);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.label}>Teléfono del destinatario</Text>
          <View style={styles.phoneRow}>
            <TouchableOpacity style={styles.countryPicker} onPress={() => setShowCountries(!showCountries)}>
              <Text style={styles.countryFlag}>{country.flag}</Text>
              <Text style={styles.countryCode}>{country.code}</Text>
              <Ionicons name={showCountries ? 'chevron-up' : 'chevron-down'} size={14} color="#888" />
            </TouchableOpacity>
            <TextInput
              style={styles.phoneInput}
              placeholder="11 2222-2222"
              placeholderTextColor="#ccc"
              value={phone}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
            />
          </View>
          {showCountries && (
            <View style={styles.countryList}>
              {COUNTRIES.map((c, i) => (
                <TouchableOpacity key={c.code} style={styles.countryItem} onPress={() => selectCountry(i)}>
                  <Text style={styles.countryItemFlag}>{c.flag}</Text>
                  <Text style={styles.countryItemLabel}>{c.label}</Text>
                  <Text style={styles.countryItemCode}>{c.code}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {phone !== '' && !recipient && (
            <Text style={styles.notFound}>No se encontró ningún usuario con ese teléfono</Text>
          )}
          {recipient && (
            <View style={styles.recipientCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{recipient.alias?.charAt(0).toUpperCase()}</Text>
              </View>
              <View>
                <Text style={styles.recipientName}>{recipient.alias}</Text>
                <Text style={styles.recipientPhone}>{recipient.phone}</Text>
                <Text style={styles.recipientRole}>{recipient.role === 'adulto' ? 'Adulto' : 'Menor'}</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Tipo de transferencia</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeBtn, type === 'tokens' && styles.typeBtnActive]}
              onPress={() => setType('tokens')}
            >
              <Ionicons name="diamond" size={16} color={type === 'tokens' ? '#FFF' : Colors.primary} />
              <Text style={[styles.typeBtnText, type === 'tokens' && styles.typeBtnTextActive]}>Tokens</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, type === 'puntos' && styles.typeBtnActive]}
              onPress={() => setType('puntos')}
            >
              <Ionicons name="star" size={16} color={type === 'puntos' ? '#FFF' : Colors.primary} />
              <Text style={[styles.typeBtnText, type === 'puntos' && styles.typeBtnTextActive]}>Puntos WinTasks</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.balanceRow}>
            <Text style={styles.label}>Monto a transferir</Text>
            <Text style={styles.balanceText}>
              {type === 'tokens' ? 'Tokens' : 'Puntos'}: <Text style={styles.balanceValue}>{available}</Text>
            </Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor="#ccc"
            value={amount}
            onChangeText={setAmount}
            keyboardType="number-pad"
          />
        </View>

        <View style={styles.warningBox}>
          <Ionicons name="alert-circle" size={18} color="#C0693A" />
          <Text style={styles.warningText}>
            Revisá la transacción con cuidado porque si transferís mal, no puede revertirse.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.transferBtn, (!recipient || !amount) && styles.transferBtnDisabled]}
          onPress={handleTransfer}
          disabled={!recipient || !amount}
        >
          <Ionicons name="swap-horizontal" size={20} color="#FFF" />
          <Text style={styles.transferBtnText}>Transferir</Text>
        </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
    );
  }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F6F4' },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  content: { flex: 1 },

  section: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 8 },
  input: { backgroundColor: '#FFF', borderRadius: 10, padding: 14, fontSize: 15, color: '#1e293b', borderWidth: 1, borderColor: '#E8E2DC' },
  notFound: { color: '#C0392B', fontSize: 13, marginTop: 6 },

  phoneRow: { flexDirection: 'row', gap: 8 },
  countryPicker: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF', borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E8E2DC' },
  countryFlag: { fontSize: 20 },
  countryCode: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  phoneInput: { flex: 1, backgroundColor: '#FFF', borderRadius: 10, padding: 14, fontSize: 15, color: '#1e293b', borderWidth: 1, borderColor: '#E8E2DC' },

  countryList: { backgroundColor: '#FFF', borderRadius: 10, marginTop: 8, borderWidth: 1, borderColor: '#E8E2DC', overflow: 'hidden' },
  countryItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#f0ebe4' },
  countryItemFlag: { fontSize: 20 },
  countryItemLabel: { flex: 1, fontSize: 14, color: '#1e293b' },
  countryItemCode: { fontSize: 13, color: '#a8a29e' },

  recipientCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginTop: 10, borderWidth: 1, borderColor: '#E8E2DC' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  recipientName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  recipientPhone: { fontSize: 13, color: '#a8a29e', marginTop: 1 },
  recipientRole: { fontSize: 12, color: Colors.primary, marginTop: 1, fontWeight: '500' },

  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.primary, justifyContent: 'center', backgroundColor: '#FFF' },
  typeBtnActive: { backgroundColor: Colors.primary },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  typeBtnTextActive: { color: '#FFF' },

  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceText: { fontSize: 13, color: '#a8a29e' },
  balanceValue: { fontWeight: '700', color: Colors.primary, fontSize: 14 },

  warningBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFF5F0', borderRadius: 10, padding: 14, marginBottom: 20 },
  warningText: { flex: 1, fontSize: 13, color: '#C0693A', lineHeight: 18 },

  transferBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 12 },
  transferBtnDisabled: { backgroundColor: '#ddd' },
  transferBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
