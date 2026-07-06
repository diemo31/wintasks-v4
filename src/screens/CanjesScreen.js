import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme';
import { useGlobal } from '../context/GlobalContext';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function monthKey(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function monthLabel(key) {
  const [y, m] = key.split('-');
  return `${MONTHS[parseInt(m) - 1]} ${y}`;
}

export default function CanjesScreen({ navigation }) {
  const { currentUser, getRedemptionsForAdult, getRedemptionsForChild, deliverRedemption, users } = useGlobal();
  const isAdult = currentUser?.role === 'adulto';
  const list = isAdult ? getRedemptionsForAdult(currentUser?.id) : getRedemptionsForChild(currentUser?.id);
  const [expanded, setExpanded] = useState(null);

  const grouped = useMemo(() => {
    const groups = {};
    list.forEach(r => {
      const mk = monthKey(r.redeemedAt);
      if (!groups[mk]) groups[mk] = [];
      groups[mk].push(r);
    });
    return Object.keys(groups).sort().reverse().map(mk => ({ month: mk, items: groups[mk] }));
  }, [list]);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const handleDeliver = async (redemption) => {
    Alert.alert(
      'Entregar premio',
      `¿Marcar "${redemption.title}" como entregado?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Entregar', style: 'destructive', onPress: async () => {
          const result = await deliverRedemption(redemption.id);
          if (result.success) {
            const parts = [];
            if (result.recovered > 0) parts.push(`Recuperaste ${result.recovered} tokens.`);
            if (result.expiredLost > 0) parts.push(`${result.expiredLost} tokens estaban vencidos y se perdieron.`);
            if (result.transferLost > 0) parts.push(`${result.transferLost} tokens eran de transferencias y se perdieron.`);
            Alert.alert('Entregado', parts.join(' '));
          } else {
            Alert.alert('Error', result.error || 'No se pudo marcar como entregado');
          }
        }},
      ]
    );
  };

  const getChildName = (childId) => {
    const u = users.find(uu => uu.id === childId);
    return u?.alias || 'Desconocido';
  };

  const toggleMonth = (mk) => setExpanded(p => p === mk ? null : mk);

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#E88900', '#C06000']} style={styles.header}>
        <Text style={styles.headerTitle}>Canjes{isAdult ? ' pendientes' : ''}</Text>
        <Text style={styles.headerSub}>{isAdult ? 'Pendientes de entrega' : 'Historial de canjes'}</Text>
      </LinearGradient>

      {grouped.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="gift-outline" size={40} color="#ccc" />
          <Text style={styles.emptyText}>Sin canjes todavía</Text>
        </View>
      ) : grouped.map(group => {
        const isCurrent = group.month === currentMonth;
        const pending = group.items.filter(r => r.status === 'pending').length;
        const isOpen = expanded === group.month || (expanded === null && isCurrent);

        return (
          <View key={group.month}>
            <TouchableOpacity style={styles.monthHeader} onPress={() => toggleMonth(group.month)}>
              <View style={styles.monthLeft}>
                <Text style={[styles.monthLabel, isCurrent && styles.monthCurrent]}>{monthLabel(group.month)}</Text>
                {pending > 0 && (
                  <View style={styles.pendingBadge}><Text style={styles.pendingText}>{pending}</Text></View>
                )}
              </View>
              <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#999" />
            </TouchableOpacity>

            {isOpen && group.items.map(r => {
              const isDelivered = r.status === 'delivered';
              return (
                <View key={r.id} style={[styles.card, isDelivered && styles.cardDelivered]}>
                  <View style={styles.cardLeft}>
                    <Text style={[styles.cardTitle, isDelivered && styles.textMuted]}>{r.title}</Text>
                    <Text style={styles.cardMeta}>
                      {isAdult && <Text style={styles.cardChild}>{getChildName(r.childId)} · </Text>}
                      {r.type === 'prize' ? 'Premio' : 'Sorpresa'} · {r.tokenCost} tokens · {formatDate(r.redeemedAt)}
                    </Text>
                    {isDelivered && r.deliveredAt && (
                      <Text style={styles.deliveredText}>Entregado {formatDate(r.deliveredAt)}</Text>
                    )}
                  </View>
                  <View style={styles.cardRight}>
                    {!isDelivered && isAdult ? (
                      <TouchableOpacity style={styles.deliverBtn} onPress={() => handleDeliver(r)}>
                        <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                        <Text style={styles.deliverBtnText}>Entregar</Text>
                      </TouchableOpacity>
                    ) : (
                      <Ionicons name="checkmark-done" size={22} color={isDelivered ? '#22c55e' : '#ccc'} />
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { padding: 24, paddingTop: 20, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  emptyCard: { alignItems: 'center', paddingVertical: 50 },
  emptyText: { color: '#999', marginTop: 8, fontSize: 14 },
  monthHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 20, backgroundColor: '#f8f6f4',
    borderBottomWidth: 1, borderBottomColor: '#ede8e2',
  },
  monthLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  monthLabel: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  monthCurrent: { color: Colors.primary },
  pendingBadge: { backgroundColor: '#E88900', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1 },
  pendingText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  card: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#f0ebe5',
  },
  cardDelivered: { opacity: 0.6 },
  cardLeft: { flex: 1, marginRight: 12 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  textMuted: { color: '#999' },
  cardMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  cardChild: { fontWeight: '600', color: Colors.primary },
  deliveredText: { fontSize: 11, color: '#22c55e', fontWeight: '500', marginTop: 2 },
  cardRight: { alignItems: 'center' },
  deliverBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#22c55e', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8,
  },
  deliverBtnText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
});
