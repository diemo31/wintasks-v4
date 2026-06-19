import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useGlobal } from '../context/GlobalContext';

const TOKEN_PACKS = [
  { id: 'p1', tokens: 1000, price: 1.00, label: 'Pack 1000', desc: '1.000 tokens' },
  { id: 'p2', tokens: 2000, price: 1.50, label: 'Pack 2000', desc: '2.000 tokens' },
  { id: 'p3', tokens: 3000, price: 2.00, label: 'Pack 3000', desc: '3.000 tokens' },
];

const PACK_LABELS = { purchase_p1: 'Pack 1000', purchase_p2: 'Pack 2000', purchase_p3: 'Pack 3000' };

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function formatExpiry(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = d - now;
  if (diff <= 0) return 'Vencido';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return `Vence en ${days} días (${formatDate(iso)})`;
}

export default function TokensScreen({ navigation }) {
  const { currentUser, getUserTokens, getPurchaseHistory } = useGlobal();
  const myTokens = getUserTokens(currentUser?.id);
  const purchases = getPurchaseHistory(currentUser?.id);

  const handleBuyPack = (pack) => {
    Alert.alert(
      'Comprar tokens',
      ` Pack ${pack.tokens} tokens\n Total: USD ${pack.price.toFixed(2)}`,
      [
        { text: 'Pagar con PayPal', onPress: () => Alert.alert('Próximamente', 'El pago con PayPal estará disponible pronto.') },
        { text: 'Pagar en efectivo', onPress: () => Alert.alert('Próximamente', 'El pago en efectivo estará disponible pronto.') },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#E88900', '#C06000']} style={styles.balanceBar}>
        <Text style={styles.balanceLabel}>Tu saldo</Text>
        <Text style={styles.balanceAmount}>{myTokens}</Text>
      </LinearGradient>

      <View style={styles.offersSection}>
        <Text style={styles.sectionTitle}>Elegí tu pack</Text>
        <View style={styles.offersRow}>
          {TOKEN_PACKS.map(pack => (
            <TouchableOpacity key={pack.id} style={styles.offerCard} onPress={() => handleBuyPack(pack)}>
              <LinearGradient colors={['#E88900', '#C06000']} style={styles.offerIcon}>
                <Ionicons name="logo-usd" size={28} color="#FFF" />
              </LinearGradient>
              <Text style={styles.offerTokens}>{pack.tokens.toLocaleString()}</Text>
              <Text style={styles.offerDesc}>{pack.desc}</Text>
              <Text style={styles.offerPrice}>USD {pack.price.toFixed(2)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>
          Historial de compras {purchases.length > 0 && `(${purchases.length})`}
        </Text>
        {purchases.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="card-outline" size={36} color="#ddd" />
            <Text style={styles.emptyText}>Todavía no compraste ningún pack</Text>
          </View>
        ) : (
          purchases.map(p => (
            <View key={p.id} style={styles.historyCard}>
              <View style={styles.historyLeft}>
                <Text style={styles.historyPack}>{PACK_LABELS[p.source] || p.source}</Text>
                <Text style={styles.historyDate}>Comprado: {formatDate(p.acquiredAt)}</Text>
                <Text style={styles.historyExpiry}>{formatExpiry(p.expiresAt)}</Text>
              </View>
              <Text style={styles.historyTokens}>+{p.amount}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  balanceBar: { paddingVertical: 16, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceLabel: { fontSize: 15, color: 'rgba(255,255,255,0.85)' },
  balanceAmount: { fontSize: 28, fontWeight: 'bold', color: '#FFF' },
  offersSection: { padding: 20, paddingBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 14 },
  offersRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  offerCard: {
    flex: 1, backgroundColor: '#f8f9fa', borderRadius: 14, padding: 14,
    alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  offerIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  offerTokens: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  offerDesc: { fontSize: 12, color: '#888', marginTop: 2 },
  offerPrice: { fontSize: 14, fontWeight: '700', color: '#E88900', marginTop: 6 },
  historySection: { padding: 20, paddingTop: 4, paddingBottom: 30 },
  emptyCard: { alignItems: 'center', paddingVertical: 30, backgroundColor: '#f8f9fa', borderRadius: 12 },
  emptyText: { color: '#999', marginTop: 8, fontSize: 14 },
  historyCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#f8f9fa', borderRadius: 12, padding: 14, marginBottom: 8,
  },
  historyLeft: { flex: 1 },
  historyPack: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  historyDate: { fontSize: 12, color: '#888', marginTop: 3 },
  historyExpiry: { fontSize: 12, color: '#E88900', marginTop: 1 },
  historyTokens: { fontSize: 18, fontWeight: '800', color: '#E88900' },
});
