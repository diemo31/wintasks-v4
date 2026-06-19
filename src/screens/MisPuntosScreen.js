import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme';
import { useGlobal } from '../context/GlobalContext';

const TYPE_META = {
  earn_task: { icon: 'checkmark-circle', color: '#16a34a', label: 'Tarea aprobada' },
  earn_sorpresa: { icon: 'sparkles', color: '#16a34a', label: 'Sorpresa consumida' },
  earn_membership: { icon: 'card', color: '#16a34a', label: 'Membresía pagada' },
  earn_invite: { icon: 'gift', color: '#16a34a', label: 'Invitación' },
  redeem_membership: { icon: 'card-outline', color: '#dc2626', label: 'Canje membresía' },
  redeem_tokens: { icon: 'logo-usd', color: '#dc2626', label: 'Canje tokens' },
};

export default function MisPuntosScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { currentUser, getUserLoyaltyPoints, getLoyaltyHistory, redeemPointsForMembership, redeemTokensTiered, LOYALTY_RATES, REDEEM_MEMBERSHIP_POINTS, TOKEN_REDEEM_OPTIONS } = useGlobal();
  const [tab, setTab] = useState('historial');

  const puntos = getUserLoyaltyPoints(currentUser?.id);
  const history = getLoyaltyHistory(currentUser?.id);

  useEffect(() => {
    if (!route.params?.fromDrawer) return;
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (e.data.action.type === 'GO_BACK' || e.data.action.type === 'POP') {
        e.preventDefault();
        navigation.navigate('DashboardAdulto', { openDrawer: true });
      }
    });
    return unsub;
  }, [navigation, route.params?.fromDrawer]);

  const handleRedeemMembership = () => {
    if (puntos < REDEEM_MEMBERSHIP_POINTS) {
      Alert.alert('Puntos insuficientes', `Necesitás ${REDEEM_MEMBERSHIP_POINTS} puntos WinTasks. Tenés ${puntos}.`);
      return;
    }
    Alert.alert(
      'Canjear 1 mes de membresía',
      `Vas a usar ${REDEEM_MEMBERSHIP_POINTS} puntos WinTasks para obtener 1 mes de membresía.\n\n¿Estás seguro?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Canjear', onPress: () => {
          const result = redeemPointsForMembership(currentUser.id);
          if (result.success) {
            Alert.alert('¡Canje exitoso!', 'Tu membresía de 1 mes fue activada.');
          } else {
            Alert.alert('Error', result.error);
          }
        }},
      ]
    );
  };

  const { icon: ti, color: tc } = TYPE_META.earn_task;

  return (
    <LinearGradient colors={['#FFFFFF', '#FFD699', '#C06000']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scroll, Platform.OS === 'ios' && { paddingTop: 16 + insets.top }]} showsVerticalScrollIndicator={false}>

        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mis puntos WinTasks</Text>
          <View style={{ width: 32 }} />
        </View>

        <LinearGradient colors={['#E05A47', '#C06000']} style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Tus puntos WinTasks</Text>
          <Text style={styles.balanceValue}>{puntos}</Text>
        </LinearGradient>

        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tab, tab === 'historial' && styles.tabActive]} onPress={() => setTab('historial')}>
            <Text style={[styles.tabText, tab === 'historial' && styles.tabTextActive]}>Historial</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, tab === 'canjear' && styles.tabActive]} onPress={() => setTab('canjear')}>
            <Text style={[styles.tabText, tab === 'canjear' && styles.tabTextActive]}>Canjear</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, tab === 'ganar' && styles.tabActive]} onPress={() => setTab('ganar')}>
            <Text style={[styles.tabText, tab === 'ganar' && styles.tabTextActive]}>Ganar</Text>
          </TouchableOpacity>
        </View>

        {tab === 'historial' && (
          <View style={styles.card}>
            {history.length === 0 ? (
              <Text style={styles.emptyText}>Todavía no tenés movimientos de puntos WinTasks.</Text>
            ) : history.map(h => {
              const meta = TYPE_META[h.type] || { icon: 'ellipse', color: '#64748b', label: h.type };
              return (
                <View key={h.id} style={styles.historyRow}>
                  <View style={[styles.historyIcon, { backgroundColor: meta.color + '20' }]}>
                    <Ionicons name={meta.icon} size={16} color={meta.color} />
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyLabel}>{meta.label}</Text>
                    <Text style={styles.historyDesc}>{h.description}</Text>
                    <Text style={styles.historyDate}>{new Date(h.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                  <Text style={[styles.historyAmount, { color: h.amount > 0 ? '#16a34a' : '#dc2626' }]}>
                    {h.amount > 0 ? '+' : ''}{h.amount}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {tab === 'canjear' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Canjeá tus puntos</Text>
            <Text style={styles.redeemHint}>Elegí lo que querés canjear</Text>

            <View style={styles.redeemOffersRow}>
              <TouchableOpacity
                style={[styles.redeemOffer, puntos < REDEEM_MEMBERSHIP_POINTS && styles.redeemOfferDisabled]}
                onPress={() => {
                  if (puntos < REDEEM_MEMBERSHIP_POINTS) {
                    Alert.alert('Puntos insuficientes', `Todavía no tenés los puntos suficientes.`, [
                      { text: 'Entendido', style: 'cancel' },
                      { text: 'Comprar', onPress: () => navigation.navigate('Membresia') },
                    ]);
                    return;
                  }
                  Alert.alert('Canje', '1 mes de membresía por 2.500 puntos', [
                    { text: 'Entendido', style: 'cancel' },
                    { text: 'Canjear', onPress: handleRedeemMembership },
                  ]);
                }}
              >
                <LinearGradient colors={['#E88900', '#C06000']} style={styles.redeemOfferIcon}>
                  <Ionicons name="card" size={24} color="#FFF" />
                </LinearGradient>
                <Text style={styles.redeemOfferTitle}>Membresía</Text>
                <Text style={styles.redeemOfferValue}>1 mes</Text>
                <View style={styles.redeemOfferCostRow}>
                  <Text style={[styles.redeemOfferCost, puntos < REDEEM_MEMBERSHIP_POINTS && styles.redeemOfferCostMissing]}>
                    {puntos >= REDEEM_MEMBERSHIP_POINTS ? '2.500 pts' : `Faltan ${REDEEM_MEMBERSHIP_POINTS - puntos}`}
                  </Text>
                </View>
              </TouchableOpacity>

              {TOKEN_REDEEM_OPTIONS.map((opt, i) => {
                const enough = puntos >= opt.points;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.redeemOffer, !enough && styles.redeemOfferDisabled]}
                    onPress={() => {
                      if (!enough) {
                        Alert.alert('Puntos insuficientes', `Todavía no tenés los puntos suficientes.`, [
                          { text: 'Entendido', style: 'cancel' },
                          { text: 'Comprar', onPress: () => navigation.navigate('Tokens') },
                        ]);
                        return;
                      }
                      Alert.alert('Canje', `${opt.tokens.toLocaleString()} tokens por ${opt.points.toLocaleString()} puntos`, [
                        { text: 'Entendido', style: 'cancel' },
                        { text: 'Canjear', onPress: () => {
                          const result = redeemTokensTiered(currentUser.id, i);
                          if (result.success) Alert.alert('¡Listo!', `Recibiste ${result.tokens} tokens.`);
                          else Alert.alert('Error', result.error);
                        }},
                      ]);
                    }}
                  >
                    <LinearGradient colors={['#E88900', '#C06000']} style={styles.redeemOfferIcon}>
                      <Ionicons name="logo-usd" size={24} color="#FFF" />
                    </LinearGradient>
                    <Text style={styles.redeemOfferTitle}>Tokens</Text>
                    <Text style={styles.redeemOfferValue}>{opt.tokens.toLocaleString()}</Text>
                    <View style={styles.redeemOfferCostRow}>
                      <Text style={[styles.redeemOfferCost, !enough && styles.redeemOfferCostMissing]}>
                        {enough ? `${opt.points.toLocaleString()} pts` : `Faltan ${opt.points - puntos}`}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {tab === 'ganar' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cómo ganar puntos WinTasks</Text>
            <View style={styles.rateRow}>
              <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
              <View style={styles.rateInfo}>
                <Text style={styles.rateLabel}>Aprobar tarea completada</Text>
                <Text style={styles.rateDesc}>Cuando aprobás una tarea que tu hijo completó</Text>
              </View>
              <Text style={styles.ratePts}>+{LOYALTY_RATES.taskApprove}</Text>
            </View>
            <View style={styles.rateRow}>
              <Ionicons name="sparkles" size={20} color="#16a34a" />
              <View style={styles.rateInfo}>
                <Text style={styles.rateLabel}>Sorpresa consumida</Text>
                <Text style={styles.rateDesc}>Cuando tu hijo consume una sorpresa que creaste</Text>
              </View>
              <Text style={styles.ratePts}>+{LOYALTY_RATES.sorpresa}</Text>
            </View>
            <View style={styles.rateRow}>
              <Ionicons name="gift" size={20} color="#16a34a" />
              <View style={styles.rateInfo}>
                <Text style={styles.rateLabel}>Invitación</Text>
                <Text style={styles.rateDesc}>Cuando un amigo se registra con tu código</Text>
              </View>
              <Text style={styles.ratePts}>+{LOYALTY_RATES.invite}</Text>
            </View>
            <View style={styles.rateRow}>
              <Ionicons name="card" size={20} color="#16a34a" />
              <View style={styles.rateInfo}>
                <Text style={styles.rateLabel}>Membresía pagada</Text>
                <Text style={styles.rateDesc}>1 mes: +{LOYALTY_RATES.membership1m} | 3 meses: +{LOYALTY_RATES.membership3m} | 6 meses: +{LOYALTY_RATES.membership6m}</Text>
              </View>
            </View>
          </View>
        )}

      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingTop: 16, paddingBottom: 40 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 16,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: Colors.text, textAlign: 'center' },

  balanceCard: {
    borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 20,
    elevation: 6, shadowColor: '#C06000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginBottom: 4 },
  balanceValue: { fontSize: 42, fontWeight: '900', color: '#FFFFFF' },

  tabRow: {
    flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 12,
    padding: 4, marginBottom: 16, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#FFFFFF' },

  card: {
    backgroundColor: Colors.white, borderRadius: 20, padding: 20,
    elevation: 4, shadowColor: '#1e293b', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 10,
  },
  cardTitle: {
    fontSize: 15, fontWeight: '800', color: '#1e293b', marginBottom: 12,
  },
  redeemHint: { fontSize: 13, color: '#64748b', marginBottom: 16 },
  emptyText: { fontSize: 13, color: '#94a3b8', textAlign: 'center', paddingVertical: 20 },

  redeemOffersRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  redeemOffer: {
    width: '48%', backgroundColor: '#f8f9fa', borderRadius: 14, padding: 14,
    alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 4,
  },
  redeemOfferDisabled: { opacity: 0.55 },
  redeemOfferIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  redeemOfferTitle: { fontSize: 12, fontWeight: '600', color: '#888' },
  redeemOfferValue: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginVertical: 2 },
  redeemOfferCostRow: { marginTop: 4 },
  redeemOfferCost: { fontSize: 12, fontWeight: '700', color: '#E88900' },
  redeemOfferCostMissing: { color: '#dc2626' },

  historyRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  historyIcon: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  historyInfo: { flex: 1 },
  historyLabel: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  historyDesc: { fontSize: 11, color: '#64748b', marginTop: 1 },
  historyDate: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  historyAmount: { fontSize: 16, fontWeight: '800', marginLeft: 8 },

  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 16 },

  rateRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12,
  },
  rateInfo: { flex: 1 },
  rateLabel: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  rateDesc: { fontSize: 11, color: '#64748b', marginTop: 1 },
  ratePts: { fontSize: 16, fontWeight: '800', color: '#16a34a' },
});
