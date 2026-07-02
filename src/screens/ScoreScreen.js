import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useGlobal } from '../context/GlobalContext';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const CHILD_COLORS = ['#E05A47', '#4A90D9', '#34A853', '#FBBC04', '#9C27B0', '#FF6F00', '#00ACC1', '#E91E63'];
const GAP = 8;

function monthKey(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

const STATUS_MAP = {
  approved: { label: 'Aprobada', bg: '#dcfce7', fg: '#16a34a', icon: 'checkmark-circle' },
  completed: { label: 'Completada', bg: '#fef9c3', fg: '#ca8a04', icon: 'time' },
  expired: { label: 'Vencida', bg: '#fee2e2', fg: '#dc2626', icon: 'close-circle' },
  pending: { label: 'Pendiente', bg: '#f1f5f9', fg: '#64748b', icon: 'ellipse' },
  rejected: { label: 'Rechazada', bg: '#fce7f3', fg: '#db2777', icon: 'close' },
  in_progress: { label: 'En curso', bg: '#dbeafe', fg: '#2563eb', icon: 'play' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] || { label: status, bg: '#f1f5f9', fg: '#64748b' };
  return (
    <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.statusText, { color: cfg.fg }]}>{cfg.label}</Text>
    </View>
  );
}

export default function ScoreScreen({ navigation }) {
  const { currentUser, getChildren, tasks, getScoreGoal } = useGlobal();
  const siblings = useMemo(() => getChildren(currentUser?.tutorId), [getChildren, currentUser?.tutorId]);
  const isOnlyChild = siblings.length <= 1;
  const scrollRef = useRef(null);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [cardW, setCardW] = useState(100);
  const [selectedMonth, setSelectedMonth] = useState(monthKey(now));
  const [expandedScoreCats, setExpandedScoreCats] = useState({});
  const toggleScoreCat = (key) => setExpandedScoreCats(p => ({ ...p, [key]: !p[key] }));

  const onScrollerLayout = useCallback((e) => {
    const w = e.nativeEvent.layout.width;
    setCardW(Math.floor((w - 2 * GAP) / 3));
  }, []);

  const snapInterval = cardW + GAP;

  const siblingColorMap = useMemo(() => {
    const map = {};
    siblings.forEach((s, i) => { map[s.id] = CHILD_COLORS[i % CHILD_COLORS.length]; });
    return map;
  }, [siblings]);

  const months = useMemo(() => {
    const childIds = siblings.map(s => s.id);
    const approved = tasks.filter(t => childIds.includes(t.childId) && t.status === 'approved');

    const byChildAndMonth = {};
    for (const t of approved) {
      const mk = monthKey(t.approvedAt || t.completedAt || t.createdAt);
      if (!byChildAndMonth[t.childId]) byChildAndMonth[t.childId] = {};
      byChildAndMonth[t.childId][mk] = (byChildAndMonth[t.childId][mk] || 0) + 1;
    }

    return Array.from({ length: 12 }, (_, i) => {
      const mNum = i + 1;
      const mStr = String(mNum).padStart(2, '0');
      const mk = `${year}-${mStr}`;

      const entries = siblings.map(s => {
        const score = byChildAndMonth[s.id]?.[mk] || 0;
        return { childId: s.id, alias: s.alias, score };
      }).sort((a, b) => b.score - a.score);

      const max = entries[0]?.score || 0;
      const winners = entries.filter(e => e.score === max && e.score > 0);
      const hasData = entries.some(e => e.score > 0);

      const allSiblingTasks = tasks.filter(t => childIds.includes(t.childId));
      const monthTasks = allSiblingTasks.filter(t => {
        const tm = monthKey(t.createdAt);
        return tm === mk;
      });

      return { monthKey: mk, month: mStr, mNum, entries, max, winners, hasData, monthTasks };
    });
  }, [siblings, tasks, year]);

  const goPrevYear = () => setYear(y => y - 1);
  const goNextYear = () => setYear(y => Math.min(y + 1, now.getFullYear()));

  const handleSelectMonth = (mk) => {
    setSelectedMonth(mk);
  };

  useEffect(() => {
    const currentMonth = now.getMonth();
    const centerOffset = Math.max(0, Math.min((currentMonth - 1) * snapInterval, 9 * snapInterval));
    setTimeout(() => scrollRef.current?.scrollTo({ x: centerOffset, animated: false }), 100);
  }, [cardW]);

  const [selYear, selMonthNum] = selectedMonth.split('-').map(Number);
  const selectedData = months.find(m => m.monthKey === selectedMonth);

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F0EB' }}>
      <LinearGradient colors={['#E88900', '#C06000']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FEFCF8" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Score</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }}>
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
          {months.map(({ monthKey, month, mNum, entries, winners, hasData }) => {
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
                {isOnlyChild ? (
                  <>
                    <Text style={[styles.onlyScore, isCurrent && styles.textWhite]}>{entries.find(e => e.childId === currentUser?.id)?.score || 0}</Text>
                    {(() => {
                      const goal = getScoreGoal(`${year}-${month}`);
                      if (goal === null) return null;
                      const score = entries.find(e => e.childId === currentUser?.id)?.score || 0;
                      const reached = score >= goal;
                      return (
                        <Text style={[styles.goalMini, isCurrent && styles.textWhite, reached && !isCurrent && styles.goalMiniReached]}>
                          Meta: {goal}{reached ? ' ✅' : ''}
                        </Text>
                      );
                    })()}
                  </>
                ) : hasData ? (
                  <>
                    <Text style={[styles.winnerLabel, isCurrent && styles.textWhite]}>
                      🏆 {winners.length === 1 ? winners[0].alias : winners.map(w => w.alias).join(' & ')}
                    </Text>
                    {entries.map((e, i) => (
                      <View key={e.childId} style={[styles.scoreRow, i === 0 && e.score > 0 && siblings.length > 1 ? (isCurrent ? styles.scoreRowWinnerCurrent : styles.scoreRowWinner) : null]}>
                        <View style={[styles.scoreDot, { backgroundColor: siblingColorMap[e.childId] }]} />
                        <Text style={[styles.scoreName, isCurrent && styles.textWhite]} numberOfLines={1}>{e.alias}</Text>
                        <Text style={[styles.scoreNum, isCurrent && styles.textWhite]}>{e.score}</Text>
                      </View>
                    ))}
                  </>
                ) : (
                  <Text style={[styles.noData, isCurrent && styles.textWhite]}>—</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {selectedData && (() => {
          const goal = getScoreGoal(selectedMonth);
          const childrenToShow = isOnlyChild
            ? selectedData.entries.filter(e => e.childId === currentUser?.id)
            : selectedData.entries;
          return (
            <View style={styles.progressSection}>
              <View style={styles.progressDivider} />
              {childrenToShow.map(e => (
                <View key={e.childId} style={styles.progressBlock}>
                  <View style={styles.progressHeader}>
                    <View style={[styles.progressDot, { backgroundColor: siblingColorMap[e.childId] }]} />
                    <Text style={styles.progressName}>
                      {e.alias}{e.childId === currentUser?.id && isOnlyChild ? '' : e.childId === currentUser?.id ? ' (vos)' : ''}
                    </Text>
                    <Text style={styles.progressCount}>
                      {goal !== null ? `${e.score}/${goal}` : e.score}
                    </Text>
                  </View>
                  {goal !== null && (
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, {
                        width: `${Math.min((e.score / goal) * 100, 100)}%`,
                        backgroundColor: e.score >= goal ? '#22c55e' : '#E88900',
                      }]} />
                    </View>
                  )}
                </View>
              ))}
              <View style={styles.progressDivider} />
            </View>
          );
        })()}

        {selectedData && (
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>
              {MONTHS[selMonthNum - 1]} {selYear}
              {!isOnlyChild && selectedData.winners.length > 0 && (
                <Text style={styles.detailWinner}>
                  {'  '}🏆 {selectedData.winners.map(w => w.alias).join(' & ')}
                </Text>
              )}
            </Text>
            {(() => {
              const myMonthTasks = selectedData.monthTasks.filter(t => t.childId === currentUser?.id);
              if (myMonthTasks.length === 0) return <Text style={styles.detailEmpty}>Sin tareas este mes.</Text>;
              const cats = [
                { key: 'approved', label: 'Aprobadas', icon: 'checkmark-circle', color: '#5B9E4A' },
                { key: 'completed', label: 'Completadas', icon: 'time', color: '#3A7BD5' },
                { key: 'pending', label: 'Pendientes', icon: 'ellipse', color: '#D4721A' },
                { key: 'in_progress', label: 'En curso', icon: 'play', color: '#2563eb' },
                { key: 'expired', label: 'Vencidas', icon: 'alert-circle', color: '#C0693A' },
                { key: 'rejected', label: 'Rechazadas', icon: 'close-circle', color: '#db2777' },
              ];
              return cats.map(cat => {
                const catTasks = myMonthTasks.filter(t => t.status === cat.key);
                if (catTasks.length === 0) return null;
                const catKey = `${selectedMonth}-${cat.key}`;
                const open = expandedScoreCats[catKey];
                return (
                  <View key={cat.key} style={styles.scoreCatBlock}>
                    <TouchableOpacity style={styles.scoreCatHeader} onPress={() => toggleScoreCat(catKey)} activeOpacity={0.7}>
                      <View style={styles.scoreCatLeft}>
                        <Ionicons name={cat.icon} size={14} color={cat.color} />
                        <Text style={[styles.scoreCatLabel, { color: cat.color }]}>{cat.label}</Text>
                        <Text style={styles.scoreCatCount}>{catTasks.length}</Text>
                      </View>
                      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color="#999" />
                    </TouchableOpacity>
                    {open && <View style={styles.scoreCatCards}>{catTasks.map(task => (
                      <View key={task.id} style={styles.taskRow}>
                        <View style={styles.taskInfo}>
                          <Text style={styles.taskTitle}>{task.title}</Text>
                          <Text style={styles.taskDate}>{task.completedAt ? formatDate(task.completedAt) : formatDate(task.createdAt)}</Text>
                        </View>
                        <StatusBadge status={task.status} />
                      </View>
                    ))}</View>}
                  </View>
                );
              });
            })()}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FEFCF8' },
  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 12 },
  yearText: { fontSize: 20, fontWeight: '800', color: '#1e293b', minWidth: 60, textAlign: 'center' },

  monthCard: {
    backgroundColor: '#f8f9fa', borderRadius: 14, padding: 10,
    alignItems: 'center', paddingTop: 12, paddingBottom: 10,
  },
  monthCardCurrent: { backgroundColor: '#E88900', borderWidth: 1, borderColor: '#C06000' },
  monthCardSelected: { borderWidth: 2, borderColor: '#E88900' },
  monthName: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  textWhite: { color: '#FFF' },
  onlyScore: { fontSize: 28, fontWeight: '800', color: '#E88900', marginTop: 4 },
  goalMini: { fontSize: 10, fontWeight: '600', color: '#888', marginTop: 2 },
  goalMiniReached: { color: '#22c55e' },
  winnerLabel: { fontSize: 11, fontWeight: '700', color: '#E88900', marginBottom: 6, textAlign: 'center' },
  noData: { fontSize: 11, color: '#bbb', marginTop: 8 },
  scoreRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    width: '100%', paddingHorizontal: 4, paddingVertical: 3,
    borderRadius: 6,
  },
  scoreRowWinner: { backgroundColor: 'rgba(232,137,0,0.1)' },
  scoreRowWinnerCurrent: { backgroundColor: 'rgba(255,255,255,0.2)' },
  scoreDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  scoreName: { fontSize: 11, fontWeight: '600', color: '#1e293b', flex: 1 },
  scoreNum: { fontSize: 14, fontWeight: '800', color: '#E88900', marginLeft: 4 },

  detailCard: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginTop: 6, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  detailTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 10 },
  detailWinner: { fontSize: 14, fontWeight: '700', color: '#E88900' },
  detailEmpty: { textAlign: 'center', color: '#bbb', fontSize: 14, paddingVertical: 20 },

  progressSection: { paddingHorizontal: 4, marginTop: 8 },
  progressDivider: { height: 1, backgroundColor: '#ddd', marginVertical: 4 },
  progressBlock: { marginBottom: 6 },
  progressHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  progressDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  progressName: { flex: 1, fontSize: 13, fontWeight: '700', color: '#333' },
  progressCount: { fontSize: 13, fontWeight: '700', color: '#888' },
  progressBarBg: { height: 10, backgroundColor: '#f0e6d8', borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 5 },

  taskRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#f8f9fa', borderRadius: 8, padding: 8, marginBottom: 4,
  },
  taskInfo: { flex: 1, marginRight: 8 },
  taskTitle: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  taskDate: { fontSize: 11, color: '#888', marginTop: 1 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  scoreCatBlock: { marginBottom: 6 },
  scoreCatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  scoreCatLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scoreCatLabel: { fontSize: 14, fontWeight: '700' },
  scoreCatCount: { fontSize: 13, fontWeight: '700', color: '#999', marginLeft: 4 },
  scoreCatCards: { marginTop: 6, paddingLeft: 4 },
});
