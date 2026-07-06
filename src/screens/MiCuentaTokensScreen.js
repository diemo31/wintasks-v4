import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useGlobal } from '../context/GlobalContext';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function getTimeRemaining(expiresAt) {
  const now = new Date();
  const exp = new Date(expiresAt);
  const diff = exp - now;
  if (diff <= 0) return 'Vencida';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

const SOURCE_LABELS = {
  signup: 'Registro',
  purchase_p1: 'Pack 1000',
  purchase_p2: 'Pack 2000',
  purchase_p3: 'Pack 3000',
  task_reward: 'Recompensa tarea',
  transfer: 'Transferencia recibida',
  canje: 'Recuperado de canje',
  prize_fulfilled: 'Recuperado por entrega de premio',
  surprise_fulfilled: 'Recuperado por entrega de sorpresa',
  redeem: 'Canje de puntos',
  expired_refund: 'Devolución tarea vencida',
  generic: 'Otros',
};

export default function MiCuentaTokensScreen({ navigation }) {
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const { currentUser, getUserTokens, getPendingTaskTokens, getPendingTasksWithDetails, expireOverdueTasks, tokenBatches, tasks } = useGlobal();
  const [pendingTasks, setPendingTasks] = useState([]);
  const pendingTokens = getPendingTaskTokens(currentUser?.id);
  const myTokens = getUserTokens(currentUser?.id);

  useEffect(() => {
    expireOverdueTasks();
    setPendingTasks(getPendingTasksWithDetails(currentUser?.id));
  }, []);

  const myBatches = tokenBatches
    .filter(b => b.userId === currentUser?.id)
    .sort((a, b) => new Date(b.acquiredAt) - new Date(a.acquiredAt));

  const monthBatches = myBatches.filter(b => b.acquiredAt.startsWith(thisMonth));

  const monthTasks = useMemo(() =>
    tasks.filter(t => t.createdBy === currentUser?.id && t.createdAt.startsWith(thisMonth)),
  [tasks, currentUser, thisMonth]);

  const aprobadas = monthTasks.filter(t => t.status === 'approved');
  const aprobadasTokens = aprobadas.reduce((s, t) => s + t.tokenReward, 0);

  const recuperadasTokens = monthBatches
    .filter(b => b.source === 'expired_refund' || b.source === 'canje')
    .reduce((s, b) => s + b.amount, 0);

  const asignadasTokens = monthTasks.reduce((s, t) => s + t.tokenReward, 0);

  const vencidasTokens = tokenBatches
    .filter(b => b.userId === currentUser?.id && b.expiresAt.startsWith(thisMonth))
    .reduce((s, b) => s + b.remaining, 0);

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#E88900', '#C06000']} style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Disponible</Text>
        <Text style={styles.balanceAmount}>{myTokens}</Text>
        {pendingTokens > 0 && (
          <Text style={styles.balanceSub}>En tareas pendientes: {pendingTokens}</Text>
        )}
      </LinearGradient>

      <View style={styles.monthSection}>
        <Text style={styles.monthLabel}>{MONTHS[now.getMonth()]} {now.getFullYear()}</Text>
        <View style={styles.monthStatsRow}>
          <View style={styles.monthStat}>
            <Text style={styles.monthStatValue}>{aprobadasTokens}</Text>
            <Text style={styles.monthStatLabel}>Aprobadas</Text>
          </View>
          <View style={styles.monthStatSep} />
          <View style={styles.monthStat}>
            <Text style={styles.monthStatValue}>{recuperadasTokens}</Text>
            <Text style={styles.monthStatLabel}>Recuperadas</Text>
          </View>
          <View style={styles.monthStatSep} />
          <View style={styles.monthStat}>
            <Text style={styles.monthStatValue}>{asignadasTokens}</Text>
            <Text style={styles.monthStatLabel}>Asignadas</Text>
          </View>
          <View style={styles.monthStatSep} />
          <View style={styles.monthStat}>
            <Text style={styles.monthStatValue}>{vencidasTokens}</Text>
            <Text style={styles.monthStatLabel}>Vencidas</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tokens en tareas pendientes</Text>
        {pendingTasks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-circle-outline" size={40} color="#ccc" />
            <Text style={styles.emptyText}>No tenés tareas pendientes</Text>
          </View>
        ) : (
          pendingTasks.map(task => {
            const earliestExpiry = task._tokenSource?.length > 0
              ? task._tokenSource.reduce((min, d) => new Date(d.expiresAt) < new Date(min) ? d.expiresAt : min, task._tokenSource[0].expiresAt)
              : null;
            return (
            <View key={task.id} style={styles.taskCard}>
              <View style={styles.taskHead}>
                <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                <Text style={styles.taskBadge}>{getTimeRemaining(task.expiresAt)}</Text>
              </View>
              <View style={styles.taskMeta}>
                <Text style={styles.taskDetail}>{task.childName}</Text>
                <Text style={styles.taskMetaDot}>·</Text>
                <Text style={styles.taskTokenAmt}>+{task.tokenReward}</Text>
                {earliestExpiry && (
                  <>
                    <Text style={styles.taskMetaDot}>·</Text>
                    <Text style={styles.taskExpiry}>Vence {formatDate(earliestExpiry)}</Text>
                  </>
                )}
              </View>
            </View>
            );
          }))
        }
      </View>

      <TouchableOpacity style={styles.transferBtn} onPress={() => navigation.navigate('Transferir')}>
        <Ionicons name="swap-horizontal" size={18} color="#FFF" />
        <Text style={styles.transferBtnText}>Transferir tokens</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Movimientos de tokens — {MONTHS[now.getMonth()]}</Text>
        {monthBatches.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="swap-horizontal-outline" size={40} color="#ccc" />
            <Text style={styles.emptyText}>Sin movimientos este mes</Text>
          </View>
        ) : (
          monthBatches.map(b => {
            const sourceLabel = b.fromChildTransfer ? 'Transferencia de hijo' : (SOURCE_LABELS[b.source] || b.source);
            return (
            <View key={b.id} style={styles.movementCard}>
              <View style={styles.movementLeft}>
                <Text style={styles.movementSource}>{sourceLabel}</Text>
                <View style={styles.movementMetaRow}>
                  <Text style={styles.movementDate}>{formatDate(b.acquiredAt)}</Text>
                  <Text style={styles.movementMetaDot}>·</Text>
                  <Text style={styles.movementExpiry}>Vence: {formatDate(b.expiresAt)}</Text>
                </View>
              </View>
              <View style={styles.movementRight}>
                <Text style={styles.movementAmount}>+{b.amount}</Text>
                {b.remaining < b.amount && (
                  <Text style={styles.movementUsed}>{b.remaining}/{b.amount} restantes</Text>
                )}
              </View>
            </View>
            );
          }))
        }
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  balanceCard: { padding: 24, alignItems: 'center' },
  balanceLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  balanceAmount: { fontSize: 48, fontWeight: 'bold', color: '#FFF', marginVertical: 4 },
  balanceSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  monthSection: { paddingVertical: 10, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#f0ebe5' },
  monthLabel: { fontSize: 13, fontWeight: '700', color: '#999', marginBottom: 10 },
  monthStatsRow: { flexDirection: 'row', alignItems: 'center' },
  monthStat: { alignItems: 'center', flex: 1 },
  monthStatSep: { width: 1, height: 28, backgroundColor: '#e8e0d6' },
  monthStatValue: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  monthStatLabel: { fontSize: 10, fontWeight: '600', color: '#888', marginTop: 2 },
  section: { padding: 20, paddingBottom: 0 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 14 },
  emptyCard: { alignItems: 'center', paddingVertical: 30, backgroundColor: '#f8f9fa', borderRadius: 12 },
  emptyText: { color: '#999', marginTop: 8, fontSize: 14 },
  taskCard: {
    backgroundColor: '#f8f9fa', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, marginBottom: 5,
    borderLeftWidth: 3, borderLeftColor: '#E88900',
  },
  taskHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskTitle: { fontSize: 13, fontWeight: '600', color: '#1e293b', flex: 1, marginRight: 6 },
  taskBadge: { fontSize: 10, fontWeight: '600', color: '#E88900', backgroundColor: '#FFF3E0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  taskDetail: { fontSize: 11, color: '#777' },
  taskMetaDot: { fontSize: 10, color: '#ccc' },
  taskTokenAmt: { fontSize: 11, fontWeight: '700', color: '#E88900' },
  taskExpiry: { fontSize: 10, color: '#C0693A', fontWeight: '500' },
  transferBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E88900', marginHorizontal: 20, paddingVertical: 12, borderRadius: 10, gap: 6 },
  transferBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  movementCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#f8f9fa', borderRadius: 10, padding: 10, marginBottom: 6,
  },
  movementLeft: { flex: 1 },
  movementSource: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  movementMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  movementDate: { fontSize: 12, color: '#888' },
  movementMetaDot: { fontSize: 12, color: '#ccc' },
  movementExpiry: { fontSize: 12, color: '#E88900' },
  movementRight: { alignItems: 'flex-end' },
  movementAmount: { fontSize: 17, fontWeight: '700', color: '#22c55e' },
  movementUsed: { fontSize: 11, color: '#999', marginTop: 2 },
});
