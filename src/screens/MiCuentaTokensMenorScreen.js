import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useGlobal } from '../context/GlobalContext';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

const SOURCE_LABELS = {
  signup: 'Registro',
  task_reward: 'Recompensa tarea',
  transfer: 'Transferencia',
  redeem: 'Canje de puntos',
  expired_refund: 'Devolución tarea vencida',
  generic: 'Otros',
};

export default function MiCuentaTokensMenorScreen({ navigation }) {
  const { currentUser, getUserTokens, tasks, tokenBatches } = useGlobal();
  const myTokens = getUserTokens(currentUser?.id);
  const [expandedSection, setExpandedSection] = useState(null);

  const toggle = (key) => setExpandedSection(p => p === key ? null : key);

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const myTasks = tasks.filter(t => t.childId === currentUser?.id);
  const monthTasks = myTasks.filter(t => t.createdAt.startsWith(thisMonth));
  const nuevas = monthTasks.filter(t => t.status === 'pending');
  const enCurso = monthTasks.filter(t => t.status === 'in_progress');

  const monthApproved = useMemo(() =>
    monthTasks.filter(t => t.status === 'approved'),
  [monthTasks]);

  const myBatches = tokenBatches
    .filter(b => b.userId === currentUser?.id && b.acquiredAt.startsWith(thisMonth))
    .sort((a, b) => new Date(b.acquiredAt) - new Date(a.acquiredAt));

  const monthTokens = myBatches.reduce((s, b) => s + b.amount, 0);
  const pendingTokenSum = [...nuevas, ...enCurso].reduce((sum, t) => sum + (t.tokenReward || 0), 0);

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#E88900', '#C06000']} style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Tu saldo de tokens</Text>
        <Text style={styles.balanceAmount}>{myTokens}</Text>
        {pendingTokenSum > 0 && (
          <Text style={styles.balanceSub}>Tokens por ganar: {pendingTokenSum}</Text>
        )}
      </LinearGradient>

      <View style={styles.monthSection}>
        <Text style={styles.monthLabel}>{MONTHS[now.getMonth()]} {now.getFullYear()}</Text>
        <View style={styles.monthStatsRow}>
          <View style={styles.monthStat}>
            <Text style={styles.monthStatValue}>{monthApproved.length}</Text>
            <Text style={styles.monthStatLabel}>Aprobadas</Text>
          </View>
          <View style={styles.monthStatSep} />
          <View style={styles.monthStat}>
            <Text style={styles.monthStatValue}>{monthTokens}</Text>
            <Text style={styles.monthStatLabel}>Tokens ganados</Text>
          </View>
          <View style={styles.monthStatSep} />
          <View style={styles.monthStat}>
            <Text style={styles.monthStatValue}>{pendingTokenSum}</Text>
            <Text style={styles.monthStatLabel}>Por ganar</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tokens por ganar</Text>

        <TouchableOpacity style={styles.catHeader} onPress={() => toggle('nuevas')} activeOpacity={0.7}>
          <View style={styles.catLeft}>
            <Ionicons name="sparkles" size={16} color="#D4721A" />
            <Text style={styles.catLabel}>Tareas nuevas</Text>
            <Text style={styles.catCount}>{nuevas.length}</Text>
          </View>
          <View style={styles.catRight}>
            <Text style={styles.catTokens}>{nuevas.reduce((s, t) => s + t.tokenReward, 0)}</Text>
            <Ionicons name={expandedSection === 'nuevas' ? 'chevron-up' : 'chevron-down'} size={16} color="#999" />
          </View>
        </TouchableOpacity>
        {expandedSection === 'nuevas' && nuevas.map(t => {
          const firstExpiry = t._tokenSource?.length > 0
            ? t._tokenSource.reduce((min, d) => new Date(d.expiresAt) < new Date(min) ? d.expiresAt : min, t._tokenSource[0].expiresAt)
            : null;
          return (
          <View key={t.id} style={styles.taskCard}>
            <View style={styles.taskHeader}>
              <Text style={styles.taskTitle}>{t.title}</Text>
              <Text style={styles.taskTokens}>+{t.tokenReward}</Text>
            </View>
            {t.description ? <Text style={styles.taskDesc} numberOfLines={1}>{t.description}</Text> : null}
            {firstExpiry && <Text style={styles.taskExpiry}>Vencen: {formatDate(firstExpiry)}</Text>}
          </View>
          );
        })}

        <TouchableOpacity style={styles.catHeader} onPress={() => toggle('enCurso')} activeOpacity={0.7}>
          <View style={styles.catLeft}>
            <Ionicons name="play-circle" size={16} color="#2563eb" />
            <Text style={styles.catLabel}>Tareas en curso</Text>
            <Text style={styles.catCount}>{enCurso.length}</Text>
          </View>
          <View style={styles.catRight}>
            <Text style={styles.catTokens}>{enCurso.reduce((s, t) => s + t.tokenReward, 0)}</Text>
            <Ionicons name={expandedSection === 'enCurso' ? 'chevron-up' : 'chevron-down'} size={16} color="#999" />
          </View>
        </TouchableOpacity>
        {expandedSection === 'enCurso' && enCurso.map(t => {
          const firstExpiry = t._tokenSource?.length > 0
            ? t._tokenSource.reduce((min, d) => new Date(d.expiresAt) < new Date(min) ? d.expiresAt : min, t._tokenSource[0].expiresAt)
            : null;
          return (
          <View key={t.id} style={styles.taskCard}>
            <View style={styles.taskHeader}>
              <Text style={styles.taskTitle}>{t.title}</Text>
              <Text style={styles.taskTokens}>+{t.tokenReward}</Text>
            </View>
            {t.description ? <Text style={styles.taskDesc} numberOfLines={1}>{t.description}</Text> : null}
            {firstExpiry && <Text style={styles.taskExpiry}>Vencen: {formatDate(firstExpiry)}</Text>}
          </View>
          );
        })}
      </View>

      <TouchableOpacity style={styles.transferBtn} onPress={() => navigation.navigate('Transferir')}>
        <Ionicons name="swap-horizontal" size={18} color="#FFF" />
        <Text style={styles.transferBtnText}>Transferir tokens</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Movimiento de tokens — {MONTHS[now.getMonth()]}</Text>
        {myBatches.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="swap-horizontal-outline" size={40} color="#ccc" />
            <Text style={styles.emptyText}>Sin movimientos</Text>
          </View>
        ) : (
          myBatches.map(b => (
            <View key={b.id} style={styles.movementCard}>
              <View style={styles.movementLeft}>
                <Text style={styles.movementSource}>
                  {b.fromChildTransfer ? 'Transferencia recibida' : (SOURCE_LABELS[b.source] || b.source)}
                </Text>
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
  monthSection: { paddingVertical: 10, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#f0ebe5' },
  monthLabel: { fontSize: 13, fontWeight: '700', color: '#999', marginBottom: 10 },
  monthStatsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  monthStat: { alignItems: 'center', flex: 1 },
  monthStatSep: { width: 1, height: 28, backgroundColor: '#e8e0d6' },
  monthStatValue: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  monthStatLabel: { fontSize: 11, fontWeight: '600', color: '#888', marginTop: 2 },
  emptyCard: { alignItems: 'center', paddingVertical: 30, backgroundColor: '#f8f9fa', borderRadius: 12 },
  emptyText: { color: '#999', marginTop: 8, fontSize: 14 },

  catHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f8f9fa', borderRadius: 12, padding: 14, marginBottom: 6,
  },
  catLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catLabel: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  catCount: { fontSize: 13, fontWeight: '700', color: '#999' },
  catRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catTokens: { fontSize: 14, fontWeight: '700', color: '#E88900' },

  taskCard: {
    backgroundColor: '#FFF', borderRadius: 10, padding: 12, marginBottom: 6, marginLeft: 4,
    borderLeftWidth: 3, borderLeftColor: '#E88900', shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b', flex: 1 },
  taskTokens: { fontSize: 14, fontWeight: '700', color: '#22c55e' },
  taskDesc: { fontSize: 12, color: '#888', marginTop: 2 },
  taskExpiry: { fontSize: 11, color: '#C0693A', marginTop: 4, fontWeight: '500' },

  transferBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E88900', marginHorizontal: 20, marginTop: 10, paddingVertical: 12, borderRadius: 10, gap: 6 },
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
