import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useGlobal } from '../context/GlobalContext';

const TOKEN_PACKS = [
  { id: 'p0', tokens: 200, price: 1.50, label: 'Pack 200', desc: '200 tokens', expiryMonths: 6 },
  { id: 'p1', tokens: 500, price: 2.50, label: 'Pack 500', desc: '500 tokens', expiryMonths: 6 },
  { id: 'p2', tokens: 1000, price: 4.00, label: 'Pack 1000', desc: '1.000 tokens', expiryMonths: 6 },
  { id: 'p3', tokens: 2500, price: 9.50, label: 'Pack 2500', desc: '2.500 tokens', expiryMonths: 12 },
  { id: 'p4', tokens: 5000, price: 18.00, label: 'Pack 5000', desc: '5.000 tokens', expiryMonths: 12 },
  { id: 'p5', tokens: 9000, price: 25.00, label: 'Pack 9000', desc: '9.000 tokens', expiryMonths: 12 },
];

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

const fmtARS = (n) => n ? `$${n.toLocaleString('es-AR')}` : '';

const POLL_INTERVAL = 5000;
const POLL_TIMEOUT = 300000;

export default function TokensScreen({ navigation }) {
  const { currentUser, getUserTokens, getPurchaseHistory, refreshData } = useGlobal();
  const myTokens = getUserTokens(currentUser?.id);
  const purchases = getPurchaseHistory(currentUser?.id);

  const [selectedPack, setSelectedPack] = useState(null);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [payPalOrderId, setPayPalOrderId] = useState(null);
  const [waitingPayPal, setWaitingPayPal] = useState(false);
  const [payPalError, setPayPalError] = useState(null);
  const [purchased, setPurchased] = useState(false);
  const [mepRate, setMepRate] = useState(null);
  const [loadingRate, setLoadingRate] = useState(true);

  const pollingRef = useRef(null);

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

  const handleSelectPack = (pack) => {
    setSelectedPack(pack);
    setPayPalOrderId(null);
    setPayPalError(null);
    setPurchased(false);
    setWaitingPayPal(false);
    if (pollingRef.current) clearInterval(pollingRef.current);
  };

  const startPolling = (orderId, pack) => {
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
          await refreshData();
          setPayPalOrderId(null);
          setWaitingPayPal(false);
          setSelectedPack(null);
          setPurchased(true);
          Alert.alert('Compra exitosa', `Recibiste ${pack.tokens.toLocaleString()} tokens.`);
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

  const handleCreateOrder = async () => {
    if (!selectedPack || !currentUser) return;
    setCreatingOrder(true);
    setPayPalError(null);
    try {
      const res = await fetch('https://win-tasks.vercel.app/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: selectedPack.price,
          userId: currentUser.id,
          productType: 'tokens',
          productId: selectedPack.id,
          userEmail: currentUser.email || '',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.approvalUrl) throw new Error(data.error || 'No se pudo crear la orden');
      setPayPalOrderId(data.id);
      Linking.openURL(data.approvalUrl).catch(() => Alert.alert('Error', 'No se pudo abrir PayPal'));
      startPolling(data.id, selectedPack);
    } catch (e) {
      setPayPalError(e.message);
      Alert.alert('Error', e.message);
    } finally {
      setCreatingOrder(false);
    }
  };

  const cancelPurchase = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    setSelectedPack(null);
    setPayPalOrderId(null);
    setPayPalError(null);
    setWaitingPayPal(false);
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
          {TOKEN_PACKS.map(pack => {
            const isSelected = selectedPack?.id === pack.id;
            return (
              <TouchableOpacity
                key={pack.id}
                style={[styles.offerCard, isSelected && styles.offerCardSelected]}
                onPress={() => handleSelectPack(pack)}
                disabled={!!payPalOrderId || waitingPayPal}
              >
                <LinearGradient colors={isSelected ? ['#0070ba', '#005a9e'] : ['#E88900', '#C06000']} style={styles.offerIcon}>
                  <Ionicons name="logo-usd" size={28} color="#FFF" />
                </LinearGradient>
                <Text style={styles.offerTokens}>{pack.tokens.toLocaleString()}</Text>
                <Text style={styles.offerDesc}>{pack.desc}</Text>
                <Text style={styles.offerPrice}>USD {pack.price.toFixed(2)}</Text>
                {mepRate ? <Text style={styles.offerArs}>{fmtARS(Math.round(pack.price * mepRate))}</Text> : null}
                <Text style={styles.offerExpiry}>{pack.expiryMonths} meses</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {selectedPack && !payPalOrderId && !purchased && !waitingPayPal && (
        <View style={styles.purchaseCard}>
          <Text style={styles.purchaseTitle}>{selectedPack.label}</Text>
          <Text style={styles.purchaseTokens}>{selectedPack.tokens.toLocaleString()} tokens</Text>
          <Text style={styles.purchasePrice}>USD {selectedPack.price.toFixed(2)}</Text>
          {mepRate ? (
            <Text style={styles.purchaseArs}>{fmtARS(Math.round(selectedPack.price * mepRate))} ARS</Text>
          ) : loadingRate ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#E88900" />
              <Text style={styles.loadingText}>Cargando cotización...</Text>
            </View>
          ) : null}
          <Text style={styles.legalText}>
            El monto en pesos es de referencia según el dólar MEP estimado del día. El cobro se realizará en USD a través de PayPal.
          </Text>
          <TouchableOpacity
            style={[styles.paypalBtn, creatingOrder && { opacity: 0.5 }]}
            onPress={handleCreateOrder}
            disabled={creatingOrder}
          >
            {creatingOrder ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="logo-paypal" size={18} color="white" style={{ marginRight: 6 }} />
                <Text style={styles.paypalBtnText}>Pagar con PayPal</Text>
              </>
            )}
          </TouchableOpacity>
          {payPalError && <Text style={styles.errorText}>{payPalError}</Text>}
          <TouchableOpacity style={styles.cancelBtn} onPress={cancelPurchase}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      )}

      {waitingPayPal && (
        <View style={[styles.purchaseCard, { backgroundColor: '#eef2ff', borderColor: '#c7d2fe' }]}>
          <View style={{ alignItems: 'center', paddingVertical: 8 }}>
            <ActivityIndicator size="large" color="#4338ca" />
            <Text style={[styles.purchaseTitle, { color: '#4338ca', marginTop: 14, textAlign: 'center' }]}>
              Esperando confirmación de PayPal...
            </Text>
            <Text style={{ fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 6, paddingHorizontal: 16 }}>
              Aprobá el pago en la ventana de PayPal y esperá unos segundos.
            </Text>
            <View style={styles.orderField}>
              <Text style={styles.orderLabel}>Pack</Text>
              <Text style={styles.orderValue}>{selectedPack?.label} ({selectedPack?.tokens.toLocaleString()} tokens)</Text>
            </View>
            <View style={styles.orderField}>
              <Text style={styles.orderLabel}>Monto</Text>
              <Text style={styles.orderValue}>USD {selectedPack?.price.toFixed(2)}{mepRate ? ` · ${fmtARS(Math.round(selectedPack.price * mepRate))}` : ''}</Text>
            </View>
            {payPalError && <Text style={styles.errorText}>{payPalError}</Text>}
            <TouchableOpacity style={[styles.cancelBtn, { marginTop: 12 }]} onPress={cancelPurchase}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {purchased && (
        <View style={[styles.purchaseCard, { backgroundColor: '#f0fdf4', borderColor: '#86efac' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="checkmark-circle" size={28} color="#16a34a" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.purchaseTitle, { color: '#166534', marginBottom: 0 }]}>Compra exitosa</Text>
              <Text style={{ fontSize: 12, color: '#166534' }}>Tus tokens ya están disponibles.</Text>
            </View>
          </View>
        </View>
      )}

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
                <Text style={styles.historyPack}>{p.tokens.toLocaleString()} tokens</Text>
                <Text style={styles.historyDate}>{formatDate(p.acquiredAt)}</Text>
              </View>
              <View style={styles.historyRight}>
                <Text style={styles.historyPlus}>+{p.tokens}</Text>
                {p.expiresAt && <Text style={styles.historyExpiry}>{formatExpiry(p.expiresAt)}</Text>}
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  balanceBar: {
    padding: 24, alignItems: 'center',
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 8,
  },
  balanceLabel: { fontSize: 13, color: '#fff', opacity: 0.85 },
  balanceAmount: { fontSize: 40, fontWeight: '900', color: '#fff', marginTop: 4 },

  offersSection: { paddingHorizontal: 16, marginTop: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1e293b', marginBottom: 12 },
  offersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  offerCard: {
    width: '31%', backgroundColor: '#fff', borderRadius: 16, padding: 12,
    alignItems: 'center', borderWidth: 2, borderColor: '#e2e8f0', elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
  },
  offerCardSelected: { borderColor: '#0070ba' },
  offerIcon: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  offerTokens: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
  offerDesc: { fontSize: 11, color: '#64748b', marginTop: 2 },
  offerPrice: { fontSize: 13, fontWeight: '700', color: '#E88900', marginTop: 4 },
  offerExpiry: { fontSize: 10, color: '#aaa', marginTop: 2 },

  purchaseCard: {
    marginHorizontal: 16, marginBottom: 16, backgroundColor: '#fff',
    borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#e2e8f0', elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6,
  },
  purchaseTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 4 },
  purchaseTokens: { fontSize: 28, fontWeight: '900', color: '#1e293b' },
  purchasePrice: { fontSize: 14, color: '#64748b', marginBottom: 14 },
  paypalBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0070ba', borderRadius: 14, paddingVertical: 14,
    elevation: 4, shadowColor: '#0070ba',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  paypalBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },

  orderField: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#e0e7ff',
    width: '100%', marginTop: 6,
  },
  orderLabel: { fontSize: 12, color: '#4338ca' },
  orderValue: { fontSize: 13, fontWeight: '700', color: '#3730a3' },
  errorText: { fontSize: 11, color: '#dc2626', textAlign: 'center', marginTop: 8 },
  cancelBtn: { alignItems: 'center', paddingVertical: 8, marginTop: 4 },
  cancelBtnText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },

  historySection: { paddingHorizontal: 16, paddingBottom: 30 },
  emptyCard: {
    backgroundColor: '#f8fafc', borderRadius: 16, padding: 24,
    alignItems: 'center',
  },
  emptyText: { fontSize: 13, color: '#94a3b8', marginTop: 8 },
  historyCard: {
    backgroundColor: '#f8fafc', borderRadius: 12, padding: 14,
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8,
  },
  historyLeft: {},
  historyPack: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  historyDate: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  historyRight: { alignItems: 'flex-end' },
  historyPlus: { fontSize: 16, fontWeight: '900', color: '#16a34a' },
  historyExpiry: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  offerArs: { fontSize: 10, color: '#aaa', marginTop: 1 },
  purchaseArs: { fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 14 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  loadingText: { fontSize: 12, color: '#94a3b8' },
  legalText: {
    fontSize: 10, color: '#94a3b8', textAlign: 'center',
    marginBottom: 12, paddingHorizontal: 8, lineHeight: 14,
  },
});
