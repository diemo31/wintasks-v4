import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme';
import { useGlobal } from '../context/GlobalContext';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const CATEGORIES = [
  { key: 'approved', label: 'Aprobadas', icon: 'checkmark-circle', color: '#5B9E4A' },
  { key: 'completed', label: 'Completadas', icon: 'time', color: '#3A7BD5' },
  { key: 'pending', label: 'Pendientes', icon: 'ellipse', color: '#D4721A' },
  { key: 'expired', label: 'Vencidas', icon: 'alert-circle', color: '#C0693A' },
];

const formatExpiry = (iso) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

export default function TareasEnCursoScreen({ navigation }) {
  const { currentUser, getTasksForAdult, getTasksForChild, approveTask, rejectTask, redoTask, expireOverdueTasks, taskPhotos } = useGlobal();
  const [expandedYears, setExpandedYears] = useState({});
  const [expandedMonths, setExpandedMonths] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});

  useEffect(() => { expireOverdueTasks(); }, []);

  const toggleYear = (year) => setExpandedYears(p => ({ ...p, [year]: !p[year] }));
  const toggleMonth = (key) => setExpandedMonths(p => ({ ...p, [key]: !p[key] }));
  const toggleCategory = (key) => setExpandedCategories(p => ({ ...p, [key]: !p[key] }));

  const allTasks = currentUser.role === 'adulto' ? getTasksForAdult(currentUser.id) : getTasksForChild(currentUser.id);

  const grouped = {};
  allTasks.forEach(task => {
    const d = new Date(task.createdAt);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    if (!grouped[year]) grouped[year] = {};
    if (!grouped[year][month]) grouped[year][month] = [];
    grouped[year][month].push(task);
  });

  const yearsSorted = Object.keys(grouped).sort((a, b) => b - a);

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

  const renderCategory = (monthKey, cat, tasks) => {
    const catKey = `${monthKey}-${cat.key}`;
    const open = expandedCategories[catKey];
    if (tasks.length === 0) return null;
    return (
      <View key={cat.key} style={styles.categoryBlock}>
        <TouchableOpacity style={styles.categoryHeader} onPress={() => toggleCategory(catKey)} activeOpacity={0.7}>
          <View style={styles.categoryLeft}>
            <Ionicons name={cat.icon} size={14} color={cat.color} />
            <Text style={[styles.categoryLabel, { color: cat.color }]}>{cat.label}</Text>
            <Text style={styles.categoryCount}>{tasks.length}</Text>
          </View>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color="#999" />
        </TouchableOpacity>
        {open && <View style={styles.categoryCards}>{tasks.map(renderCard)}</View>}
      </View>
    );
  };

  const renderMonth = (year, month) => {
    const tasks = grouped[year][month];
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    const open = expandedMonths[monthKey];
    const cats = {
      approved: tasks.filter(t => t.status === 'approved'),
      completed: tasks.filter(t => t.status === 'completed'),
      pending: tasks.filter(t => t.status === 'pending' || t.status === 'in_progress' || t.status === 'rejected'),
      expired: tasks.filter(t => t.status === 'expired'),
    };
    const total = tasks.length;
    return (
      <View key={month} style={styles.monthSection}>
        <TouchableOpacity style={styles.monthHeader} onPress={() => toggleMonth(monthKey)} activeOpacity={0.7}>
          <Text style={styles.monthTitle}>{MONTHS[month - 1]} — {total} tarea{total !== 1 ? 's' : ''}</Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#888" />
        </TouchableOpacity>
        {open && (
          <View style={styles.monthBody}>
            {CATEGORIES.map(cat => renderCategory(monthKey, cat, cats[cat.key]))}
          </View>
        )}
      </View>
    );
  };

  const renderYear = (year) => {
    const open = expandedYears[year];
    const months = Object.keys(grouped[year]).map(Number).sort((a, b) => b - a);
    return (
      <View key={year} style={styles.yearSection}>
        <TouchableOpacity style={styles.yearHeader} onPress={() => toggleYear(year)} activeOpacity={0.7}>
          <Text style={styles.yearTitle}>{year}</Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#666" />
        </TouchableOpacity>
        {open && months.map(m => renderMonth(year, m))}
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          {allTasks.length === 0 ? (
            <Text style={styles.empty}>No hay tareas todavía</Text>
          ) : (
            yearsSorted.map(renderYear)
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F6F4' },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 4 },
  empty: { color: '#ccc', fontStyle: 'italic', textAlign: 'center', marginTop: 40, fontSize: 15 },

  yearSection: { marginBottom: 16 },
  yearHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e0d8d0' },
  yearTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },

  monthSection: { marginTop: 8, marginLeft: 4 },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 8, backgroundColor: '#ede8e2', borderRadius: 8 },
  monthTitle: { fontSize: 14, fontWeight: '700', color: '#555' },
  monthBody: { marginTop: 6, paddingLeft: 8 },

  categoryBlock: { marginBottom: 4 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 4 },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  categoryLabel: { fontSize: 13, fontWeight: '700' },
  categoryCount: { fontSize: 12, fontWeight: '600', color: '#999', marginLeft: 2 },
  categoryCards: { marginTop: 2 },

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
