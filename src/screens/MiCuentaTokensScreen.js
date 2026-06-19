import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useGlobal } from '../context/GlobalContext';

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
  transfer: 'Transferencia',
  redeem: 'Canje de puntos',
  expired_refund: 'Devolución tarea vencida',
  generic: 'Otros',
};

export default function MiCuentaTokensScreen({ navigation }) {
  const { currentUser, getUserTokens, getPendingTaskTokens, getPendingTasksWithDetails, expireOverdueTasks, tokenBatches } = useGlobal();
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

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#E88900', '#C06000']} style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Tu saldo de tokens</Text>
        <Text style={styles.balanceAmount}>{myTokens}</Text>
        {pendingTokens > 0 && (
          <Text style={styles.balanceSub}>Bloqueados en tareas: {pendingTokens}</Text>
        )}
      </LinearGradient>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tokens en tareas pendientes</Text>
        {pendingTasks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-circle-outline" size={40} color="#ccc" />
            <Text style={styles.emptyText}>No tenés tareas pendientes</Text>
          </View>
        ) : (
          pendingTasks.map(task => (
            <View key={task.id} style={styles.taskCard}>
              <View style={styles.taskHeader}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <Text style={styles.taskBadge}>{getTimeRemaining(task.expiresAt)}</Text>
              </View>
              <View style={styles.taskRow}>
                <Ionicons name="person-outline" size={14} color="#888" />
                <Text style={styles.taskDetail}>{task.childName}</Text>
              </View>
              <View style={styles.taskRow}>
                <Ionicons name="logo-usd" size={14} color="#E88900" />
                <Text style={styles.taskDetail}>{task.tokenReward} tokens</Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Movimientos de tokens</Text>
        {myBatches.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="swap-horizontal-outline" size={40} color="#ccc" />
            <Text style={styles.emptyText}>Sin movimientos</Text>
          </View>
        ) : (
          myBatches.map(b => (
            <View key={b.id} style={styles.movementCard}>
              <View style={styles.movementLeft}>
                <Text style={styles.movementSource}>{SOURCE_LABELS[b.source] || b.source}</Text>
                <Text style={styles.movementDate}>{formatDate(b.acquiredAt)}</Text>
                <Text style={styles.movementExpiry}>Vence: {formatDate(b.expiresAt)}</Text>
              </View>
              <View style={styles.movementRight}>
                <Text style={styles.movementAmount}>+{b.amount}</Text>
                {b.remaining < b.amount && (
                  <Text style={styles.movementUsed}>{b.remaining}/{b.amount} restantes</Text>
                )}
              </View>
            </View>
          ))
        )}
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
  section: { padding: 20, paddingBottom: 0 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 14 },
  emptyCard: { alignItems: 'center', paddingVertical: 30, backgroundColor: '#f8f9fa', borderRadius: 12 },
  emptyText: { color: '#999', marginTop: 8, fontSize: 14 },
  taskCard: {
    backgroundColor: '#f8f9fa', borderRadius: 12, padding: 14, marginBottom: 10,
    borderLeftWidth: 4, borderLeftColor: '#E88900',
  },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  taskTitle: { fontSize: 15, fontWeight: '600', color: '#1e293b', flex: 1 },
  taskBadge: { fontSize: 12, fontWeight: '600', color: '#E88900', backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  taskDetail: { fontSize: 13, color: '#555' },
  movementCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#f8f9fa', borderRadius: 12, padding: 14, marginBottom: 8,
  },
  movementLeft: { flex: 1 },
  movementSource: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  movementDate: { fontSize: 12, color: '#888', marginTop: 2 },
  movementExpiry: { fontSize: 12, color: '#E88900', marginTop: 1 },
  movementRight: { alignItems: 'flex-end' },
  movementAmount: { fontSize: 17, fontWeight: '700', color: '#22c55e' },
  movementUsed: { fontSize: 11, color: '#999', marginTop: 2 },
});
