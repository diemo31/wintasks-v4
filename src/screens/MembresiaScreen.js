import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, Dimensions, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme';
import { useGlobal } from '../context/GlobalContext';

const PLANS = [
  { key: '1mes', label: '1 mes', usd: 1.5, months: 1, badge: null },
  { key: '3meses', label: '3 meses', usd: 3, months: 3, badge: '33% ahorro' },
  { key: '6meses', label: '6 meses', usd: 5, months: 6, badge: '44% ahorro' },
];

const POLL_INTERVAL = 5000;
const POLL_TIMEOUT = 300000;

export default function MembresiaScreen({ navigation, route }) {
  const {
    currentUser, requestMembership, markPaymentSent,
    verifyMembership, getUserMembership,
  } = useGlobal();

  const [mepRate, setMepRate] = useState(null);
  const [loadingRate, setLoadingRate] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [creatingPayPalOrder, setCreatingPayPalOrder] = useState(false);
  const [payPalOrderId, setPayPalOrderId] = useState(null);
  const [waitingPayPal, setWaitingPayPal] = useState(false);
  const [payPalCaptured, setPayPalCaptured] = useState(null);
  const [payPalError, setPayPalError] = useState(null);

  const pollingRef = useRef(null);

  const myMembership = getUserMembership(currentUser?.id);

  const membershipActive = myMembership?.status === 'active';
  const membershipEndDate = myMembership?.endDate
    ? new Date(myMembership.endDate).toLocaleDateString('es-AR')
    : null;

  const fmtARS = (n) => n ? `$${n.toLocaleString('es-AR')}` : '';

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

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchMep = async () => {
      try {
        const res = await fetch('https://api.argentinadatos.com/v1/cotizaciones/dolares');
        const data = await res.json();
        if (!cancelled) {
          const mep = data.find(d => d.casa === 'MEP');
          if (mep?.venta) { setMepRate(mep.venta); setLoadingRate(false); return; }
        }
      } catch {}
      try {
        const res = await fetch('https://dolarapi.com/v1/dolares/bolsa');
        const data = await res.json();
        if (!cancelled && data?.venta) { setMepRate(data.venta); }
      } catch {}
      if (!cancelled) setLoadingRate(false);
    };
    fetchMep();
    return () => { cancelled = true; };
  }, []);

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
  };

  const startPolling = (orderId, plan) => {
    setWaitingPayPal(true);
    const startTime = Date.now();
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch('https://win-tasks.vercel.app/api/paypal/capture-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        });
        const data = await res.json();
        if (res.ok && data.status === 'COMPLETED') {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setPayPalCaptured(data);
          const amountArs = Math.round(plan.usd * (mepRate || 1));
          requestMembership(currentUser.id, plan.key, plan.usd, amountArs, mepRate || 1);
          markPaymentSent(currentUser.id);
          verifyMembership(currentUser.id);
          Alert.alert('Pago exitoso', `Tu membresía ${plan.label} ya está activa.`);
          setPayPalOrderId(null);
          setWaitingPayPal(false);
          setSelectedPlan(null);
        }
      } catch (_) {
        /* order not yet approved, keep polling */
      }
      if (Date.now() - startTime > POLL_TIMEOUT) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        setWaitingPayPal(false);
        setPayPalError('El tiempo de espera se agotó. Podés intentarlo de nuevo.');
      }
    }, POLL_INTERVAL);
  };

  const handlePayPalCreateOrder = async () => {
    if (!selectedPlan || !currentUser) return;
    setPayPalCaptured(null);
    setCreatingPayPalOrder(true);
    setPayPalError(null);
    try {
      const res = await fetch('https://win-tasks.vercel.app/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: selectedPlan.usd, description: `Membresía WinTasks - ${selectedPlan.label}` }),
      });
      const data = await res.json();
      if (!res.ok || !data.approvalUrl) throw new Error(data.error || 'No se pudo crear la orden');
      setPayPalOrderId(data.id);
      Linking.openURL(data.approvalUrl).catch(() => Alert.alert('Error', 'No se pudo abrir PayPal'));
      startPolling(data.id, selectedPlan);
    } catch (e) {
      setPayPalError(e.message);
      Alert.alert('Error', e.message);
    } finally {
      setCreatingPayPalOrder(false);
    }
  };

  const cancelPurchase = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    setPayPalOrderId(null);
    setPayPalError(null);
    setWaitingPayPal(false);
  };

  const newEndDate = (() => {
    if (!selectedPlan) return null;
    const base = membershipActive && myMembership?.endDate
      ? new Date(myMembership.endDate)
      : new Date();
    const months = selectedPlan.key === '1mes' ? 1 : selectedPlan.key === '3meses' ? 3 : 6;
    return new Date(base.getTime() + months * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('es-AR');
  })();

  return (
    <LinearGradient colors={['#FFFFFF', '#FFD699', '#C06000']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Membresía</Text>
          <View style={{ width: 32 }} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Membresía WinTasks</Text>
          <Text style={styles.sectionSubtitle}>
            {membershipActive
              ? myMembership?.paymentRef === 'GRATIS-6M'
                ? 'Disfrutá tu período gratuito de 6 meses.'
                : 'Tu membresía está activa.'
              : 'Elegí un plan y pagá con PayPal.'}
          </Text>

          {mepRate ? (
            <View style={styles.rateRow}>
              <Ionicons name="trending-up" size={16} color="#64748b" />
              <Text style={styles.rateText}>Dólar MEP: ${mepRate.toLocaleString('es-AR')}</Text>
            </View>
          ) : loadingRate ? (
            <View style={styles.rateRow}>
              <ActivityIndicator size="small" color="#64748b" />
              <Text style={styles.rateText}>Cargando cotización...</Text>
            </View>
          ) : null}

          {membershipActive && myMembership?.endDate && (
            <View style={[styles.activeBanner, myMembership?.paymentRef === 'GRATIS-6M' && { backgroundColor: '#fff4e6' }]}>
              <Ionicons name="gift-outline" size={22} color={myMembership?.paymentRef === 'GRATIS-6M' ? '#E88900' : '#16a34a'} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.activeText, myMembership?.paymentRef === 'GRATIS-6M' && { color: '#b85c00' }]}>
                  {myMembership?.paymentRef === 'GRATIS-6M' ? 'Período gratuito' : 'Membresía activa'}
                </Text>
                <Text style={[styles.activeSubtext, myMembership?.paymentRef === 'GRATIS-6M' && { color: '#b85c00' }]}>
                  Vence el {membershipEndDate}
                </Text>
              </View>
            </View>
          )}
        </View>

        <Text style={styles.plansTitle}>Elegí tu plan</Text>
        <View style={styles.plansGrid}>
          {PLANS.map(p => {
            const selected = selectedPlan?.key === p.key;
            return (
              <TouchableOpacity
                key={p.key}
                style={[styles.planCard, selected && styles.planCardSelected]}
                onPress={() => handleSelectPlan(p)}
              >
                {p.badge && <View style={styles.badge}><Text style={styles.badgeText}>{p.badge}</Text></View>}
                <Text style={[styles.planPrice, selected && styles.planPriceSelected]}>${p.usd}</Text>
                <Text style={[styles.planLabel, selected && styles.planLabelSelected]}>{p.label}</Text>
                {mepRate && <Text style={[styles.planArs, selected && styles.planArsSelected]}>{fmtARS(Math.round(p.usd * mepRate))}</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedPlan && !payPalOrderId && !payPalCaptured && !waitingPayPal && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>RESUMEN</Text>
            <View style={styles.packNameRow}>
              <Ionicons name="gift-outline" size={18} color={Colors.primary} />
              <Text style={styles.packNameText}>Pack {selectedPlan.label}</Text>
              {selectedPlan.badge && <View style={styles.badgeSmall}><Text style={styles.badgeSmallText}>{selectedPlan.badge}</Text></View>}
            </View>
            <View style={styles.divider} />
            <Text style={styles.resumenText}>
              Desde: {membershipActive && membershipEndDate ? membershipEndDate : 'hoy'}
            </Text>
            <Text style={styles.resumenText}>
              Hasta: {newEndDate}
            </Text>
            <View style={styles.divider} />
            <Text style={styles.totalPrice}>
              Total: USD {selectedPlan.usd}
            </Text>
            {mepRate ? (
              <Text style={styles.totalArs}>
                {fmtARS(Math.round(selectedPlan.usd * mepRate))} ARS
              </Text>
            ) : loadingRate ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loadingText}>Cargando cotización...</Text>
              </View>
            ) : (
              <Text style={styles.totalArs}>Cotización no disponible</Text>
            )}
            <TouchableOpacity
              style={[styles.paypalBtn, (creatingPayPalOrder || !selectedPlan) && { opacity: 0.5 }]}
              onPress={handlePayPalCreateOrder}
              disabled={creatingPayPalOrder || !selectedPlan}
            >
              {creatingPayPalOrder ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="logo-paypal" size={18} color="white" style={{ marginRight: 6 }} />
                  <Text style={styles.paypalBtnText}>Pagar con PayPal</Text>
                </>
              )}
            </TouchableOpacity>
            {payPalError && (
              <Text style={styles.errorText}>{payPalError}</Text>
            )}
            {!mepRate && !loadingRate && (
              <Text style={styles.errorText}>No se pudo obtener la cotización. Revisá tu conexión.</Text>
            )}
          </View>
        )}

        {waitingPayPal && (
          <View style={[styles.orderCard, { backgroundColor: '#eef2ff', borderColor: '#c7d2fe' }]}>
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <ActivityIndicator size="large" color="#4338ca" />
              <Text style={[styles.orderTitle, { color: '#4338ca', marginTop: 14, textAlign: 'center' }]}>
                Esperando confirmación de PayPal...
              </Text>
              <Text style={{ fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 6, paddingHorizontal: 16 }}>
                Aprobá el pago en la ventana de PayPal y esperá unos segundos.
              </Text>
              <View style={styles.orderField}>
                <Text style={styles.orderLabel}>Plan</Text>
                <Text style={styles.orderValue}>{selectedPlan?.label}</Text>
              </View>
              <View style={styles.orderField}>
                <Text style={styles.orderLabel}>Monto</Text>
                <Text style={styles.orderValue}>USD {selectedPlan?.usd}</Text>
              </View>
              {payPalError && <Text style={styles.errorText}>{payPalError}</Text>}
              <TouchableOpacity style={{ alignItems: 'center', paddingVertical: 8, marginTop: 12 }} onPress={cancelPurchase}>
                <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {payPalCaptured && (
          <View style={[styles.orderCard, { backgroundColor: '#f0fdf4', borderColor: '#86efac' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="checkmark-circle" size={28} color="#16a34a" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.orderTitle, { color: '#166534', marginBottom: 0 }]}>Pago confirmado</Text>
                <Text style={{ fontSize: 12, color: '#166534' }}>Membresía activa — {payPalCaptured.payerEmail}</Text>
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

  card: {
    backgroundColor: Colors.white, borderRadius: 24, padding: 20,
    elevation: 4, shadowColor: '#1e293b', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 10, marginBottom: 16,
  },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: Colors.primary, marginBottom: 2 },
  sectionSubtitle: { fontSize: 11.2, color: '#64748b', marginBottom: 12, fontWeight: '400' },
  rateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f8fafc', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8,
    marginBottom: 12,
  },
  rateText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  activeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f0fdf4', padding: 12, borderRadius: 12, marginBottom: 4,
  },
  activeText: { fontSize: 13, color: '#166534', fontWeight: '600', flex: 1 },
  activeSubtext: { fontSize: 12, color: '#166534', marginTop: 2 },

  plansTitle: { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 10 },
  plansGrid: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  planCard: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 16, padding: 12,
    alignItems: 'center', borderWidth: 2, borderColor: '#e2e8f0', position: 'relative',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4,
  },
  planCardSelected: { borderColor: Colors.primary, backgroundColor: '#fff1e6' },
  badge: {
    position: 'absolute', top: -8, backgroundColor: '#16a34a',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
  },
  badgeText: { fontSize: 9, color: '#FFFFFF', fontWeight: '800' },
  planPrice: { fontSize: 22, fontWeight: '900', color: '#1e293b', marginTop: 8 },
  planPriceSelected: { color: Colors.primary },
  planLabel: { fontSize: 12, color: '#64748b', fontWeight: '500', marginTop: 2 },
  planLabelSelected: { color: Colors.primary },
  planArs: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  planArsSelected: { color: Colors.primary },

  cardLabel: {
    fontSize: 10, fontWeight: '900', color: '#94a3b8',
    letterSpacing: 1.5, marginBottom: 12,
  },
  packNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  packNameText: { fontSize: 16, fontWeight: '700', color: Colors.text },
  badgeSmall: {
    backgroundColor: '#16a34a', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  badgeSmallText: { fontSize: 9, color: '#FFFFFF', fontWeight: '800' },
  resumenText: { fontSize: 14, color: '#334155', marginBottom: 6 },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 12 },
  totalPrice: { fontSize: 18, fontWeight: '900', color: Colors.text, marginBottom: 4 },
  totalArs: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 14 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  loadingText: { fontSize: 12, color: '#94a3b8' },
  errorText: { fontSize: 11, color: '#dc2626', textAlign: 'center', marginTop: 8 },
  paypalBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0070ba', borderRadius: 14, paddingVertical: 15,
    elevation: 4, shadowColor: '#0070ba',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  paypalBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },

  orderCard: {
    backgroundColor: '#fefce8', borderRadius: 20, padding: 18,
    marginBottom: 16, borderWidth: 1, borderColor: '#fde68a',
  },
  orderTitle: { fontSize: 15, fontWeight: '800', color: '#854d0e', marginBottom: 12 },
  orderField: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#fef9c3',
    width: '100%', marginTop: 6,
  },
  orderLabel: { fontSize: 12, color: '#854d0e' },
  orderValue: { fontSize: 13, fontWeight: '700', color: '#713f12' },
});
