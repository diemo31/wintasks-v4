import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Colors } from '../theme';
import { useGlobal } from '../context/GlobalContext';
import PearlBackground from '../components/PearlBackground';

export default function CreateTaskScreen({ navigation }) {
  const { currentUser, getChildren, createTask } = useGlobal();
  const children = getChildren(currentUser.id);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [childId, setChildId] = useState('');
  const [tokenReward, setTokenReward] = useState('');

  const handleCreate = () => {
    if (!title.trim() || !childId || !tokenReward) return;
    createTask({ title: title.trim(), description: description.trim(), childId, tokenReward: Number(tokenReward), createdBy: currentUser.id });
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
          <View style={styles.childrenRow}>
            {children.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.childChip, childId === c.id && styles.childChipActive]}
                onPress={() => setChildId(c.id)}
              >
                <Text style={[styles.childChipText, childId === c.id && styles.childChipTextActive]}>{c.alias}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.label}>Tokens a ganar</Text>
        <TextInput style={styles.input} placeholder="Ej: 10" value={tokenReward} onChangeText={setTokenReward} keyboardType="number-pad" />

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
  childrenRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  childChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, backgroundColor: Colors.white, borderWidth: 1, borderColor: '#DDD' },
  childChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  childChipText: { fontSize: 14, color: Colors.text },
  childChipTextActive: { color: '#FFF', fontWeight: '600' },
  createBtn: { backgroundColor: Colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 28 },
  createBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
