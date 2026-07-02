import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Modal, FlatList, Share, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGlobal } from '../context/GlobalContext';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const GAP = 8;

function monthKey(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

export default function HijosScreen({ navigation }) {
  const { currentUser, getChildren, getTasksForChild, getScoreGoal, setScoreGoal } = useGlobal();
  const children = getChildren(currentUser.id);
  const scrollRef = useRef(null);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [cardW, setCardW] = useState(100);
  const currentMonthStr = monthKey(now);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [expandedChild, setExpandedChild] = useState(null);
  const [showGoalPicker, setShowGoalPicker] = useState(false);

  const onScrollerLayout = useCallback((e) => {
    const w = e.nativeEvent.layout.width;
    setCardW(Math.floor((w - 2 * GAP) / 3));
  }, []);

  const snapInterval = cardW + GAP;

  useEffect(() => {
    const currentMonth = now.getMonth();
    const centerOffset = Math.max(0, Math.min((currentMonth - 1) * snapInterval, 9 * snapInterval));
    setTimeout(() => scrollRef.current?.scrollTo({ x: centerOffset, animated: false }), 100);
  }, [cardW]);

  const childTasks = {};
  children.forEach(child => {
    childTasks[child.id] = getTasksForChild(child.id);
  });

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, '0');
    const scores = children.map(child => {
      const done = childTasks[child.id].filter(t => {
        if (!t.completedAt) return false;
        const d = new Date(t.completedAt);
        return d.getFullYear() === year && d.getMonth() === i;
      }).length;
      return { ...child, done };
    }).sort((a, b) => b.done - a.done);
    const max = scores[0]?.done || 0;
    const winners = scores.filter(s => s.done === max && s.done > 0);
    return { month: m, scores, winners, hasData: scores.some(s => s.done > 0) };
  }), [children, childTasks, year]);

  const goPrevYear = () => {
    const py = year - 1;
    setYear(py);
    setSelectedMonth(`${py}-01`);
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  };

  const goNextYear = () => {
    const ny = Math.min(year + 1, now.getFullYear());
    setYear(ny);
    const m = ny < now.getFullYear() ? 12 : now.getMonth() + 1;
    setSelectedMonth(`${ny}-${String(m).padStart(2, '0')}`);
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  };

  const handleSelectMonth = (monthStr) => {
    setSelectedMonth(monthStr);
    setExpandedChild(null);
  };

  const toggleExpand = (childId) => {
    setExpandedChild(prev => prev === childId ? null : childId);
  };

  const [selYear, selMonthNum] = selectedMonth.split('-').map(Number);
  const isPastMonth = selYear < now.getFullYear() || (selYear === now.getFullYear() && selMonthNum < now.getMonth() + 1);

  const currentGoal = getScoreGoal(selectedMonth);

  const childrenWithMonthData = children.map(child => {
    const all = childTasks[child.id];
    const monthTasks = all.filter(t => {
      const created = monthKey(t.createdAt);
      const completed = t.completedAt ? monthKey(t.completedAt) : null;
      return created === selectedMonth || completed === selectedMonth;
    });
    const pending = monthTasks.filter(t => t.status === 'pending');
    const expired = monthTasks.filter(t => t.status === 'expired');
    const completed = monthTasks.filter(t => t.status === 'completed');
    const approved = monthTasks.filter(t => t.status === 'approved');
    return { ...child, monthTasks, pending, expired, completed, approved };
  });

  const PICKER_NUMBERS = Array.from({ length: 30 }, (_, i) => i + 1);

  const handleGoalSelect = (num) => {
    setScoreGoal(selectedMonth, num);
    setShowGoalPicker(false);
  };

  return (
    <ScrollView style={styles.container}>
      {children.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="people-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No tenés hijos vinculados</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.navigate('CrearMenor')}>
            <Text style={styles.emptyButtonText}>+ Crear menor</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.yearRow}>
            <TouchableOpacity onPress={goPrevYear}>
              <Ionicons name="chevron-back" size={22} color="#E88900" />
            </TouchableOpacity>
            <Text style={styles.yearText}>Score {year}</Text>
            <TouchableOpacity onPress={goNextYear} disabled={year >= now.getFullYear()}>
              <Ionicons name="chevron-forward" size={22} color={year >= now.getFullYear() ? '#ccc' : '#E88900'} />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={snapInterval}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={{ gap: GAP }}
            onLayout={onScrollerLayout}
          >
            {months.map(({ month, scores, winners, hasData }) => {
              const mNum = parseInt(month, 10);
              const monthStr = `${year}-${month}`;
              const isCurrent = year === now.getFullYear() && mNum === now.getMonth() + 1;
              const isSelected = selectedMonth === monthStr;
              return (
                <TouchableOpacity
                  key={month}
                  activeOpacity={0.7}
                  onPress={() => handleSelectMonth(monthStr)}
                  style={[styles.monthCard, { width: cardW }, isCurrent && styles.monthCardCurrent, isSelected && styles.monthCardSelected]}
                >
                  <Text style={[styles.monthName, isCurrent && styles.textWhite]}>{MONTHS[mNum - 1].slice(0, 3)}</Text>
                  {hasData ? (
                    <>
                      <Text style={[styles.winnerLabel, isCurrent && styles.textWhite]}>🏆 {winners.length === 1 ? winners[0].alias : winners.map(w => w.alias).join(' & ')}</Text>
                      {scores.map((child, i) => (
                        <View key={child.id} style={[styles.scoreRow, i === 0 && child.done > 0 && children.length > 1 ? (isCurrent ? styles.scoreRowWinnerCurrent : styles.scoreRowWinner) : null]}>
                          <Text style={[styles.scoreName, isCurrent && styles.textWhite]} numberOfLines={1}>{child.alias}</Text>
                          <Text style={[styles.scoreNum, isCurrent && styles.textWhite]}>{child.done}</Text>
                        </View>
                      ))}
                    </>
                  ) : isCurrent ? (
                    <>
                      <Text style={[styles.winnerLive, isCurrent && styles.textWhite]}>En curso</Text>
                      {children.map(child => (
                        <View key={child.id} style={styles.scoreRow}>
                          <Text style={[styles.scoreName, isCurrent && styles.textWhite]} numberOfLines={1}>{child.alias}</Text>
                          <Text style={[styles.scoreNum, isCurrent && styles.textWhite]}>0</Text>
                        </View>
                      ))}
                    </>
                  ) : (
                    <Text style={styles.noData}>Sin datos</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            style={styles.goalBar}
            activeOpacity={isPastMonth ? 1 : 0.7}
            onPress={isPastMonth ? undefined : () => setShowGoalPicker(true)}
          >
            <View style={styles.goalBarLeft}>
              <Ionicons name="flag-outline" size={18} color="#FEFCF8" />
              <Text style={styles.goalBarLabel}>Meta del Mes</Text>
            </View>
            <View style={styles.goalBarRight}>
              {currentGoal !== null ? (
                <>
                  <Text style={styles.goalBarValue}>{currentGoal} tareas</Text>
                  {isPastMonth && (
                    <Text style={styles.goalBarLocked}>
                      <Ionicons name="lock-closed" size={12} color="rgba(255,255,255,0.6)" />
                    </Text>
                  )}
                </>
              ) : (
                <Text style={styles.goalBarPlaceholder}>+ Fijar</Text>
              )}
              {!isPastMonth && <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" style={{ marginLeft: 6 }} />}
            </View>
          </TouchableOpacity>

          <View style={styles.hijosTitleRow}>
            <Text style={styles.hijosTitle}>
              Hijos — {MONTHS[selMonthNum - 1]} {selYear}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('CrearMenor')} style={styles.addButton}>
              <Ionicons name="add-circle" size={24} color="#E88900" />
            </TouchableOpacity>
          </View>

          {childrenWithMonthData.map(child => {
            const isExpanded = expandedChild === child.id;
            return (
              <View key={child.id} style={styles.childCard}>
                <TouchableOpacity onPress={() => toggleExpand(child.id)} activeOpacity={0.7} style={styles.childHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{child.alias?.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.childInfo}>
                    <Text style={styles.childName}>{child.alias}</Text>
                    <Text style={styles.childAge}>{child.age} años</Text>
                  </View>
                  <TouchableOpacity style={styles.inviteBtn} onPress={() => {
                    const msg = encodeURIComponent(`¡Hola! Te invito a usar WinTasks. Ingresá con:\nUsuario: ${child.alias}\nContraseña: (la que creamos)\nhttps://wintasks.app`);
                    Linking.openURL(`whatsapp://send?text=${msg}`).catch(() => {
                      Share.share({ message: `¡Hola! Te invito a usar WinTasks. Ingresá con:\nUsuario: ${child.alias}\nContraseña: (la que creamos)\nhttps://wintasks.app` });
                    });
                  }}>
                    <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                  </TouchableOpacity>
                  <View style={styles.childStats}>
                    <View style={styles.stat}>
                      <Text style={[styles.statValue, { color: '#dc2626' }]}>{child.expired.length}</Text>
                      <Text style={styles.statLabel}>venc.</Text>
                    </View>
                    <View style={styles.stat}>
                      <Text style={[styles.statValue, { color: '#E88900' }]}>{child.pending.length}</Text>
                      <Text style={styles.statLabel}>pend.</Text>
                    </View>
                    <View style={styles.stat}>
                      <Text style={[styles.statValue, { color: '#22c55e' }]}>{child.approved.length}</Text>
                      <Text style={styles.statLabel}>score</Text>
                    </View>
                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color="#999" style={{ marginLeft: 8 }} />
                  </View>
                </TouchableOpacity>

                {currentGoal !== null && !isPastMonth && (
                  <View style={styles.goalProgressRow}>
                    <Text style={styles.goalProgressLabel}>
                      Progreso: {child.approved.length}/{currentGoal}
                    </Text>
                    <View style={styles.goalProgressBarBg}>
                      <View style={[styles.goalProgressBarFill, {
                        width: `${Math.min((child.approved.length / currentGoal) * 100, 100)}%`,
                        backgroundColor: child.approved.length >= currentGoal ? '#22c55e' : '#E88900',
                      }]} />
                    </View>
                  </View>
                )}

                {isExpanded && (
                  <>
                    {child.pending.length > 0 && (
                      <>
                        <Text style={styles.sectionLabel}>Pendientes</Text>
                        {child.pending.map(task => (
                          <View key={task.id} style={styles.taskRow}>
                            <View style={styles.taskInfo}>
                              <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                              <Text style={[styles.taskDate, new Date(task.expiresAt) < new Date() ? styles.taskExpired : null]}>
                                {formatDate(task.createdAt)} → {formatDate(task.expiresAt)}{new Date(task.expiresAt) < new Date() ? ' ⚠️' : ''}
                              </Text>
                            </View>
                            <Text style={styles.taskReward}>+{task.tokenReward}</Text>
                          </View>
                        ))}
                      </>
                    )}

                    {child.expired.length > 0 && (
                      <>
                        <Text style={styles.sectionLabel}>Vencidas</Text>
                        {child.expired.map(task => (
                          <View key={task.id} style={[styles.taskRow, styles.taskRowExpired]}>
                            <View style={styles.taskInfo}>
                              <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                              <Text style={styles.taskDate}>✗ {formatDate(task.createdAt)}</Text>
                            </View>
                            <Text style={[styles.taskReward, { color: '#dc2626' }]}>-{task.tokenReward}</Text>
                          </View>
                        ))}
                      </>
                    )}

                    {child.approved.length > 0 && (
                      <>
                        <Text style={styles.sectionLabel}>Aprobadas</Text>
                        {child.approved.map(task => (
                          <View key={task.id} style={[styles.taskRow, styles.taskRowCompleted]}>
                            <View style={styles.taskInfo}>
                              <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                              <Text style={styles.taskDate}>✅ {formatDate(task.approvedAt || task.completedAt)}</Text>
                            </View>
                            <Text style={styles.taskReward}>+{task.tokenReward}</Text>
                          </View>
                        ))}
                      </>
                    )}

                    {child.completed.filter(t => t.status === 'completed').length > 0 && (
                      <>
                        <Text style={styles.sectionLabel}>En revisión</Text>
                        {child.completed.filter(t => t.status === 'completed').map(task => (
                          <View key={task.id} style={[styles.taskRow, styles.taskRowPending]}>
                            <View style={styles.taskInfo}>
                              <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                              <Text style={styles.taskDate}>⏳ {formatDate(task.completedAt)}</Text>
                            </View>
                            <Text style={[styles.taskReward, { color: '#ca8a04' }]}>+{task.tokenReward}</Text>
                          </View>
                        ))}
                      </>
                    )}

                    {child.monthTasks.length === 0 && (
                      <Text style={styles.emptyMonth}>Sin tareas este mes.</Text>
                    )}
                  </>
                )}
              </View>
            );
          })}
        </>
      )}

      <Modal visible={showGoalPicker} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowGoalPicker(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalContent} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Meta del Mes</Text>
              <Text style={styles.modalSubtitle}>{MONTHS[selMonthNum - 1]} {selYear}</Text>
            </View>
            <Text style={styles.pickerLabel}>¿Cuántas tareas quiere que completen?</Text>
            <FlatList
              data={PICKER_NUMBERS}
              keyExtractor={i => String(i)}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pickerList}
              renderItem={({ item }) => {
                const selected = currentGoal === item;
                return (
                  <TouchableOpacity
                    style={[styles.pickerItem, selected && styles.pickerItemSelected]}
                    onPress={() => handleGoalSelect(item)}
                  >
                    <Text style={[styles.pickerItemText, selected && styles.pickerItemTextSelected]}>{item}</Text>
                  </TouchableOpacity>
                );
              }}
            />
            {currentGoal !== null && (
              <TouchableOpacity style={styles.pickerRemove} onPress={() => handleGoalSelect(null)}>
                <Text style={styles.pickerRemoveText}>Quitar meta</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF', padding: 12 },
  emptyCard: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: '#999', fontSize: 15, marginTop: 12 },
  emptyButton: { backgroundColor: '#E88900', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, marginTop: 20 },
  emptyButtonText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 12 },
  yearText: { fontSize: 20, fontWeight: '800', color: '#1e293b', minWidth: 60, textAlign: 'center' },

  monthCard: {
    backgroundColor: '#f8f9fa', borderRadius: 14, padding: 10,
    alignItems: 'center', paddingTop: 12, paddingBottom: 10,
  },
  monthCardCurrent: { backgroundColor: '#E88900', borderWidth: 1, borderColor: '#C06000' },
  monthCardSelected: { borderWidth: 2, borderColor: '#E88900' },
  monthName: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  winnerLabel: { fontSize: 11, fontWeight: '700', color: '#E88900', marginBottom: 6, textAlign: 'center' },
  winnerLive: { fontSize: 10, fontWeight: '600', color: '#22c55e', marginBottom: 6, textAlign: 'center' },
  noData: { fontSize: 11, color: '#bbb', marginTop: 8 },
  scoreRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    width: '100%', paddingHorizontal: 4, paddingVertical: 3,
    borderRadius: 6,
  },
  scoreRowWinner: { backgroundColor: 'rgba(232,137,0,0.1)' },
  scoreRowWinnerCurrent: { backgroundColor: 'rgba(255,255,255,0.2)' },
  textWhite: { color: '#FFF' },
  scoreName: { fontSize: 11, fontWeight: '600', color: '#1e293b', flex: 1 },
  scoreNum: { fontSize: 14, fontWeight: '800', color: '#E88900', marginLeft: 4 },

  goalBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#E88900', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14,
    marginTop: 12, marginBottom: 6, elevation: 2, shadowColor: '#E88900', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4,
  },
  goalBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  goalBarLabel: { fontSize: 14, fontWeight: '700', color: '#FEFCF8' },
  goalBarRight: { flexDirection: 'row', alignItems: 'center' },
  goalBarValue: { fontSize: 14, fontWeight: '800', color: '#FEFCF8' },
  goalBarLocked: { marginLeft: 6 },
  goalBarPlaceholder: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },

  hijosTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 0 },
  hijosTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  addButton: { padding: 4 },

  childCard: {
    backgroundColor: '#f8f9fa', borderRadius: 14, padding: 12, marginBottom: 10,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,
  },
  childHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#E88900',
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  avatarText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  childInfo: { flex: 1 },
  childName: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  childAge: { fontSize: 11, color: '#888', marginTop: 1 },
  childStats: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inviteBtn: { padding: 6, marginRight: 4 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  statLabel: { fontSize: 10, color: '#888', marginTop: 1 },

  goalProgressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingLeft: 46, gap: 8 },
  goalProgressLabel: { fontSize: 11, fontWeight: '600', color: '#888', minWidth: 60 },
  goalProgressBarBg: { flex: 1, height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden' },
  goalProgressBarFill: { height: '100%', borderRadius: 4 },

  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#1e293b', marginBottom: 6, marginTop: 8 },
  taskRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: 8, padding: 10, marginBottom: 4,
    borderLeftWidth: 3, borderLeftColor: '#E88900',
  },
  taskRowCompleted: { borderLeftColor: '#22c55e' },
  taskRowExpired: { borderLeftColor: '#dc2626' },
  taskRowPending: { borderLeftColor: '#ca8a04' },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  taskDate: { fontSize: 11, color: '#888', marginTop: 2 },
  taskExpired: { color: '#dc2626' },
  taskReward: { fontSize: 14, fontWeight: '700', color: '#E88900' },
  emptyMonth: { textAlign: 'center', color: '#bbb', fontSize: 13, paddingVertical: 12 },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingVertical: 24, paddingHorizontal: 16, paddingBottom: 40,
  },
  modalHeader: { alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  modalSubtitle: { fontSize: 14, color: '#888', marginTop: 4 },
  pickerLabel: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 12, textAlign: 'center' },
  pickerList: { gap: 8, paddingHorizontal: 8, justifyContent: 'center' },
  pickerItem: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
  },
  pickerItemSelected: { backgroundColor: '#E88900' },
  pickerItemText: { fontSize: 18, fontWeight: '700', color: '#333' },
  pickerItemTextSelected: { color: '#FFF' },
  pickerRemove: { alignItems: 'center', marginTop: 16, paddingVertical: 8 },
  pickerRemoveText: { fontSize: 14, color: '#dc2626', fontWeight: '600' },
});
