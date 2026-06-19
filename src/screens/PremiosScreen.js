import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme';
import { useGlobal } from '../context/GlobalContext';

export default function PremiosScreen({ navigation }) {
  const { currentUser, getAdultPrizes, deletePrize } = useGlobal();
  const prizes = getAdultPrizes(currentUser?.id);

  const handleDelete = (prize) => {
    Alert.alert('Eliminar premio', `¿Eliminar "${prize.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deletePrize(prize.id) },
    ]);
  };

  const renderItem = ({ item, index }) => {
    const isRecent = index < 5 && item.usedCount > 0;
    return (
      <View style={styles.prizeCard}>
        <View style={styles.prizeInfo}>
          <Text style={styles.prizeTitle}>{item.title}</Text>
          {item.description ? <Text style={styles.prizeDesc} numberOfLines={2}>{item.description}</Text> : null}
          <View style={styles.prizeMeta}>
            <View style={styles.tokenBadge}>
              <Ionicons name="diamond" size={12} color={Colors.primary} />
              <Text style={styles.tokenText}>{item.tokenCost} tokens</Text>
            </View>
            {item.usedCount > 0 ? (
              <Text style={styles.usedText}>Usado {item.usedCount} vez{item.usedCount !== 1 ? 'es' : ''}</Text>
            ) : (
              <Text style={styles.unusedText}>Sin usar</Text>
            )}
          </View>
        </View>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
          <Ionicons name="trash-outline" size={20} color={Colors.error} />
        </TouchableOpacity>
      </View>
    );
  };

  const recentPrizes = prizes.filter(p => p.usedCount > 0).slice(0, 5);
  const otherPrizes = prizes.filter(p => p.usedCount === 0);

  const sections = [];
  if (recentPrizes.length > 0) sections.push({ title: 'Recientes', data: recentPrizes });
  if (otherPrizes.length > 0) sections.push({ title: 'Todos los premios', data: otherPrizes });

  const flatData = sections.flatMap(s => [{ sectionHeader: true, title: s.title }, ...s.data]);

  if (prizes.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyWrap}>
          <Ionicons name="gift-outline" size={64} color={Colors.textLight} />
          <Text style={styles.emptyTitle}>Sin premios todavía</Text>
          <Text style={styles.emptyDesc}>Creá premios para que tus hijos puedan canjearlos.</Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('CreatePrize')}>
            <Ionicons name="add" size={20} color={Colors.white} />
            <Text style={styles.createBtnText}>Crear premio</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={flatData}
        keyExtractor={(item, i) => item.sectionHeader ? `s-${item.title}` : item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          if (item.sectionHeader) {
            return <Text style={styles.sectionTitle}>{item.title}</Text>;
          }
          return renderItem({ item });
        }}
        ListHeaderComponent={
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('CreatePrize')}>
              <Ionicons name="add" size={20} color={Colors.white} />
              <Text style={styles.createBtnText}>Nuevo premio</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  listContent: { padding: 16, paddingBottom: 32 },
  headerActions: { marginBottom: 12 },
  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: Colors.text, marginTop: 16, marginBottom: 8,
    paddingHorizontal: 4,
  },
  prizeCard: {
    flexDirection: 'row', backgroundColor: Colors.background, borderRadius: 12, padding: 14,
    marginBottom: 8, alignItems: 'center', borderWidth: 1, borderColor: Colors.surface,
  },
  prizeInfo: { flex: 1, marginRight: 12 },
  prizeTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  prizeDesc: { fontSize: 13, color: Colors.textLight, marginTop: 3 },
  prizeMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 12 },
  tokenBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, gap: 4,
  },
  tokenText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  usedText: { fontSize: 11, color: Colors.success },
  unusedText: { fontSize: 11, color: Colors.textLight },
  deleteBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.text, marginTop: 16, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: Colors.textLight, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  createBtn: {
    flexDirection: 'row', backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 6, alignSelf: 'flex-start',
  },
  createBtnText: { color: Colors.white, fontSize: 15, fontWeight: '600' },
});
