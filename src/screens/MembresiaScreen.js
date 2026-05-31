import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, Image, Linking, Modal, TextInput,
  Dimensions, Platform,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme';
import { useGlobal } from '../context/GlobalContext';

const PLANS = [
  { key: '1mes', label: '1 mes', usd: 1.5, months: 1, badge: null },
  { key: '3meses', label: '3 meses', usd: 3, months: 3, badge: '33% ahorro' },
  { key: '6meses', label: '6 meses', usd: 5, months: 6, badge: '44% ahorro' },
];

const BANK_DATA = {
  bank: 'Banco Santander',
  cbu: '00000031000123456789',
  alias: 'DOSANTANDER',
  titular: 'Diego Maximiliano Ottino',
  cuit: '20244581081',
};

const crc16 = (data) => {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
    }
  }
  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
};

const buildEmvcoPayload = (alias, cuit, amountArs, merchantName, merchantCity) => {
  const fmtAmount = amountArs.toFixed(2);
  const tlv = (id, val) => `${id}${String(val.length).padStart(2, '0')}${val}`;
  let payload = '';
  payload += '000201'; // Payload Format Indicator
  payload += tlv('01', '12'); // Point of Initiation Method: 12=dynamic
  // IDs 50/51 son templates con sub-ID 00 según BCRA A6425 + CIMPRA 535/540
  payload += tlv('50', tlv('00', cuit || ''));
  payload += tlv('51', tlv('00', alias || ''));
  payload += '52040000'; // Merchant Category Code (generic)
  payload += tlv('53', '032'); // Currency: ARS
  payload += tlv('54', fmtAmount);
  payload += tlv('58', 'AR'); // Country Code
  if (merchantName) payload += tlv('59', merchantName);
  if (merchantCity) payload += tlv('60', merchantCity);
  const crc = crc16(payload + '6304');
  payload += `6304${crc}`;
  return payload;
};

export default function MembresiaScreen({ navigation, route }) {
  const {
    currentUser, requestMembership, markPaymentSent,
    verifyMembership, getUserMembership, getPendingVerifications,
  } = useGlobal();

  const [mepRate, setMepRate] = useState(null);
  const [loadingRate, setLoadingRate] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [marking, setMarking] = useState(false);
  const [verifyingId, setVerifyingId] = useState(null);

  // Modal QR
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrStep, setQrStep] = useState('view'); // view | sendOptions | sendEmail | sendingWhatsApp
  const [emailInput, setEmailInput] = useState('');

  const expiryTimer = useRef(null);
  const [timeLeft, setTimeLeft] = useState('');

  const isAdmin = currentUser?.phone === '+541122222222';
  const myMembership = getUserMembership(currentUser?.id);
  const pendingVerifications = isAdmin ? getPendingVerifications() : [];

  const userEmail = currentUser?.email || '';
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

  useEffect(() => {
    if (currentOrder) {
      const updateCountdown = () => {
        const now = Date.now();
        const expiry = new Date(currentOrder.expiresAt).getTime();
        const diff = Math.max(0, expiry - now);
        if (diff <= 0) {
          setTimeLeft('Expirado');
          clearInterval(expiryTimer.current);
          return;
        }
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
      };
      updateCountdown();
      expiryTimer.current = setInterval(updateCountdown, 1000);
      return () => clearInterval(expiryTimer.current);
    }
  }, [currentOrder]);

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setCurrentOrder(null);
  };

  const getQrApiUrl = (ref, amountArs) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
      buildEmvcoPayload(BANK_DATA.alias, BANK_DATA.cuit, amountArs, BANK_DATA.titular, 'Buenos Aires')
    )}`;

  const buildEmailBody = (ref, amountArs) => {
    const qrUrl = getQrApiUrl(ref, amountArs);
    const lines = [
      '¡Gracias por tu compra en WinTasks!',
      '',
      `Referencia: ${ref}`,
      `Monto: ${fmtARS(amountArs)}`,
      '',
      'Datos bancarios para transferir:',
      `Banco: ${BANK_DATA.bank}`,
      `CBU: ${BANK_DATA.cbu}`,
      `Alias: ${BANK_DATA.alias}`,
      `CUIT: ${BANK_DATA.cuit}`,
      `Titular: ${BANK_DATA.titular}`,
      '',
      'Escaneá el QR con tu aplicación bancaria (es interoperable, formato EMVCo Transferencias 3.0):',
      qrUrl,
      '',
      'Tenés 1 hora para abonar desde que se generó la orden.',
      '',
      'Después de pagar, volvé a la app y tocá "Pagué" para avisar al administrador.',
    ];
    return lines.join('\n');
  };

  const openEmail = (to, ref, amountArs) => {
    const subject = encodeURIComponent(`QR Pago Membresía WinTasks - ${ref}`);
    const body = encodeURIComponent(buildEmailBody(ref, amountArs));
    const mailto = to ? `mailto:${to}?subject=${subject}&body=${body}` : `mailto:?subject=${subject}&body=${body}`;
    Linking.openURL(mailto).catch(() =>
      Alert.alert('Error', 'No se pudo abrir el cliente de correo')
    );
  };

  const shareQrOnWhatsApp = async (ref, amountArs) => {
    const qrUrl = getQrApiUrl(ref, amountArs);
    const fileUri = FileSystem.cacheDirectory + `qr_${ref}.png`;
    try {
      const download = await FileSystem.downloadAsync(qrUrl, fileUri);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(download.uri, { mimeType: 'image/png', dialogTitle: 'Compartir QR de pago' });
      } else {
        Alert.alert('Error', 'Compartir no está disponible en este dispositivo');
      }
    } catch (e) {
      Alert.alert('Error', `No se pudo compartir el QR: ${e.message || e}`);
    }
  };

  const handleCreateOrder = async () => {
    if (!selectedPlan || !mepRate || !currentUser) return;
    setCreatingOrder(true);
    try {
      const amountArs = Math.round(selectedPlan.usd * mepRate);
      const ref = requestMembership(currentUser.id, selectedPlan.key, selectedPlan.usd, amountArs, mepRate);
      const order = {
        paymentRef: ref,
        amountUsd: selectedPlan.usd,
        amountArs,
        rate: mepRate,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        userEmail,
        status: 'pending',
        plan: selectedPlan.key,
      };
      setCurrentOrder(order);
      openEmail(userEmail, ref, amountArs);
      Alert.alert(
        'QR enviado por mail',
        `El QR con los datos de pago fue enviado a:\n${userEmail || '(sin correo registrado)'}\n\nTenés 1 hora para abonar.`,
        [{ text: 'Entendido' }],
      );
    } finally {
      setCreatingOrder(false);
    }
  };

  const handlePague = async () => {
    if (!pendingOrder || pendingOrder.status !== 'pending') return;
    setMarking(true);
    try {
      markPaymentSent(currentUser.id);
      Alert.alert(
        'Aviso enviado',
        'El pago está en proceso de verificación. El administrador lo revisará y activará tu membresía a la brevedad.',
      );
      setCurrentOrder(null);
      setSelectedPlan(null);
    } finally {
      setMarking(false);
    }
  };

  const handleVerify = async (userId) => {
    setVerifyingId(userId);
    try {
      verifyMembership(userId);
      Alert.alert('Membresía activada', 'El usuario ya tiene su membresía vigente.');
    } finally {
      setVerifyingId(null);
    }
  };

  const openQrModal = () => {
    setQrStep('view');
    setEmailInput(userEmail);
    setShowQrModal(true);
  };

  const getMyPendingOrder = () => {
    if (myMembership?.status === 'pending' || myMembership?.status === 'waiting_verification') {
      return {
        paymentRef: myMembership.paymentRef,
        amountArs: myMembership.amountArs,
        amountUsd: myMembership.amountUsd,
        expiresAt: myMembership.expiresAt,
        createdAt: myMembership.createdAt,
        status: myMembership.status,
        plan: myMembership.plan,
      };
    }
    return currentOrder;
  };

  const pendingOrder = getMyPendingOrder();
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

        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Membresía</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Status card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Membresía WinTasks</Text>
          <Text style={styles.sectionSubtitle}>
            {membershipActive
              ? 'Tu membresía está activa.'
              : myMembership?.status === 'waiting_verification'
              ? 'Tu pago está en proceso de verificación.'
              : myMembership?.status === 'pending'
              ? 'Tenés una orden pendiente. Abonala antes de que venza.'
              : 'Elegí el plan y obtené tu QR por email.'}
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
            <View style={styles.activeBanner}>
              <Ionicons name="checkmark-circle" size={22} color="#16a34a" />
              <Text style={styles.activeText}>Activa hasta el {membershipEndDate}</Text>
            </View>
          )}
        </View>

        {/* Plans */}
        <Text style={styles.plansTitle}>Elegí tu plan</Text>
        <View style={styles.plansGrid}>
          {PLANS.map(p => {
            const selected = selectedPlan?.key === p.key;
            const hasActivePending = membershipActive || myMembership?.status === 'waiting_verification' || (myMembership?.status === 'pending' && !currentOrder);
            const disabled = hasActivePending && !selectedPlan;
            return (
              <TouchableOpacity
                key={p.key}
                style={[styles.planCard, selected && styles.planCardSelected]}
                onPress={() => handleSelectPlan(p)}
                disabled={false}
              >
                {p.badge && <View style={styles.badge}><Text style={styles.badgeText}>{p.badge}</Text></View>}
                <Text style={[styles.planPrice, selected && styles.planPriceSelected]}>${p.usd}</Text>
                <Text style={[styles.planLabel, selected && styles.planLabelSelected]}>{p.label}</Text>
                {mepRate && <Text style={[styles.planArs, selected && styles.planArsSelected]}>{fmtARS(Math.round(p.usd * mepRate))}</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Resumen + Quiero comprar */}
        {selectedPlan && !pendingOrder && (
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
              style={[styles.buyBtn, (creatingOrder || !mepRate) && { opacity: 0.5 }]}
              onPress={handleCreateOrder}
              disabled={creatingOrder || !mepRate}
            >
              {creatingOrder ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="cart-outline" size={18} color="white" style={{ marginRight: 6 }} />
                  <Text style={styles.buyBtnText}>Quiero comprar</Text>
                </>
              )}
            </TouchableOpacity>
            {!mepRate && !loadingRate && (
              <Text style={styles.errorText}>No se pudo obtener la cotización. Revisá tu conexión.</Text>
            )}
          </View>
        )}

        {/* Pending order card */}
        {pendingOrder && (
          <View style={styles.orderCard}>
            <Text style={styles.orderTitle}>Solicitud de pack</Text>
            <View style={styles.orderField}>
              <Text style={styles.orderLabel}>Código</Text>
              <Text style={styles.orderValue}>{pendingOrder.paymentRef}</Text>
            </View>
            <View style={styles.orderField}>
              <Text style={styles.orderLabel}>Fecha</Text>
              <Text style={styles.orderValue}>{new Date(pendingOrder.createdAt).toLocaleString('es-AR')}</Text>
            </View>
            <View style={styles.orderField}>
              <Text style={styles.orderLabel}>Monto</Text>
              <Text style={styles.orderValue}>{fmtARS(pendingOrder.amountArs)}</Text>
            </View>
            <View style={styles.orderField}>
              <Text style={styles.orderLabel}>Estado</Text>
              <Text style={[styles.orderValue, {
                color: pendingOrder.status === 'waiting_verification' ? '#ca8a04' : pendingOrder.status === 'expired' ? '#dc2626' : '#16a34a'
              }]}>{
                pendingOrder.status === 'waiting_verification' ? 'Esperando verificación' :
                pendingOrder.status === 'expired' ? 'Expirado' : 'Pendiente'
              }</Text>
            </View>

            {pendingOrder.status === 'pending' && (
              <>
                <View style={styles.orderActions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={openQrModal}>
                    <Ionicons name="qr-code-outline" size={20} color={Colors.primary} />
                    <Text style={styles.actionBtnText}>Ver QR</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, marking && { opacity: 0.6 }]} onPress={handlePague} disabled={marking}>
                    {marking ? (
                      <ActivityIndicator color={Colors.primary} />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={20} color="#16a34a" />
                        <Text style={styles.actionBtnText}>Pagué</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
                <View style={styles.expiryRow}>
                  <Ionicons name="time-outline" size={14} color="#dc2626" />
                  <Text style={styles.expiryText}>Vence en {timeLeft || '—'}</Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* Admin: pending verifications */}
        {isAdmin && pendingVerifications.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>VERIFICACIONES PENDIENTES</Text>
            {pendingVerifications.map((pv) => {
              const user = currentUser.id === pv.userId ? currentUser : null;
              return (
                <View key={pv.userId} style={styles.adminRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.adminRef}>{pv.paymentRef}</Text>
                    <Text style={styles.adminDetail}>{user?.email || pv.userId} — {fmtARS(pv.amountArs)}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.verifyBtn, verifyingId === pv.userId && { opacity: 0.6 }]}
                    onPress={() => handleVerify(pv.userId)}
                    disabled={verifyingId === pv.userId}
                  >
                    {verifyingId === pv.userId ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text style={styles.verifyBtnText}>Verificar</Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

      </ScrollView>

      {/* QR Modal */}
      <Modal visible={showQrModal} transparent animationType="fade" onRequestClose={() => setShowQrModal(false)}>
        <View style={styles.qmOverlay}>
          <View style={styles.qmContent}>

            {qrStep === 'view' && (
              <>
                <TouchableOpacity style={styles.qmClose} onPress={() => setShowQrModal(false)}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </TouchableOpacity>
                {pendingOrder && (
                  <Image source={{ uri: getQrApiUrl(pendingOrder.paymentRef, pendingOrder.amountArs) }} style={styles.qmImage} resizeMode="contain" />
                )}
                <Text style={styles.qmHint}>Mostrá este código o compartilo</Text>
                <TouchableOpacity style={styles.qmSendBtn} onPress={() => setQrStep('sendOptions')}>
                  <Ionicons name="share-outline" size={20} color="white" style={{ marginRight: 6 }} />
                  <Text style={styles.qmSendBtnText}>Enviar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.qmCancelBtn} onPress={() => setShowQrModal(false)}>
                  <Text style={styles.qmCancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
              </>
            )}

            {qrStep === 'sendOptions' && (
              <>
                <TouchableOpacity style={styles.qmClose} onPress={() => setQrStep('view')}>
                  <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.qmTitle}>Enviar QR por</Text>
                <TouchableOpacity style={styles.qmOption} onPress={() => setQrStep('sendEmail')}>
                  <Ionicons name="mail-outline" size={24} color={Colors.primary} />
                  <Text style={styles.qmOptionText}>Mail</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.qmOption}
                  onPress={async () => {
                    setQrStep('sendingWhatsApp');
                    if (pendingOrder) {
                      await shareQrOnWhatsApp(pendingOrder.paymentRef, pendingOrder.amountArs);
                    }
                    setShowQrModal(false);
                  }}
                >
                  <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
                  <Text style={styles.qmOptionText}>WhatsApp</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.qmCancelBtn} onPress={() => setShowQrModal(false)}>
                  <Text style={styles.qmCancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
              </>
            )}

            {qrStep === 'sendEmail' && (
              <>
                <TouchableOpacity style={styles.qmClose} onPress={() => setQrStep('sendOptions')}>
                  <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.qmTitle}>Enviar QR por mail</Text>
                <TextInput
                  style={styles.qmInput}
                  value={emailInput}
                  onChangeText={setEmailInput}
                  placeholder="tu@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.qmSendBtn}
                  onPress={() => {
                    if (pendingOrder) {
                      openEmail(emailInput, pendingOrder.paymentRef, pendingOrder.amountArs);
                    }
                    setShowQrModal(false);
                  }}
                >
                  <Ionicons name="send-outline" size={18} color="white" style={{ marginRight: 6 }} />
                  <Text style={styles.qmSendBtnText}>Enviar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.qmCancelBtn} onPress={() => setShowQrModal(false)}>
                  <Text style={styles.qmCancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
              </>
            )}

            {qrStep === 'sendingWhatsApp' && (
              <View style={{ alignItems: 'center', padding: 20 }}>
                <ActivityIndicator color={Colors.primary} size="large" />
                <Text style={[styles.qmHint, { marginTop: 16 }]}>Preparando QR para compartir...</Text>
              </View>
            )}

          </View>
        </View>
      </Modal>
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
  buyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 15,
    elevation: 4, shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  buyBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },

  orderCard: {
    backgroundColor: '#fefce8', borderRadius: 20, padding: 18,
    marginBottom: 16, borderWidth: 1, borderColor: '#fde68a',
  },
  orderTitle: { fontSize: 15, fontWeight: '800', color: '#854d0e', marginBottom: 12 },
  orderField: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#fef9c3',
  },
  orderLabel: { fontSize: 12, color: '#854d0e' },
  orderValue: { fontSize: 13, fontWeight: '700', color: '#713f12' },
  orderActions: { flexDirection: 'row', gap: 10, marginTop: 14, marginBottom: 8 },
  actionBtn: {
    flex: 1, backgroundColor: 'white', borderRadius: 12, paddingVertical: 12,
    alignItems: 'center', gap: 4, elevation: 1, flexDirection: 'row', justifyContent: 'center',
  },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  expiryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 4 },
  expiryText: { fontSize: 12, color: '#dc2626', fontWeight: '600' },

  adminRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  adminRef: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  adminDetail: { fontSize: 11, color: '#64748b', marginTop: 2 },
  verifyBtn: {
    backgroundColor: '#16a34a', borderRadius: 8, paddingHorizontal: 14,
    paddingVertical: 8, marginLeft: 8,
  },
  verifyBtnText: { color: 'white', fontSize: 12, fontWeight: '700' },

  // QR Modal
  qmOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  qmContent: {
    backgroundColor: Colors.white, borderRadius: 24, padding: 24,
    marginHorizontal: 24, alignItems: 'center', width: Dimensions.get('window').width - 48,
  },
  qmClose: { alignSelf: 'flex-end', padding: 4 },
  qmTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 16 },
  qmImage: { width: Dimensions.get('window').width * 0.55, height: Dimensions.get('window').width * 0.55, marginBottom: 12 },
  qmHint: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginBottom: 16 },
  qmSendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 12,
    paddingHorizontal: 24, width: '100%', marginBottom: 8,
  },
  qmSendBtnText: { color: 'white', fontSize: 14, fontWeight: '700' },
  qmCancelBtn: { paddingVertical: 10 },
  qmCancelBtnText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  qmOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 20, width: '100%',
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, marginBottom: 10,
  },
  qmOptionText: { fontSize: 16, fontWeight: '600', color: Colors.text },
  qmInput: {
    width: '100%', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, marginBottom: 16, color: Colors.text,
  },
});
