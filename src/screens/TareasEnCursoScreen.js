import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme';
import { useGlobal } from '../context/GlobalContext';
import PearlBackground from '../components/PearlBackground';

const STATUS_MAP = {
  pending: { label: 'Pendiente', color: '#C8944A' },
  completed: { label: 'Completada', color: '#4A90D9' },
  approved: { label: 'Aprobada', color: '#5B9E4A' },
  rejected: { label: 'Rechazada', color: '#C0392B' },
  expired: { label: 'Vencida', color: '#888' },
};

export default function TareasEnCursoScreen({ navigation }) {
  const { currentUser, getTasksForAdult, getTasksForChild, completeTask, approveTask, rejectTask } = useGlobal();
  const tasks = currentUser.role === 'adulto' ? getTasksForAdult(currentUser.id) : getTasksForChild(currentUser.id);

  const handleComplete = (taskId) => {
    completeTask(taskId);
  };

  const handleApprove = (taskId) => {
    approveTask(taskId);
  };

  const handleReject = (taskId) => {
    rejectTask(taskId);
  };

  const renderTask = (task) => {
    const status = STATUS_MAP[task.status] || STATUS_MAP.pending;
    return (
      <View key={task.id} style={styles.taskCard}>
        <View style={styles.taskHeader}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          <View style={[styles.badge, { backgroundColor: status.color }]}>
            <Text style={styles.badgeText}>{status.label}</Text>
          </View>
        </View>
        {task.description ? <Text style={styles.taskDesc}>{task.description}</Text> : null}
        <Text style={styles.taskReward}>🏅 {task.tokenReward} tokens</Text>
        {currentUser.role === 'menor' && task.status === 'pending' && (
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleComplete(task.id)}>
            <Text style={styles.actionBtnText}>Marcar como completada</Text>
          </TouchableOpacity>
        )}
        {currentUser.role === 'adulto' && task.status === 'completed' && (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => handleApprove(task.id)}>
              <Ionicons name="checkmark" size={18} color="#FFF" />
              <Text style={styles.actionBtnText}>Aprobar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleReject(task.id)}>
              <Ionicons name="close" size={18} color="#FFF" />
              <Text style={styles.actionBtnText}>Rechazar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <PearlBackground>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>
          {currentUser.role === 'adulto' ? 'Tareas creadas' : 'Mis tareas'}
        </Text>
        {tasks.length === 0 ? (
          <Text style={styles.empty}>No hay tareas todavía</Text>
        ) : (
          tasks.map(renderTask)
        )}
      </ScrollView>
    </PearlBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.text, marginBottom: 20 },
  empty: { color: '#999', fontStyle: 'italic', textAlign: 'center', marginTop: 40 },
  taskCard: { backgroundColor: Colors.white, borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  taskTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, marginLeft: 8 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  taskDesc: { fontSize: 13, color: '#666', marginBottom: 6 },
  taskReward: { fontSize: 13, color: Colors.primary, fontWeight: '600', marginBottom: 8 },
  actionBtn: { backgroundColor: Colors.primary, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', gap: 10 },
  approveBtn: { backgroundColor: '#5B9E4A', flex: 1, flexDirection: 'row', gap: 4 },
  rejectBtn: { backgroundColor: '#C0392B', flex: 1, flexDirection: 'row', gap: 4 },
});
