import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
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
  const { currentUser, getChildren, getTasksForChild } = useGlobal();
  const children = getChildren(currentUser.id);
  const scrollRef = useRef(null);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [cardW, setCardW] = useState(100);
  const currentMonthStr = monthKey(now);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

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

  const months = Array.from({ length: 12 }, (_, i) => {
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
  });

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
  };

  const [selYear, selMonthNum] = selectedMonth.split('-').map(Number);

  const childrenWithMonthData = children.map(child => {
    const all = childTasks[child.id];
    const monthTasks = all.filter(t => {
      const created = monthKey(t.createdAt);
      const completed = t.completedAt ? monthKey(t.completedAt) : null;
      return created === selectedMonth || completed === selectedMonth;
    });
    const pending = monthTasks.filter(t => t.status === 'pending');
    const expired = monthTasks.filter(t => t.status === 'expired');
    return { ...child, monthTasks, pending, expired };
  });

  return (
    <ScrollView style={styles.container}>
      {children.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="people-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No tenés hijos vinculados</Text>
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
                  <Text style={[styles.monthYear, isCurrent && styles.textWhite]}>{year}</Text>
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

          <Text style={styles.hijosTitle}>
            Hijos — {MONTHS[selMonthNum - 1]} {selYear}
          </Text>
          {childrenWithMonthData.map(child => {
            const { monthTasks, pending, expired } = child;
            const completed = monthTasks.filter(t => t.status === 'approved' || t.status === 'completed');

            return (
              <View key={child.id} style={styles.childCard}>
                <View style={styles.childHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{child.alias?.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.childInfo}>
                    <Text style={styles.childName}>{child.alias}</Text>
                    <Text style={styles.childAge}>{child.age} años</Text>
                  </View>
                  <View style={styles.childStats}>
                    <View style={styles.stat}>
                      <Text style={[styles.statValue, { color: '#dc2626' }]}>{expired.length}</Text>
                      <Text style={styles.statLabel}>venc.</Text>
                    </View>
                    <View style={styles.stat}>
                      <Text style={[styles.statValue, { color: '#E88900' }]}>{pending.length}</Text>
                      <Text style={styles.statLabel}>pend.</Text>
                    </View>
                    <View style={styles.stat}>
                      <Text style={[styles.statValue, { color: '#22c55e' }]}>{completed.length}</Text>
                      <Text style={styles.statLabel}>realiz.</Text>
                    </View>
                    <View style={styles.stat}>
                      <Text style={styles.statValue}>{monthTasks.length}</Text>
                      <Text style={styles.statLabel}>total</Text>
                    </View>
                  </View>
                </View>

                {pending.length > 0 && (
                  <>
                    <Text style={styles.sectionLabel}>Pendientes</Text>
                    {pending.map(task => (
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

                {completed.length > 0 && (
                  <>
                    <Text style={styles.sectionLabel}>Completadas</Text>
                    {completed.map(task => (
                      <View key={task.id} style={[styles.taskRow, styles.taskRowCompleted]}>
                        <View style={styles.taskInfo}>
                          <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                          <Text style={styles.taskDate}>✅ {formatDate(task.completedAt)}</Text>
                        </View>
                        <Text style={styles.taskReward}>+{task.tokenReward}</Text>
                      </View>
                    ))}
                  </>
                )}
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF', padding: 12 },
  emptyCard: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: '#999', fontSize: 15, marginTop: 12 },

  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 12 },
  yearText: { fontSize: 20, fontWeight: '800', color: '#1e293b', minWidth: 60, textAlign: 'center' },

  monthCard: {
    backgroundColor: '#f8f9fa', borderRadius: 14, padding: 10,
    alignItems: 'center', paddingTop: 12, paddingBottom: 10,
  },
  monthCardCurrent: { backgroundColor: '#E88900', borderWidth: 1, borderColor: '#C06000' },
  monthCardSelected: { borderWidth: 2, borderColor: '#E88900' },
  monthName: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  monthYear: { fontSize: 10, color: '#888', marginBottom: 6 },
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

  hijosTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginBottom: 10, marginTop: 4 },

  childCard: {
    backgroundColor: '#f8f9fa', borderRadius: 14, padding: 12, marginBottom: 10,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,
  },
  childHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#E88900',
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  avatarText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  childInfo: { flex: 1 },
  childName: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  childAge: { fontSize: 11, color: '#888', marginTop: 1 },
  childStats: { flexDirection: 'row', gap: 12 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  statLabel: { fontSize: 10, color: '#888', marginTop: 1 },

  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#1e293b', marginBottom: 6 },
  taskRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: 8, padding: 10, marginBottom: 4,
    borderLeftWidth: 3, borderLeftColor: '#E88900',
  },
  taskRowCompleted: { borderLeftColor: '#22c55e' },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  taskDate: { fontSize: 11, color: '#888', marginTop: 2 },
  taskExpired: { color: '#dc2626' },
  taskReward: { fontSize: 14, fontWeight: '700', color: '#E88900' },
});
