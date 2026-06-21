import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGlobal } from '../context/GlobalContext';

function ListDetail({ list, onBack, onToggle, onAddItem, onDeleteItem, onComplete }) {
  const [input, setInput] = useState('');

  const handleAdd = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onAddItem(list.id, trimmed);
    setInput('');
  };

  const allChecked = list.items.length > 0 && list.items.every(i => i.checked);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#E88900" />
        </TouchableOpacity>
        <Text style={styles.detailTitle} numberOfLines={1}>{list.name}</Text>
        {list.completed ? (
          <Ionicons name="checkmark-done-circle" size={22} color="#22c55e" />
        ) : allChecked ? (
          <Ionicons name="checkmark-circle" size={22} color="#22c55e" />
        ) : null}
      </View>
      {list.completed ? (
        <View style={styles.completedBanner}>
          <Ionicons name="checkmark-done-circle" size={20} color="#22c55e" />
          <Text style={styles.completedBannerText}>Lista completada</Text>
        </View>
      ) : (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Agregar item..."
            placeholderTextColor="#aaa"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleAdd}
          />
          <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
            <Ionicons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}
      <FlatList
        data={list.items}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <TouchableOpacity onPress={() => !list.completed && onToggle(list.id, item.id)} style={styles.check}>
              <Ionicons name={item.checked ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={item.checked ? '#22c55e' : '#ccc'} />
            </TouchableOpacity>
            <Text style={[styles.itemText, item.checked && styles.itemTextDone]}>{item.text}</Text>
            {!list.completed && (
              <TouchableOpacity onPress={() => onDeleteItem(list.id, item.id)}>
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>La lista está vacía</Text>}
      />
      {!list.completed && allChecked && (
        <TouchableOpacity style={styles.completeBtn} onPress={() => onComplete(list.id)}>
          <Ionicons name="checkmark-done-circle" size={20} color="#FFF" />
          <Text style={styles.completeBtnText}>Marcar completada</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function ToDoScreen() {
  const { todoLists, createList, deleteList, markListCompleted, addListItem, toggleListItem, deleteListItem, renameList } = useGlobal();
  const [selectedId, setSelectedId] = useState(null);
  const [newName, setNewName] = useState('');
  const [renameModal, setRenameModal] = useState(null);
  const [renameInput, setRenameInput] = useState('');

  const selectedList = todoLists.find(l => l.id === selectedId) || null;
  const activeLists = todoLists.filter(l => !l.completed);
  const completedLists = todoLists.filter(l => l.completed);

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createList(trimmed);
    setNewName('');
  };

  const handleLongPress = (list) => {
    Alert.alert(list.name, '¿Qué querés hacer?', [
      { text: 'Renombrar', onPress: () => { setRenameModal(list.id); setRenameInput(list.name); }},
      { text: list.completed ? 'Eliminar' : 'Eliminar', style: 'destructive', onPress: () => deleteList(list.id) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const handleRename = () => {
    if (renameInput.trim() && renameModal) {
      renameList(renameModal, renameInput.trim());
      setRenameModal(null);
    }
  };

  const renderListCard = (item) => {
    const checked = item.items.filter(i => i.checked).length;
    return (
      <TouchableOpacity key={item.id} style={[styles.listCard, item.completed && styles.listCardDone]} onPress={() => setSelectedId(item.id)} onLongPress={() => handleLongPress(item)}>
        <View style={styles.listInfo}>
          <Text style={[styles.listName, item.completed && styles.listNameDone]}>{item.name}</Text>
          <Text style={styles.listMeta}>{item.completed ? `${new Date(item.createdAt).toLocaleDateString('es-AR')} · ${checked}/${item.items.length} items` : `${checked}/${item.items.length} items`}</Text>
        </View>
        {item.completed && <Ionicons name="checkmark-done-circle" size={20} color="#22c55e" />}
        {!item.completed && <Ionicons name="chevron-forward" size={20} color="#ccc" />}
      </TouchableOpacity>
    );
  };

  if (selectedList) {
    return (
      <View style={styles.container}>
        <ListDetail
          list={selectedList}
          onBack={() => setSelectedId(null)}
          onToggle={toggleListItem}
          onAddItem={addListItem}
          onDeleteItem={deleteListItem}
          onComplete={markListCompleted}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Nombre de la lista nueva..."
          placeholderTextColor="#aaa"
          value={newName}
          onChangeText={setNewName}
          onSubmitEditing={handleCreate}
        />
        <TouchableOpacity style={styles.addBtn} onPress={handleCreate}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {activeLists.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Activas</Text>
          {activeLists.map(renderListCard)}
        </>
      )}

      {completedLists.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Completadas</Text>
          {completedLists.map(renderListCard)}
        </>
      )}

      {todoLists.length === 0 && <Text style={styles.empty}>No tenés listas</Text>}

      <Modal visible={!!renameModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Renombrar lista</Text>
            <TextInput
              style={styles.modalInput}
              value={renameInput}
              onChangeText={setRenameInput}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setRenameModal(null)}>
                <Text style={styles.modalCancel}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRename}>
                <Text style={styles.modalOk}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF', padding: 12 },
  inputRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  input: {
    flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 14,
    fontSize: 15, color: '#1e293b', backgroundColor: '#f8f9fa',
  },
  addBtn: { backgroundColor: '#E88900', width: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', marginBottom: 8 },
  listCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: 12,
    padding: 14, marginBottom: 8,
  },
  listCardDone: { opacity: 0.6 },
  listInfo: { flex: 1 },
  listName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  listNameDone: { textDecorationLine: 'line-through', color: '#888' },
  listMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  backBtn: { padding: 4 },
  detailTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#1e293b' },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  check: { marginRight: 10 },
  itemText: { flex: 1, fontSize: 15, color: '#1e293b' },
  itemTextDone: { textDecorationLine: 'line-through', color: '#aaa' },
  empty: { textAlign: 'center', color: '#bbb', fontSize: 15, marginTop: 40 },
  completedBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#f0fdf4', borderRadius: 10, padding: 10, marginBottom: 12,
  },
  completedBannerText: { fontSize: 14, fontWeight: '600', color: '#22c55e' },
  completeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#22c55e', borderRadius: 12, padding: 14, marginTop: 8,
  },
  completeBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 40 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 14, padding: 20 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  modalInput: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12,
    fontSize: 15, color: '#1e293b', paddingVertical: 8,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 16 },
  modalCancel: { fontSize: 15, color: '#888' },
  modalOk: { fontSize: 15, color: '#E88900', fontWeight: '700' },
});
