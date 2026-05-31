import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert,
  Linking, Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Colors } from '../theme';
import { useGlobal } from '../context/GlobalContext';

export default function InvitarScreen({ navigation, route }) {
  const { currentUser, getReferralCode, getInvites, getUserLoyaltyPoints } = useGlobal();
  const [copied, setCopied] = useState(false);

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

  const referralCode = getReferralCode(currentUser?.id);
  const invites = getInvites(currentUser?.id);
  const puntosGanados = getUserLoyaltyPoints(currentUser?.id);

  const shareMessage = `¡Unite a WinTasks con mi código! Usá "${referralCode}" al registrarte y obtené 1 mes gratis de membresía. Descargala: https://wintasks.app`;

  const handleShare = async () => {
    try {
      await Share.share({ message: shareMessage });
    } catch {}
  };

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(referralCode || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'No se pudo abrir WhatsApp'));
  };

  return (
    <LinearGradient colors={['#FFFFFF', '#FFD699', '#C06000']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invitar amig@</Text>
          <View style={{ width: 32 }} />
        </View>

        <View style={styles.card}>
          <Ionicons name="gift" size={48} color={Colors.primary} style={{ marginBottom: 12 }} />
          <Text style={styles.cardTitle}>¡Invitate y ganá!</Text>
          <Text style={styles.cardSubtitle}>
            Por cada amigo que se registre con tu código, recibís 50 puntos WinTasks y él obtiene 1 mes de membresía gratis.
          </Text>
        </View>

        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Tu código de invitación</Text>
          <Text style={styles.codeValue}>{referralCode || '—'}</Text>
          <TouchableOpacity style={styles.copyBtn} onPress={handleCopyCode}>
            <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color="white" style={{ marginRight: 6 }} />
            <Text style={styles.copyBtnText}>{copied ? '¡Copiado!' : 'Copiar código'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.shareSection}>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={22} color="white" style={{ marginRight: 8 }} />
            <Text style={styles.shareBtnText}>Compartir</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.whatsappBtn} onPress={handleWhatsApp}>
            <Ionicons name="logo-whatsapp" size={22} color="white" style={{ marginRight: 8 }} />
            <Text style={styles.shareBtnText}>WhatsApp</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{invites.length}</Text>
            <Text style={styles.statLabel}>Invitaciones</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{puntosGanados}</Text>
            <Text style={styles.statLabel}>Puntos WinTasks</Text>
          </View>
        </View>

        {invites.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Invitaciones enviadas</Text>
            {invites.map((inv, i) => (
              <View key={i} style={styles.inviteRow}>
                <View style={styles.inviteAvatar}>
                  <Text style={styles.inviteAvatarText}>{inv.invitedAlias?.charAt(0).toUpperCase() || '?'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inviteName}>{inv.invitedAlias}</Text>
                  <Text style={styles.inviteDate}>{new Date(inv.invitedAt).toLocaleDateString('es-AR')}</Text>
                </View>
                <View style={styles.inviteBadge}>
                  <Text style={styles.inviteBadgeText}>+50 pts</Text>
                </View>
              </View>
            ))}
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
    flexDirection: 'row', alignItems: 'center', marginBottom: 16,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  card: {
    backgroundColor: Colors.white, borderRadius: 24, padding: 20,
    elevation: 4, shadowColor: '#1e293b', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 10, marginBottom: 16, alignItems: 'center',
  },
  cardTitle: { fontSize: 18, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  cardSubtitle: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 20 },
  codeCard: {
    backgroundColor: Colors.white, borderRadius: 24, padding: 24,
    elevation: 4, shadowColor: '#1e293b', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 10, marginBottom: 16, alignItems: 'center',
    borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed',
  },
  codeLabel: { fontSize: 12, color: '#64748b', fontWeight: '600', marginBottom: 8 },
  codeValue: { fontSize: 28, fontWeight: '900', color: Colors.primary, marginBottom: 16, letterSpacing: 2 },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary,
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 20,
  },
  copyBtnText: { color: 'white', fontSize: 14, fontWeight: '700' },
  shareSection: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  shareBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#3b82f6', borderRadius: 14, paddingVertical: 14,
  },
  whatsappBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#25D366', borderRadius: 14, paddingVertical: 14,
  },
  shareBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 20, padding: 20,
    alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6,
  },
  statNumber: { fontSize: 28, fontWeight: '900', color: Colors.primary },
  statLabel: { fontSize: 12, color: '#64748b', fontWeight: '500', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 12, alignSelf: 'flex-start' },
  inviteRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9', width: '100%',
  },
  inviteAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#fef3c7',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  inviteAvatarText: { fontSize: 14, fontWeight: '700', color: '#d97706' },
  inviteName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  inviteDate: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  inviteBadge: {
    backgroundColor: '#f0fdf4', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
  },
  inviteBadgeText: { fontSize: 13, fontWeight: '800', color: '#16a34a' },
});
