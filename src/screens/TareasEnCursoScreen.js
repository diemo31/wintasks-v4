import React, { useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme';
import { useGlobal } from '../context/GlobalContext';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const formatExpiry = (iso) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

export default function TareasEnCursoScreen({ navigation }) {
  const { currentUser, getTasksForAdult, getTasksForChild, approveTask, rejectTask, redoTask, expireOverdueTasks, taskPhotos } = useGlobal();

  useEffect(() => { expireOverdueTasks(); }, []);

  const allTasks = currentUser.role === 'adulto' ? getTasksForAdult(currentUser.id) : getTasksForChild(currentUser.id);
  const activeTasks = allTasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const doneTasks = allTasks.filter(t => t.status !== 'pending' && t.status !== 'in_progress');

  const getStatusLabel = (task) => {
    if (task.status === 'pending' && currentUser.role === 'menor') {
      return task.redoneAt ? 'Rehacer' : 'Nueva';
    }
    const map = {
      pending: 'Pendiente', in_progress: 'En proceso', completed: 'Completada',
      approved: 'Aprobada', rejected: 'Rechazada', expired: 'Vencida',
    };
    return map[task.status] || 'Pendiente';
  };

  const getCardStyle = (task, isActive) => {
    if (isActive) return styles.cardActive;
    if (task.status === 'completed') return styles.cardCompleted;
    if (task.status === 'approved') return styles.cardApproved;
    if (task.status === 'expired') return styles.cardExpired;
    return styles.card;
  };

  const isActive = (task) => currentUser.role === 'menor' && (task.status === 'pending' || task.status === 'in_progress');
  const isViewable = (task) => currentUser.role === 'menor' || (currentUser.role === 'adulto' && (task.status === 'completed' || task.status === 'rejected'));
  const showAdultActions = (task) => currentUser.role === 'adulto' && (task.status === 'completed' || task.status === 'rejected');

  const getReadonly = (task) => {
    if (currentUser.role === 'adulto') return true;
    return !['pending', 'in_progress', 'completed'].includes(task.status);
  };

  const renderCard = (task) => {
    const act = isActive(task);
    const cardStyle = getCardStyle(task, act);
    const label = getStatusLabel(task);
    const isRedo = task.status === 'pending' && task.redoneAt;

    return (
      <TouchableOpacity
        key={task.id}
        style={cardStyle}
        onPress={() => navigation.navigate('TaskProgress', { taskId: task.id, readonly: getReadonly(task) })}
        activeOpacity={0.8}
      >
        <View style={styles.cardRow}>
          <View style={styles.cardBodyLeft}>
            <Text style={[styles.title, !act && styles.titleDone]} numberOfLines={1}>{task.title}</Text>
            {task.description ? <Text style={styles.desc} numberOfLines={1}>{task.description}</Text> : null}
            <View style={styles.metaRow}>
              <Ionicons name="trophy" size={13} color={Colors.primary} />
              <Text style={styles.metaValue}>{task.tokenReward}</Text>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaLabel}>{formatExpiry(task.expiresAt)}</Text>
            </View>
          </View>
          <View style={styles.cardBodyRight}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Text style={[
                styles.statusChip,
                isRedo && styles.statusChipRedo,
                !act && styles.statusDone,
                label === 'Nueva' && styles.labelNueva,
                task.status === 'approved' && styles.labelApproved,
                task.status === 'completed' && styles.labelCompleted,
                task.status === 'expired' && styles.labelExpired,
              ]}>
                {label}
              </Text>
              {task.lastReminderAt && currentUser?.role === 'adulto' && (
                <Ionicons name="notifications" size={13} color={Colors.primary} />
              )}
            </View>
            {!showAdultActions(task) && (
              <Ionicons name="chevron-forward" size={12} color={Colors.primary} />
            )}
          </View>
          {(task.status === 'completed' || task.status === 'approved') && taskPhotos[task.id] && (
            <Image source={{ uri: taskPhotos[task.id] }} style={styles.thumb} />
          )}
        </View>

        {showAdultActions(task) && (
          <View style={styles.actionsRow}>
            {task.status === 'completed' && (
              <TouchableOpacity style={styles.btnApprove} onPress={() => approveTask(task.id)}>
                <Ionicons name="checkmark" size={14} color="#FFF" />
                <Text style={styles.btnText}>Aprobar</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.btnRedo} onPress={() => redoTask(task.id)}>
              <Ionicons name="refresh" size={14} color={Colors.primary} />
              <Text style={[styles.btnText, { color: Colors.primary }]}>Rehacer</Text>
            </TouchableOpacity>
            {task.status === 'completed' && (
              <TouchableOpacity style={styles.btnReject} onPress={() => rejectTask(task.id)}>
                <Ionicons name="close" size={14} color="#FFF" />
                <Text style={styles.btnText}>Rechazar</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.container}>
        {currentUser.role === 'adulto' ? (
          <View style={styles.content}>
            <Text style={styles.heading}>Tareas creadas</Text>
            {allTasks.length === 0 ? <Text style={styles.empty}>No hay tareas todavía</Text> : allTasks.map(renderCard)}
          </View>
        ) : (
          <>
            <View style={styles.sectionPending}>
              <View style={styles.content}>
                <Text style={styles.heading}>Tareas pendientes</Text>
                {activeTasks.length === 0 ? <Text style={styles.empty}>No hay tareas pendientes</Text> : activeTasks.map(renderCard)}
              </View>
            </View>
            {doneTasks.length > 0 && (
              <>
                <View style={styles.divider} />
                <View style={styles.sectionDone}>
                  <View style={styles.content}>
                    <Text style={styles.heading}>Completadas</Text>
                    {doneTasks.map(renderCard)}
                  </View>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F6F4' },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 4 },
  sectionPending: { backgroundColor: '#EDE8E2' },
  sectionDone: { backgroundColor: '#F8F6F4', paddingBottom: 24 },
  divider: { height: 1, backgroundColor: '#E0D8D0' },
  heading: { fontSize: 17, fontWeight: '700', color: '#1e293b', marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b', marginTop: 24, marginBottom: 16 },
  empty: { color: '#ccc', fontStyle: 'italic', textAlign: 'center', marginTop: 40, fontSize: 15 },

  card: { backgroundColor: '#FFF', borderRadius: 12, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1, overflow: 'hidden' },
  cardActive: { backgroundColor: '#F0EDEA', borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#D4721A', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1, overflow: 'hidden' },
  cardCompleted: { backgroundColor: '#FFF', borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#3A7BD5', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1, overflow: 'hidden' },
  cardApproved: { backgroundColor: '#FFF', borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#5B9E4A', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1, overflow: 'hidden' },
  cardExpired: { backgroundColor: '#FFF', borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#C0693A', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1, overflow: 'hidden' },

  cardRow: { flexDirection: 'row', alignItems: 'center' },
  cardBodyLeft: { flex: 1, paddingVertical: 8, paddingHorizontal: 10 },
  cardBodyRight: { justifyContent: 'center', alignItems: 'flex-end', paddingVertical: 8, paddingRight: 12, gap: 3 },

  statusChip: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  statusChipRedo: { color: '#CC7A00' },
  labelNueva: { color: '#D4721A' },
  statusDone: { fontSize: 11, fontWeight: '500', color: '#ccc' },
  labelApproved: { color: '#5B9E4A' },
  labelCompleted: { color: '#3A7BD5' },
  labelExpired: { color: '#C0693A' },

  title: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  titleDone: { color: '#8a8580' },
  desc: { fontSize: 13, color: '#a8a29e', marginBottom: 8, lineHeight: 18 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  metaValue: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  metaDot: { fontSize: 12, color: '#ccc' },
  metaLabel: { fontSize: 12, color: '#706a64' },

  thumb: { width: 42, height: 42, borderRadius: 6, marginRight: 10, backgroundColor: '#f0f0f0' },

  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0ebe4' },
  btnApprove: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#5B9E4A', paddingVertical: 9, borderRadius: 8 },
  btnRedo: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#FFF', borderWidth: 1, borderColor: Colors.primary, paddingVertical: 8, borderRadius: 8 },
  btnReject: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#C0392B', paddingVertical: 9, borderRadius: 8 },
  btnText: { fontSize: 12, fontWeight: '600', color: '#FFF' },
});
