import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, Dimensions } from 'react-native';
const SCREEN_W = Dimensions.get('window').width;
const MONTH_CARD_W = (SCREEN_W - 32 - 20) / 3;
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme';
import { useGlobal } from '../context/GlobalContext';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const CATEGORIES = [
  { key: 'completed', label: 'Pend. aprobación', icon: 'time', color: '#3A7BD5' },
  { key: 'pending', label: 'Pendientes', icon: 'ellipse', color: '#D4721A' },
  { key: 'approved', label: 'Aprobadas', icon: 'checkmark-circle', color: '#5B9E4A' },
  { key: 'expired', label: 'Vencidas', icon: 'alert-circle', color: '#C0693A' },
];

const formatExpiry = (iso) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

export default function TareasEnCursoScreen({ navigation }) {
  const { currentUser, tasks, getTasksForAdult, getTasksForChild, approveTask, rejectTask, redoTask, expireOverdueTasks, taskPhotos, getChildren, users } = useGlobal();
  const now = new Date();
  const availableYears = [...new Set(tasks.map(t => new Date(t.createdAt).getFullYear()))].sort((a, b) => b - a);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [expandedChildren, setExpandedChildren] = useState({});
  const monthRef = useRef(null);

  useEffect(() => { expireOverdueTasks(); }, []);

  useEffect(() => {
    if (tasks.length > 0) {
      const idx = now.getMonth();
      const offset = 16 + idx * (MONTH_CARD_W + 10) + MONTH_CARD_W / 2 - SCREEN_W / 2;
      const timer = setTimeout(() => monthRef.current?.scrollTo({ x: Math.max(0, offset), animated: false }), 300);
      return () => clearTimeout(timer);
    }
  }, [tasks]);

  const toggleCategory = (key) => setExpandedCategories(p => ({ ...p, [key]: !p[key] }));
  const toggleChild = (id) => setExpandedChildren(p => ({ ...p, [id]: !p[id] }));

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
              <TouchableOpacity style={styles.btnApprove} onPress={async () => { await approveTask(task.id, currentUser.id); }}>
                <Ionicons name="checkmark" size={14} color="#FFF" />
                <Text style={styles.btnText}>Aprobar</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.btnRedo} onPress={() => redoTask(task.id)}>
              <Ionicons name="refresh" size={14} color={Colors.primary} />
              <Text style={[styles.btnText, { color: Colors.primary }]}>Rehacer</Text>
            </TouchableOpacity>
            {task.status === 'completed' && (
              <TouchableOpacity style={styles.btnReject} onPress={async () => { await rejectTask(task.id, currentUser.id); }}>
                <Ionicons name="close" size={14} color="#FFF" />
                <Text style={styles.btnText}>Rechazar</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const children = currentUser.role === 'adulto' ? getChildren(currentUser.id) : [];

  const renderAdultChildren = (year, month) => {
    return children.map(child => {
      const childTasks = allTasks.filter(t => t.childId === child.id && new Date(t.createdAt).getFullYear() === year && new Date(t.createdAt).getMonth() + 1 === month);
      const isChildOpen = expandedChildren[child.id];
      const childKey = `${year}-${String(month).padStart(2, '0')}-${child.id}`;
      const cats = {
        approved: childTasks.filter(t => t.status === 'approved'),
        completed: childTasks.filter(t => t.status === 'completed'),
        pending: childTasks.filter(t => t.status === 'pending' || t.status === 'in_progress' || t.status === 'rejected'),
        expired: childTasks.filter(t => t.status === 'expired'),
      };
      return (
        <View key={child.id} style={styles.childBlock}>
          <TouchableOpacity style={styles.childHeader} onPress={() => toggleChild(child.id)} activeOpacity={0.7}>
            <View style={styles.childLeft}>
              <Ionicons name="person-circle" size={18} color="#1e293b" />
              <Text style={styles.childName}>{child.alias}</Text>
              <Text style={styles.childCount}>{childTasks.length}</Text>
            </View>
            <Ionicons name={isChildOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#999" />
          </TouchableOpacity>
          {isChildOpen && (childTasks.length > 0
            ? CATEGORIES.map(cat => renderCategory(childKey, cat, cats[cat.key]))
            : <Text style={styles.noChildTasks}>Sin tareas en este mes</Text>
          )}
        </View>
      );
    });
  };

  const renderCategory = (parentKey, cat, tasks) => {
    const catKey = `${parentKey}-${cat.key}`;
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
    const cats = {
      approved: tasks.filter(t => t.status === 'approved'),
      completed: tasks.filter(t => t.status === 'completed'),
      pending: tasks.filter(t => t.status === 'pending' || t.status === 'in_progress' || t.status === 'rejected'),
      expired: tasks.filter(t => t.status === 'expired'),
    };
    return (
      <View style={styles.monthSection}>
        <View style={styles.monthBody}>
          {CATEGORIES.map(cat => renderCategory(monthKey, cat, cats[cat.key]))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.yearRow}>
        <TouchableOpacity onPress={() => setSelectedYear(y => y - 1)}>
          <Ionicons name="chevron-back" size={22} color={availableYears.length > 0 && selectedYear > Math.min(...availableYears) ? Colors.primary : '#ccc'} />
        </TouchableOpacity>
        <Text style={styles.yearText}>Tareas {selectedYear}</Text>
        <TouchableOpacity onPress={() => setSelectedYear(y => y + 1)}>
          <Ionicons name="chevron-forward" size={22} color={availableYears.length > 0 && selectedYear < Math.max(...availableYears) ? Colors.primary : '#ccc'} />
        </TouchableOpacity>
      </View>
      {(currentUser.role === 'adulto' || (selectedYear && grouped[selectedYear])) && (
        <ScrollView ref={monthRef} horizontal showsHorizontalScrollIndicator={false} style={styles.monthBar} contentContainerStyle={styles.monthBarContent}>
          {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => {
            const isCurrent = selectedYear === now.getFullYear() && m === now.getMonth() + 1;
            const isSelected = selectedMonth === m;
            return (
              <TouchableOpacity
                key={m}
                style={[styles.monthCard, isCurrent && styles.monthCardCurrent, isSelected && !isCurrent && styles.monthCardSelected]}
                onPress={() => setSelectedMonth(m)}
              >
                <Text style={[styles.monthName, isCurrent && styles.textWhite, isSelected && !isCurrent && styles.textOrange]}>{MONTHS[m - 1]}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          {currentUser.role === 'adulto' ? (
            children.length === 0 ? (
              <Text style={styles.empty}>No hay hijos registrados</Text>
            ) : (
              renderAdultChildren(selectedYear, selectedMonth)
            )
          ) : allTasks.length === 0 ? (
            <Text style={styles.empty}>No hay tareas todavía</Text>
          ) : selectedYear && grouped[selectedYear] && selectedMonth && grouped[selectedYear][selectedMonth] ? (
            renderMonth(selectedYear, selectedMonth)
          ) : (
            <Text style={styles.empty}>Sin tareas en este mes</Text>
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

  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#ede8e2' },
  yearText: { fontSize: 18, fontWeight: '800', color: '#1e293b', minWidth: 100, textAlign: 'center' },

  monthBar: { backgroundColor: '#FFF', maxHeight: 66, borderBottomWidth: 1, borderBottomColor: '#ede8e2' },
  monthBarContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 10, alignItems: 'center' },
  monthCard: { backgroundColor: '#f8f9fa', borderRadius: 14, width: MONTH_CARD_W, paddingVertical: 12, alignItems: 'center' },
  monthCardCurrent: { backgroundColor: '#E88900' },
  monthCardSelected: { borderWidth: 2, borderColor: '#E88900' },
  monthName: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  textWhite: { color: '#FFF' },
  textOrange: { color: '#E88900' },

  monthSection: { marginTop: 8 },
  monthBody: { paddingLeft: 8 },

  childBlock: { backgroundColor: '#FFF', borderRadius: 12, padding: 8, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  childHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  childLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  childName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  childCount: { fontSize: 12, fontWeight: '600', color: '#999', marginLeft: 2 },
  noChildTasks: { color: '#ccc', fontStyle: 'italic', textAlign: 'center', fontSize: 13, paddingVertical: 8 },

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
