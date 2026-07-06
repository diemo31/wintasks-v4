import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Colors } from '../theme';
import { useGlobal } from '../context/GlobalContext';
import PearlBackground from '../components/PearlBackground';

const DURATION_OPTIONS = [
  { label: '1 día', days: 1 },
  { label: '3 días', days: 3 },
  { label: '7 días', days: 7 },
  { label: '14 días', days: 14 },
  { label: '30 días', days: 30 },
];

export default function CreateTaskScreen({ route, navigation }) {
  const prefill = route.params || {};
  const { currentUser, getChildren, getUserTokens, createTask } = useGlobal();
  const children = getChildren(currentUser.id);
  const myTokens = getUserTokens(currentUser?.id);
  const [title, setTitle] = useState(prefill.prefillTitle || '');
  const [description, setDescription] = useState(prefill.prefillDescription || '');
  const [childId, setChildId] = useState('');
  const [tokenReward, setTokenReward] = useState(prefill.prefillTokenReward?.toString() || '');
  const [days, setDays] = useState(7);

  const handleCreate = async () => {
    if (!title.trim() || !childId || !tokenReward) return;
    const cost = Number(tokenReward);
    if (cost > myTokens) {
      Alert.alert('Tokens insuficientes', `Tenés ${myTokens} tokens disponibles, pero la tarea requiere ${cost}.`);
      return;
    }
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    const task = await createTask({
      title: title.trim(),
      description: description.trim(),
      childId,
      tokenReward: cost,
      createdBy: currentUser.id,
      expiresAt,
    });
    if (!task) {
      Alert.alert('Error', 'No se pudo crear la tarea. Verificá tu saldo de tokens.');
      return;
    }
    navigation.goBack();
  };

  return (
    <PearlBackground>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Nueva tarea</Text>

        <Text style={styles.label}>Título</Text>
        <TextInput style={styles.input} placeholder="Ej: Ordenar la habitación" value={title} onChangeText={setTitle} />

        <Text style={styles.label}>Descripción (opcional)</Text>
        <TextInput style={[styles.input, styles.textArea]} placeholder="Detalles de la tarea..." value={description} onChangeText={setDescription} multiline />

        <Text style={styles.label}>Asignar a</Text>
        {children.length === 0 ? (
          <Text style={styles.noChildren}>No tenés hijos vinculados</Text>
        ) : (
          <View style={styles.chipsRow}>
            {children.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.chip, childId === c.id && styles.chipActive]}
                onPress={() => setChildId(c.id)}
              >
                <Text style={[styles.chipText, childId === c.id && styles.chipTextActive]}>{c.alias}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.label}>Tokens a ganar</Text>
        <TextInput style={styles.input} placeholder="Ej: 10" value={tokenReward} onChangeText={setTokenReward} keyboardType="number-pad" />

        <Text style={styles.label}>Duración</Text>
        <View style={styles.chipsRow}>
          {DURATION_OPTIONS.map(o => (
            <TouchableOpacity
              key={o.days}
              style={[styles.chip, days === o.days && styles.chipActive]}
              onPress={() => setDays(o.days)}
            >
              <Text style={[styles.chipText, days === o.days && styles.chipTextActive]}>{o.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
          <Text style={styles.createBtnText}>Crear tarea</Text>
        </TouchableOpacity>
      </ScrollView>
    </PearlBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.text, marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: Colors.white, borderRadius: 10, padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#DDD' },
  textArea: { height: 90, textAlignVertical: 'top' },
  noChildren: { color: '#999', fontStyle: 'italic' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: Colors.white, borderWidth: 1, borderColor: '#DDD' },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 14, color: Colors.text },
  chipTextActive: { color: '#FFF', fontWeight: '600' },
  createBtn: { backgroundColor: Colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 28 },
  createBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
