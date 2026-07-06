import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme';
import { useGlobal } from '../context/GlobalContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MONTHS_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const GAP = 8;

const formatExpiry = (iso) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

export default function TareasMenorScreen({ navigation, route }) {
  const { currentUser, getTasksForChild, expireOverdueTasks, taskPhotos } = useGlobal();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={() => route.params?.fromDrawer ? navigation.navigate('DashboardMenor', { openDrawer: true }) : navigation.goBack()} style={{ paddingLeft: insets.left + 12 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, insets, route.params?.fromDrawer]);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1);
  const [cardW, setCardW] = useState(100);
  const [expandedCats, setExpandedCats] = useState({});
  const scrollRef = useRef(null);
  const toggleCat = (key) => setExpandedCats(p => ({ ...p, [key]: !p[key] }));

  useEffect(() => { expireOverdueTasks(); }, []);

  useEffect(() => {
    const w = Math.floor((Dimensions.get('window').width - 2 * GAP) / 3);
    setCardW(w);
    setTimeout(() => {
      const idx = now.getMonth();
      scrollRef.current?.scrollTo({ x: Math.max(0, (idx - 1) * (w + GAP)), animated: false });
    }, 100);
  }, []);

  const snapInterval = cardW + GAP;

  const monthKey = `${year}-${String(selMonth).padStart(2, '0')}`;

  const allTasks = getTasksForChild(currentUser.id);
  const filtered = allTasks.filter(t => {
    const d = new Date(t.createdAt);
    return d.getFullYear() === year && d.getMonth() + 1 === selMonth;
  });
  const activeTasks = filtered.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const doneTasks = filtered.filter(t => t.status !== 'pending' && t.status !== 'in_progress');

  const getStatusLabel = (task) => {
    if (task.status === 'pending') return task.redoneAt ? 'Rehacer' : 'Nueva';
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

  const isActive = (task) => task.status === 'pending' || task.status === 'in_progress';

  const getReadonly = (task) => !['pending', 'in_progress', 'completed'].includes(task.status);

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
            <Ionicons name="chevron-forward" size={12} color={Colors.primary} />
          </View>
          {(task.status === 'completed' || task.status === 'approved') && taskPhotos[task.id] && (
            <Image source={{ uri: taskPhotos[task.id] }} style={styles.thumb} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.container}>
        <View style={styles.yearRow}>
          <TouchableOpacity onPress={() => setYear(y => y - 1)}>
            <Ionicons name="chevron-back" size={22} color="#E88900" />
          </TouchableOpacity>
          <Text style={styles.yearText}>Tareas {year}</Text>
          <TouchableOpacity onPress={() => setYear(y => Math.min(y + 1, now.getFullYear()))} disabled={year >= now.getFullYear()}>
            <Ionicons name="chevron-forward" size={22} color={year >= now.getFullYear() ? '#ccc' : '#E88900'} />
          </TouchableOpacity>
        </View>

        <View style={styles.carouselDivider} />
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={snapInterval}
          snapToAlignment="start"
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: 12, gap: GAP }}
        >
          {Array.from({ length: 12 }, (_, i) => {
            const mNum = i + 1;
            const isCurrent = year === now.getFullYear() && mNum === now.getMonth() + 1;
            const isSelected = selMonth === mNum;
            return (
              <TouchableOpacity
                key={mNum}
                activeOpacity={0.7}
                onPress={() => setSelMonth(mNum)}
                style={[styles.monthCard, { width: cardW }, isCurrent && styles.monthCardCurrent, isSelected && styles.monthCardSelected]}
              >
                <Text style={[styles.monthName, isCurrent && styles.monthCardCurrentText]}>{MONTHS[mNum - 1]}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={styles.carouselDivider} />

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
                {[
                  { key: 'approved', label: 'Aprobadas', icon: 'checkmark-circle', color: '#5B9E4A' },
                  { key: 'completed', label: 'Completadas', icon: 'time', color: '#3A7BD5' },
                  { key: 'expired', label: 'Vencidas', icon: 'alert-circle', color: '#C0693A' },
                  { key: 'rejected', label: 'Rechazadas', icon: 'close-circle', color: '#db2777' },
                ].map(cat => {
                  const catTasks = doneTasks.filter(t => t.status === cat.key);
                  if (catTasks.length === 0) return null;
                  const catKey = `${cat.key}-${monthKey}`;
                  const open = expandedCats[catKey];
                  return (
                    <View key={cat.key} style={styles.catBlock}>
                      <TouchableOpacity style={styles.catHeader} onPress={() => toggleCat(catKey)} activeOpacity={0.7}>
                        <View style={styles.catLeft}>
                          <Ionicons name={cat.icon} size={14} color={cat.color} />
                          <Text style={[styles.catLabel, { color: cat.color }]}>{cat.label}</Text>
                          <Text style={styles.catCount}>{catTasks.length}</Text>
                        </View>
                        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color="#999" />
                      </TouchableOpacity>
                      {open && <View style={styles.catCards}>{catTasks.map(renderCard)}</View>}
                    </View>
                  );
                })}
              </View>
            </View>
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
  empty: { color: '#ccc', fontStyle: 'italic', textAlign: 'center', marginTop: 40, fontSize: 15 },

  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 16, paddingBottom: 4, gap: 12 },
  yearText: { fontSize: 18, fontWeight: '800', color: '#1e293b' },

  carouselDivider: { height: 1, backgroundColor: '#ddd', marginVertical: 3 },
  monthCard: {
    backgroundColor: '#f8f9fa', borderRadius: 14, padding: 10,
    alignItems: 'center', paddingTop: 12, paddingBottom: 10,
  },
  monthCardCurrent: { backgroundColor: '#E88900' },
  monthCardSelected: { borderWidth: 2, borderColor: '#E88900' },
  monthName: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  monthCardCurrentText: { color: '#FFF' },

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
  catBlock: { marginBottom: 6 },
  catHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  catLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catLabel: { fontSize: 14, fontWeight: '700' },
  catCount: { fontSize: 13, fontWeight: '700', color: '#999', marginLeft: 4 },
  catCards: { marginTop: 6, paddingLeft: 4 },
});
