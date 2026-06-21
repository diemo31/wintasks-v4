import React, { useRef, useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, Animated, Pressable, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme';
import { useGlobal } from '../context/GlobalContext';

const { width } = Dimensions.get('window');

const LOGO_SVG = `<svg width="600" height="120" viewBox="0 0 600 120" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(95, 15)">
    <rect x="0" y="0" width="90" height="90" rx="22" fill="#E05A47"/>
    <g transform="scale(0.18)">
        <rect x="116" y="140" width="280" height="250" rx="32" fill="#FFFFFF" />
        <rect x="146" y="100" width="24" height="70" rx="12" fill="#FFFFFF" />
        <rect x="211" y="100" width="24" height="70" rx="12" fill="#FFFFFF" />
        <rect x="276" y="100" width="24" height="70" rx="12" fill="#FFFFFF" />
        <rect x="341" y="100" width="24" height="70" rx="12" fill="#FFFFFF" />
        <rect x="140" y="200" width="232" height="166" rx="12" fill="#E05A47"/>
        <path d="M 180 290 L 230 340 L 310 240" fill="none" stroke="#FFFFFF" stroke-width="26" stroke-linecap="round" stroke-linejoin="round" />
    </g>
  </g>
  <text x="225" y="80" font-family="system-ui, sans-serif" font-size="64" fill="#FFFFFF">
    <tspan font-weight="800" fill="#E05A47">Win</tspan><tspan font-weight="300" fill="#A89F96">Tasks</tspan>
  </text>
</svg>`;

const beneficios = [
  { id: 'b1', title: 'Bonus Diario', desc: 'Ganá tokens extra cada día que entrás a la app.', icon: 'gift', color: '#fbbf24', bg: '#92400E', duration: 4000 },
  { id: 'b2', title: 'Racha de Tareas', desc: 'Completá 7 días seguidos sin faltar y recibí un bonus especial.', icon: 'flame', color: '#f97316', bg: '#9A3412', duration: 4500 },
  { id: 'b3', title: 'WinTasks Premium', desc: 'Accedé a estadísticas, más premios y canjes exclusivos.', icon: 'star', color: '#a7f3d0', bg: '#065F46', duration: 3500 },
  { id: 'b4', title: 'Canje Exprés', desc: 'Canjeá tus tokens por premios especiales por tiempo limitado.', icon: 'rocket', color: '#60a5fa', bg: '#1E3A5F', duration: 3000 },
];

const promos = [
  { id: 'p1', title: 'Minecraft: Minecoins', icon: 'diamond', color: '#4CAF50', bg: '#1B5E20' },
  { id: 'p2', title: 'Roblox: Robux Extra', icon: 'game-controller', color: '#FF5252', bg: '#B71C1C' },
  { id: 'p3', title: 'Fortnite: V-Bucks', icon: 'flash', color: '#7C4DFF', bg: '#311B92' },
  { id: 'p4', title: 'Netflix: 1 mes gratis', icon: 'film', color: '#E50914', bg: '#111' },
];

function AdCarousel({ data }) {
  const [focusIndex, setFocusIndex] = useState(0);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const scrollRef = useRef(null);
  const direction = useRef(1);
  const isInteracting = useRef(false);
  const interactionTimeout = useRef(null);
  const GAP = 4;
  const CAROUSEL_W = width - 40;
  const ITEM_WIDTH = Math.floor((CAROUSEL_W - GAP) / 2);
  const SNAP_INTERVAL = ITEM_WIDTH + GAP;
  const maxScrollIndex = Math.max(0, data.length - 2);

  useEffect(() => {
    if (isInteracting.current || data.length === 0) return;
    const currentAd = data[focusIndex];
    if (!currentAd) return;
    const timeout = setTimeout(() => {
      let next = focusIndex + direction.current;
      let dir = direction.current;
      if (next >= data.length) { next = data.length - 2; dir = -1; }
      else if (next < 0) { next = 1; dir = 1; }
      direction.current = dir;
      setFocusIndex(next);
      scrollRef.current?.scrollTo({ x: Math.min(next, maxScrollIndex) * SNAP_INTERVAL, animated: true });
    }, currentAd.duration || 4000);
    return () => clearTimeout(timeout);
  }, [focusIndex, data]);

  const handleScroll = (e) => {
    const x = e.nativeEvent.contentOffset.x;
    setShowLeftArrow(x > 10);
    setShowRightArrow(x + e.nativeEvent.layoutMeasurement.width < e.nativeEvent.contentSize.width - 10);
    if (isInteracting.current) {
      clearTimeout(interactionTimeout.current);
      interactionTimeout.current = setTimeout(() => {
        isInteracting.current = false;
        const newIdx = Math.round(x / SNAP_INTERVAL);
        direction.current = 1;
        setFocusIndex(newIdx);
      }, 400);
    }
  };

  return (
    <View style={{ width: CAROUSEL_W, alignSelf: 'center' }}>
      <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#cbd5e1', paddingVertical: 10, width: CAROUSEL_W }}>
        <ScrollView
          ref={scrollRef} horizontal showsHorizontalScrollIndicator={false}
          snapToInterval={SNAP_INTERVAL} snapToAlignment="start" decelerationRate="fast"
          onScroll={handleScroll}
          onScrollBeginDrag={() => { isInteracting.current = true; clearTimeout(interactionTimeout.current); }}
          scrollEventThrottle={16}
        >
          {data.map((ad, idx) => (
            <TouchableOpacity key={ad.id} style={[styles.adBanner, { width: ITEM_WIDTH, marginRight: idx === data.length - 1 ? 0 : GAP }]}>
              <LinearGradient colors={[ad.bg, ad.bg]} style={[styles.adImageBg, { borderRadius: 8 }]}>
                <View style={styles.adOverlay}>
                  <Ionicons name={ad.icon} size={36} color={ad.color} style={{ position: 'absolute', right: 8, top: 8, opacity: 0.95 }} />
                  <View style={styles.adContent}>
                    <Text style={[styles.adTitle, { fontSize: 16 }]} numberOfLines={2}>{ad.title}</Text>
                    <Text style={[styles.adDesc, { fontSize: 11, lineHeight: 14 }]} numberOfLines={3}>{ad.desc}</Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
      </ScrollView>
    </View>
    </View>
  );
}

function SecondaryCarousel({ data }) {
  const currentIndex = useRef(0);
  const scrollAnim = useRef(new Animated.Value(0)).current;
  const BANNER_W = width - 40;
  const ITEM_W = BANNER_W + 4;

  useEffect(() => {
    let isActive = true;
    const interval = setInterval(() => {
      if (!isActive) return;
      const next = (currentIndex.current + 1) % data.length;
      currentIndex.current = next;
      Animated.timing(scrollAnim, { toValue: -(next * ITEM_W), duration: 1200, useNativeDriver: true }).start();
    }, 5500);
    return () => { isActive = false; clearInterval(interval); };
  }, [data]);

  return (
    <View style={{ width: '100%', overflow: 'hidden' }}>
      <Animated.View style={{ flexDirection: 'row', width: data.length * ITEM_W, transform: [{ translateX: scrollAnim }] }}>
        {data.map((ad, idx) => (
          <TouchableOpacity key={ad.id} activeOpacity={0.8} style={[styles.secondaryAd, { width: BANNER_W, marginRight: idx === data.length - 1 ? 0 : 4 }]}>
            <LinearGradient colors={[ad.bg, ad.bg]} style={[styles.secondaryAdImg, { borderRadius: 8, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }]}>
              <Ionicons name={ad.icon} size={28} color={ad.color} style={{ marginRight: 12 }} />
              <Text style={styles.secondaryAdTitle}>{ad.title}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </Animated.View>
    </View>
  );
}

export default function DashboardAdultoScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { currentUser, getUserTokens, getUserLoyaltyPoints, logout, tasks } = useGlobal();
  const myTokens = getUserTokens(currentUser?.id);
  const myLoyaltyPoints = getUserLoyaltyPoints(currentUser?.id);
  const pendingApprovals = useMemo(() => tasks.filter(t => t.createdBy === currentUser?.id && t.status === 'completed').length, [tasks, currentUser?.id]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerAnim = useRef(new Animated.Value(-width * 0.75)).current;

  useEffect(() => {
    if (route.params?.openDrawer) {
      toggleDrawer(true);
      navigation.setParams({ openDrawer: undefined });
    }
  }, [route.params?.openDrawer]);

  const toggleDrawer = (open) => {
    setIsDrawerOpen(open);
    Animated.timing(drawerAnim, { toValue: open ? 0 : -width * 0.75, duration: 300, useNativeDriver: true }).start();
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#E88900', '#C06000']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[styles.customHeader, { paddingTop: Platform.OS === 'ios' ? 44 + insets.top : 44 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, paddingTop: 4 }}>
          <TouchableOpacity onPress={() => toggleDrawer(true)}>
            <Ionicons name="menu" size={28} color="#FEFCF8" />
          </TouchableOpacity>
          <View style={{ width: 10 }} />
          <Text style={styles.headerTitle}>¡Hola, {currentUser?.alias}!</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={() => {}} style={{ marginRight: 16 }}>
            <Ionicons name="notifications-outline" size={24} color="#FEFCF8" />
          </TouchableOpacity>
          <TouchableOpacity onPress={logout}>
            <Ionicons name="log-out-outline" size={24} color="#FEFCF8" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
      <LinearGradient colors={['#FFFFFF', '#F0EDEA']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <LinearGradient colors={['#FFFFFF', '#FFD699', '#E88900']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.orangeSection}>
            <View style={styles.logoContainer}>
              <SvgXml xml={LOGO_SVG} width={300} height={60} />
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('MiCuentaTokens')}>
            <LinearGradient colors={['#E88900', '#C06000']} style={styles.walletCard}>
              <Text style={styles.walletLabel}>Tu cuenta de tokens</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
                <Text style={styles.walletAmount}>{myTokens}</Text>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.5)" />
              </View>
            </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
          <TouchableOpacity onPress={() => navigation.navigate('MisPuntos')} style={styles.fidelityCardOuter}>
            <LinearGradient colors={['#FFFFFF', '#F0EDEA']} style={styles.fidelityCard}>
            <Text style={styles.fidelityLabel}>
              Mis puntos <Text style={styles.fidelityWin}>Win</Text><Text style={styles.fidelityTasks}>Tasks</Text>
            </Text>
            <View style={styles.fidelityRight}>
              <Text style={styles.fidelityValue}>{myLoyaltyPoints}</Text>
              <Ionicons name="chevron-forward" size={18} color="#ccc" />
            </View>
            </LinearGradient>
          </TouchableOpacity>
          <LinearGradient colors={['#FFFFFF', '#F0EDEA']} style={styles.actionsWrapper}>
            <View style={styles.actionsGrid}>
              <TouchableOpacity style={styles.appButton} onPress={() => navigation.navigate('CreateTask')}>
                <View style={styles.appIcon}>
                  <Ionicons name="add-circle" size={32} color="#FFFFFF" />
                </View>
                <Text style={styles.appText}>Crear tarea</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.appButton} onPress={() => navigation.navigate('CreateSurprise')}>
                <View style={styles.appIcon}>
                  <Ionicons name="sparkles" size={32} color="#FFFFFF" />
                </View>
                <Text style={styles.appText}>Crear sorpresa</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.appButton} onPress={() => navigation.navigate('Premios')}>
                <View style={styles.appIcon}>
                  <Ionicons name="gift" size={32} color="#FFFFFF" />
                </View>
                <Text style={styles.appText}>Premios</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.appButton} onPress={() => navigation.navigate('Tokens')}>
                <View style={styles.appIcon}>
                  <Ionicons name="cart" size={32} color="#FFFFFF" />
                </View>
                <Text style={styles.appText}>Tokens</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.appButton} onPress={() => navigation.navigate('Opciones')}>
                <View style={[styles.appIcon, { backgroundColor: Colors.textLight }]}>
                  <Ionicons name="apps-outline" size={32} color="#FFFFFF" />
                </View>
                <Text style={styles.appText}>Más opciones</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <View style={styles.bottomContent}>
            <Text style={styles.sectionTitle}>Premios populares</Text>
            <SecondaryCarousel data={promos} />
            <View style={styles.pfmRow}>
              <TouchableOpacity style={styles.pfmButton} onPress={() => navigation.navigate('TareasEnCurso')}>
                <Ionicons name="time-outline" size={16} color="#B85C3A" style={{ marginRight: 6 }} />
                <Text style={styles.pfmButtonText}>Tareas</Text>
                {pendingApprovals > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{pendingApprovals}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.pfmButton} onPress={() => navigation.navigate('ToDo')}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#B85C3A" style={{ marginRight: 6 }} />
                <Text style={styles.pfmButtonText}>To do</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pfmButton} onPress={() => navigation.navigate('Hijos')}>
                <Ionicons name="people-outline" size={16} color="#B85C3A" style={{ marginRight: 6 }} />
                <Text style={styles.pfmButtonText}>Hijos</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Beneficios exclusivos</Text>
            <AdCarousel data={beneficios} />
          </View>
        </ScrollView>
      </LinearGradient>

      {isDrawerOpen && <Pressable style={styles.drawerOverlay} onPress={() => toggleDrawer(false)} />}
      <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.drawerHeader}>
            <View style={styles.drawerAvatar}><Text style={styles.drawerAvatarText}>{currentUser?.alias?.charAt(0).toUpperCase() || 'U'}</Text></View>
            <View>
              <Text style={styles.drawerUserName}>{currentUser?.alias || 'Usuario'}</Text>
              <Text style={styles.drawerUserPhone}>{currentUser?.phone || ''}</Text>
            </View>
          </View>
          <ScrollView style={styles.drawerMenu}>
            <TouchableOpacity style={styles.drawerItem} onPress={() => toggleDrawer(false)}>
              <Ionicons name="home-outline" size={22} color="#334155" style={styles.drawerItemIcon} />
              <Text style={styles.drawerItemText}>Inicio</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => { toggleDrawer(false); navigation.navigate('MisData', { fromDrawer: true }); }}>
              <Ionicons name="person-outline" size={22} color="#334155" style={styles.drawerItemIcon} />
              <Text style={styles.drawerItemText}>Mis datos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => { toggleDrawer(false); navigation.navigate('CambiarNumero', { fromDrawer: true }); }}>
              <Ionicons name="call-outline" size={22} color="#334155" style={styles.drawerItemIcon} />
              <Text style={styles.drawerItemText}>Cambiar mi número</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => { toggleDrawer(false); navigation.navigate('CambiarClave', { fromDrawer: true }); }}>
              <Ionicons name="lock-closed-outline" size={22} color="#334155" style={styles.drawerItemIcon} />
              <Text style={styles.drawerItemText}>Cambiar clave</Text>
            </TouchableOpacity>
            <View style={styles.drawerDivider} />
            <TouchableOpacity style={styles.drawerItem} onPress={() => { toggleDrawer(false); navigation.navigate('Membresia', { fromDrawer: true }); }}>
              <Ionicons name="card-outline" size={22} color="#334155" style={styles.drawerItemIcon} />
              <Text style={styles.drawerItemText}>Membresía</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => { toggleDrawer(false); navigation.navigate('MisPuntos', { fromDrawer: true }); }}>
              <Ionicons name="star-outline" size={22} color="#334155" style={styles.drawerItemIcon} />
              <Text style={styles.drawerItemText}>Mis puntos WinTasks</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => { toggleDrawer(false); navigation.navigate('Invitar', { fromDrawer: true }); }}>
              <Ionicons name="gift-outline" size={22} color="#334155" style={styles.drawerItemIcon} />
              <Text style={styles.drawerItemText}>Invitar amig@</Text>
            </TouchableOpacity>
            <View style={styles.drawerDivider} />
            <TouchableOpacity style={styles.drawerItem} onPress={logout}>
              <Ionicons name="log-out-outline" size={22} color="#ef4444" style={styles.drawerItemIcon} />
              <Text style={[styles.drawerItemText, { color: '#ef4444' }]}>Cerrar sesión</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  orangeSection: {
    backgroundColor: '#FFA000',
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 32,
    elevation: 6,
    shadowColor: '#C06000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  customHeader: {
    paddingTop: 44,
    elevation: 8,
    shadowColor: '#C06000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#FEFCF8' },
  logoContainer: { alignItems: 'center', marginBottom: 10 },
  walletCard: {
    backgroundColor: '#C06000', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8,
    shadowColor: '#8B4513', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.5, shadowRadius: 10,
    elevation: 8,
  },
  walletLabel: { fontSize: 12, color: 'rgba(255,255,255,0.75)', textAlign: 'left' },
  walletAmount: { fontSize: 28, fontWeight: 'bold', color: '#FEFCF8' },
  fidelityCardOuter: {
    marginHorizontal: 20, marginTop: -19,
    borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
  },
  fidelityCard: {
    paddingVertical: 6, paddingHorizontal: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderRadius: 8,
  },
  fidelityLabel: { fontSize: 13, color: '#666' },
  fidelityWin: { fontWeight: '800', color: '#E05A47' },
  fidelityTasks: { fontWeight: '300', color: '#1F3C6A' },
  fidelityRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fidelityValue: { fontSize: 16, fontWeight: 'bold', color: '#E05A47' },
  scrollContent: { flexGrow: 1, overflow: 'visible' },
  bottomContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  actionsWrapper: { paddingTop: 12, paddingBottom: 4, paddingHorizontal: 20, marginVertical: 4 },
  actionsGrid: { flexDirection: 'row', justifyContent: 'space-evenly' },
  appButton: { alignItems: 'center', flex: 1 },
  appIcon: { width: 60, height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FF8C00' },
  appText: { fontSize: 12, color: Colors.text, fontWeight: '500', marginTop: 6, textAlign: 'center' },
  adBanner: { height: 145, borderRadius: 8, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
  adImageBg: { width: '100%', height: '100%', justifyContent: 'center' },
  adOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, padding: 14, justifyContent: 'center' },
  adContent: { zIndex: 2, flex: 1, justifyContent: 'center', paddingRight: 0 },
  adTitle: { fontSize: 16, fontWeight: '900', color: 'white', marginBottom: 6, letterSpacing: -0.5, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  adDesc: { fontSize: 13.5, color: 'rgba(255,255,255,0.9)', lineHeight: 18, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  pfmRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, marginBottom: 4, height: 42 },
  pfmButton: {
    flex: 0.31, height: '100%', paddingHorizontal: 12, borderRadius: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#e2e8f0',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  pfmButtonText: { color: '#1e293b', fontWeight: '800', fontSize: 13 },
  badge: { backgroundColor: '#C0392B', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, marginLeft: 4 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  secondaryAd: { height: 80, borderRadius: 8, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  secondaryAdImg: { width: '100%', height: '100%', borderRadius: 8 },
  secondaryAdTitle: { color: 'white', fontSize: 14, fontWeight: '800' },
  drawerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100 },
  drawer: { position: 'absolute', left: 0, top: 0, bottom: 0, width: width * 0.75, backgroundColor: 'white', zIndex: 101, elevation: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10 },
  drawerHeader: { padding: 25, backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', alignItems: 'center', gap: 15 },
  drawerAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E05A47', alignItems: 'center', justifyContent: 'center' },
  drawerAvatarText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  drawerUserName: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  drawerUserPhone: { fontSize: 13, color: '#64748b' },
  drawerMenu: { padding: 15, flex: 1 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 10, borderRadius: 12, marginBottom: 5 },
  drawerItemIcon: { marginRight: 15, width: 22, textAlign: 'center' },
  drawerItemText: { fontSize: 16, fontWeight: '600', color: '#334155' },
  drawerDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 10 },
});
