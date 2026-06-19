import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, Image, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme';
import { useGlobal } from '../context/GlobalContext';

const { width, height } = Dimensions.get('window');

export default function SorpresaRevealScreen({ navigation, route }) {
  const surprise = route.params?.surprise;
  const { currentUser, getUserTokens, openSurprise, claimSurprise } = useGlobal();
  const myTokens = getUserTokens(currentUser?.id);
  const [revealed, setRevealed] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [insufficient, setInsufficient] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const giftScale = useRef(new Animated.Value(1)).current;
  const giftOpacity = useRef(new Animated.Value(1)).current;

  if (!surprise) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Sorpresa no encontrada</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const cost = surprise.tokenReward;
  const canAfford = myTokens >= cost;
  const isExpired = surprise.expirationDate && new Date(surprise.expirationDate) < new Date();
  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const handleReveal = () => {
    Animated.parallel([
      Animated.timing(giftScale, { toValue: 2, duration: 400, useNativeDriver: true }),
      Animated.timing(giftOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(300),
        Animated.timing(opacityAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
      ]),
    ]).start();
    setRevealed(true);
    openSurprise(surprise.id);
  };

  const handleClaim = () => {
    if (!canAfford) {
      setInsufficient(true);
      setTimeout(() => setInsufficient(false), 3000);
      return;
    }
    claimSurprise(surprise.id);
    setClaimed(true);
    setTimeout(() => navigation.goBack(), 2000);
  };

  const bgGradient = (
    <LinearGradient colors={[surprise.bgColor || '#2D1B69', '#0D0D2B']} style={StyleSheet.absoluteFill} />
  );
  return (
    <View style={styles.container}>
      {surprise.bgImageUri ? (
        <ImageBackground source={{ uri: surprise.bgImageUri }} style={StyleSheet.absoluteFill} />
      ) : bgGradient}
      <View style={styles.containerContent}>
      {!revealed ? (
        <TouchableOpacity style={styles.revealTouch} onPress={handleReveal} activeOpacity={0.8}>
          <Animated.View style={{ transform: [{ scale: giftScale }], opacity: giftOpacity, alignItems: 'center' }}>
            {surprise.iconImageUri ? (
              <Image source={{ uri: surprise.iconImageUri }} style={styles.revealIconImage} />
            ) : (
              <Ionicons name={surprise.icon || 'gift'} size={120} color="#FFD700" />
            )}
            <Text style={styles.revealHint}>¡Tocá para abrir!</Text>
          </Animated.View>
        </TouchableOpacity>
      ) : (
        <Animated.View style={[styles.content, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.confettiRow}>
            <Text style={styles.confetti}>🎉</Text>
            <Text style={styles.confetti}>🎊</Text>
            <Text style={styles.confetti}>✨</Text>
          </View>

          {surprise.iconImageUri ? (
            <Image source={{ uri: surprise.iconImageUri }} style={styles.revealIconImage} />
          ) : (
            <Ionicons name={surprise.icon || 'gift'} size={80} color="#FFD700" />
          )}

          <Text style={styles.revealTitle}>¡Sorpresa!</Text>
          <Text style={styles.surpriseName}>{surprise.title}</Text>
          {surprise.description ? (
            <Text style={styles.surpriseDesc}>{surprise.description}</Text>
          ) : null}

          <View style={styles.costBadge}>
            <Ionicons name="diamond" size={22} color="#FFD700" />
            <Text style={styles.costAmount}>{cost}</Text>
            <Text style={styles.costLabel}>tokens</Text>
          </View>

          {surprise.expirationDate ? (
            <Text style={[styles.expDate, isExpired && styles.expired]}>
              {isExpired ? 'Vencida' : `Canjealo hasta el ${formatDate(surprise.expirationDate)}`}
            </Text>
          ) : null}

          {!claimed ? (
            <>
              <TouchableOpacity
                style={[styles.claimBtn, (!canAfford || isExpired) && styles.claimBtnDisabled]}
                onPress={handleClaim}
                disabled={isExpired}
              >
                <Ionicons name="gift" size={22} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.claimBtnText}>Canjear premio</Text>
              </TouchableOpacity>
              {insufficient && (
                <Text style={styles.insufficientText}>
                  No tenés suficientes tokens. Te faltan {cost - myTokens}.
                </Text>
              )}
              <Text style={styles.balanceText}>Tu saldo: {myTokens} tokens</Text>
            </>
          ) : (
            <View style={styles.claimedBox}>
              <Ionicons name="checkmark-circle" size={32} color={Colors.success} />
              <Text style={styles.claimedText}>¡Premio canjeado!</Text>
              <Text style={styles.claimedSub}>Tu papá/mamá ya está en contacto</Text>
            </View>
          )}
        </Animated.View>
      )}
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  containerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  revealTouch: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' },
  revealHint: { color: 'rgba(255,255,255,0.6)', fontSize: 18, marginTop: 32, fontWeight: '500' },
  content: { alignItems: 'center', paddingHorizontal: 32 },
  confettiRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  confetti: { fontSize: 40 },
  revealIconImage: { width: 120, height: 120, borderRadius: 60, marginBottom: 16 },
  revealTitle: { fontSize: 36, fontWeight: '800', color: '#FFD700', marginBottom: 8, textAlign: 'center' },
  surpriseName: { fontSize: 26, fontWeight: '700', color: '#FFF', marginBottom: 12, textAlign: 'center' },
  surpriseDesc: { fontSize: 16, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  costBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,215,0,0.15)',
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16, marginBottom: 24, gap: 8,
  },
  expDate: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 20 },
  expired: { color: '#FF6B6B', fontWeight: '600' },
  costAmount: { fontSize: 32, fontWeight: '800', color: '#FFD700' },
  costLabel: { fontSize: 14, color: 'rgba(255,215,0,0.7)', fontWeight: '500' },
  claimBtn: {
    flexDirection: 'row', backgroundColor: '#FF6B6B', paddingHorizontal: 32, paddingVertical: 16,
    borderRadius: 14, alignItems: 'center', elevation: 6, shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
  },
  claimBtnDisabled: { opacity: 0.5 },
  claimBtnText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  insufficientText: { color: '#FF6B6B', fontSize: 14, marginTop: 12, textAlign: 'center' },
  balanceText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 12 },
  claimedBox: { alignItems: 'center', gap: 8 },
  claimedText: { color: Colors.success, fontSize: 18, fontWeight: '600' },
  claimedSub: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  errorText: { color: '#FFF', fontSize: 18, marginBottom: 20 },
  backBtn: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  backBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
