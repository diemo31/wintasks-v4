import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors } from '../theme';
import { useGlobal } from '../context/GlobalContext';

export default function CreatePrizeScreen({ navigation }) {
  const { currentUser, createPrize } = useGlobal();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tokenCost, setTokenCost] = useState('');

  const handleCreate = () => {
    if (!title.trim()) {
      Alert.alert('Campo requerido', 'El título del premio es obligatorio.');
      return;
    }
    const cost = parseInt(tokenCost, 10);
    if (!cost || cost < 1) {
      Alert.alert('Campo requerido', 'El costo en tokens debe ser un número mayor a 0.');
      return;
    }
    createPrize({ title: title.trim(), description: description.trim(), tokenCost: cost, createdBy: currentUser.id });
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.label}>Nombre del premio</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Ej: Minecraft Minecoins" placeholderTextColor={Colors.textLight} />

        <Text style={styles.label}>Descripción (opcional)</Text>
        <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder="Detalles del premio..." placeholderTextColor={Colors.textLight} multiline numberOfLines={3} />

        <Text style={styles.label}>Costo en tokens</Text>
        <TextInput style={styles.input} value={tokenCost} onChangeText={setTokenCost} placeholder="Ej: 50" placeholderTextColor={Colors.textLight} keyboardType="number-pad" />

        <TouchableOpacity style={styles.saveBtn} onPress={handleCreate}>
          <Text style={styles.saveBtnText}>Crear premio</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  content: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: Colors.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.surface,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center',
    marginTop: 28,
  },
  saveBtnText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
});
