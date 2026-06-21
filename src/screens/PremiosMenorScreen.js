import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme';
import { useGlobal } from '../context/GlobalContext';

export default function PremiosMenorScreen({ navigation }) {
  const { currentUser, getPrizesForChild, getUserTokens, redeemPrize } = useGlobal();
  const prizes = getPrizesForChild(currentUser?.id);
  const myTokens = getUserTokens(currentUser?.id);
  const [selectedPrize, setSelectedPrize] = useState(null);

  const handleRedeem = () => {
    if (!selectedPrize) return;
    const result = redeemPrize(currentUser.id, selectedPrize.id);
    if (result.success) {
      Alert.alert('¡Canjeado!', `Canjeaste "${selectedPrize.title}" por ${selectedPrize.tokenCost} tokens.`, [
        { text: 'OK', onPress: () => setSelectedPrize(null) },
      ]);
    } else {
      Alert.alert('Error', result.error, [{ text: 'OK' }]);
    }
  };

  const renderItem = ({ item }) => {
    const canAfford = myTokens >= item.tokenCost;
    return (
      <TouchableOpacity
        style={styles.prizeCard}
        onPress={() => setSelectedPrize(item)}
        activeOpacity={0.7}
      >
        <View style={styles.prizeInfo}>
          <Text style={styles.prizeTitle}>{item.title}</Text>
          {item.description ? <Text style={styles.prizeDesc} numberOfLines={2}>{item.description}</Text> : null}
        </View>
        <View style={[styles.costBadge, !canAfford && styles.costBadgeDisabled]}>
          <Ionicons name="diamond" size={13} color={canAfford ? '#FFF' : '#ccc'} />
          <Text style={[styles.costText, !canAfford && { color: '#ccc' }]}>{item.tokenCost}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Premios disponibles</Text>
        <View style={styles.tokensBadge}>
          <Ionicons name="diamond" size={14} color={Colors.primary} />
          <Text style={styles.tokensText}>{myTokens} tokens</Text>
        </View>
      </View>

      {prizes.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="gift-outline" size={48} color="#ddd" />
          <Text style={styles.emptyText}>Tu tutor no ha creado premios todavía</Text>
        </View>
      ) : (
        <FlatList
          data={prizes}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={!!selectedPrize} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            {selectedPrize && (
              <>
                <Text style={styles.modalTitle}>{selectedPrize.title}</Text>
                {selectedPrize.description ? <Text style={styles.modalDesc}>{selectedPrize.description}</Text> : null}
                <View style={styles.modalCost}>
                  <Ionicons name="diamond" size={18} color={Colors.primary} />
                  <Text style={styles.modalCostText}>{selectedPrize.tokenCost} tokens</Text>
                </View>
                <Text style={styles.modalBalance}>Tu saldo: {myTokens} tokens</Text>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectedPrize(null)}>
                    <Text style={styles.cancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.redeemBtn, myTokens < selectedPrize.tokenCost && styles.redeemBtnDisabled]}
                    onPress={handleRedeem}
                    disabled={myTokens < selectedPrize.tokenCost}
                  >
                    <Text style={styles.redeemText}>
                      {myTokens >= selectedPrize.tokenCost ? 'Canjear' : 'Sin saldo'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F6F4' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  tokensBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  tokensText: { fontSize: 13, fontWeight: '700', color: Colors.primary },

  list: { padding: 20, paddingTop: 8 },
  prizeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  prizeInfo: { flex: 1 },
  prizeTitle: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  prizeDesc: { fontSize: 13, color: '#a8a29e', marginTop: 2 },

  costBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16 },
  costBadgeDisabled: { backgroundColor: '#f0ebe4' },
  costText: { fontSize: 13, fontWeight: '700', color: '#FFF' },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { color: '#ccc', fontSize: 15, fontStyle: 'italic' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 30 },
  modal: { backgroundColor: '#FFF', borderRadius: 16, padding: 24, width: '100%', maxWidth: 340 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', textAlign: 'center' },
  modalDesc: { fontSize: 14, color: '#a8a29e', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  modalCost: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 16 },
  modalCostText: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  modalBalance: { textAlign: 'center', color: '#a8a29e', fontSize: 13, marginTop: 4 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#888' },
  redeemBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center' },
  redeemBtnDisabled: { backgroundColor: '#ddd' },
  redeemText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
});
