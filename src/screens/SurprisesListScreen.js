import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme';
import { useGlobal } from '../context/GlobalContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STATUS_MAP = {
  sent: { label: 'Sin abrir', icon: 'mail-unread', color: '#D4721A' },
  opened: { label: 'Abierta', icon: 'eye', color: '#3A7BD5' },
  claimed: { label: 'Canjeada', icon: 'checkmark-circle', color: '#5B9E4A' },
};

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export default function SurprisesListScreen({ navigation }) {
  const { currentUser, getSurprisesForChild } = useGlobal();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.navigate('DashboardMenor', { openDrawer: true })} style={{ paddingLeft: insets.left + 12 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, insets]);
  const surprises = getSurprisesForChild(currentUser.id, currentUser.tutorId);

  const personal = surprises.filter(s => s.childId === currentUser.id);
  const group = surprises.filter(s => s.forAll);

  const renderSurprise = (s) => {
    const info = STATUS_MAP[s.status] || STATUS_MAP.sent;
    const isExpired = s.expirationDate && new Date(s.expirationDate) < new Date();
    return (
      <TouchableOpacity
        key={s.id}
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('SorpresaReveal', { surprise: s })}
      >
        <View style={styles.cardLeft}>
          <View style={[styles.iconCircle, { backgroundColor: s.bgColor || '#2D1B69' }]}>
            <Ionicons name={s.icon || 'gift'} size={22} color="#FFD700" />
          </View>
        </View>
        <View style={styles.cardCenter}>
          <Text style={styles.cardTitle} numberOfLines={1}>{s.title}</Text>
          {s.description ? <Text style={styles.cardDesc} numberOfLines={1}>{s.description}</Text> : null}
          <View style={styles.cardMeta}>
            <Ionicons name="diamond" size={12} color={Colors.primary} />
            <Text style={styles.cardTokens}>{s.tokenReward}</Text>
            {s.expirationDate && (
              <>
                <Text style={styles.metaDot}>·</Text>
                <Text style={[styles.cardExp, isExpired && styles.cardExpired]}>
                  {isExpired ? 'Vencida' : `Hasta ${formatDate(s.expirationDate)}`}
                </Text>
              </>
            )}
          </View>
        </View>
        <View style={styles.cardRight}>
          <Ionicons name={info.icon} size={18} color={info.color} />
          <Text style={[styles.cardStatus, { color: info.color }]}>{info.label}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.container}>
        {personal.length === 0 && group.length === 0 ? (
          <Text style={styles.empty}>No tenés sorpresas todavía</Text>
        ) : (
          <>
            {personal.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Para vos</Text>
                {personal.map(renderSurprise)}
              </View>
            )}
            {group.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Para todos</Text>
                {group.map(renderSurprise)}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F0EB' },
  container: { flex: 1 },
  empty: { textAlign: 'center', color: '#ccc', fontStyle: 'italic', marginTop: 60, fontSize: 15 },

  section: { padding: 20, paddingBottom: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b', marginBottom: 12, marginTop: 4 },

  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14,
    padding: 12, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  cardLeft: { marginRight: 12 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardCenter: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  cardDesc: { fontSize: 12, color: '#a8a29e', marginTop: 1 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  cardTokens: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  metaDot: { fontSize: 12, color: '#ccc' },
  cardExp: { fontSize: 11, color: '#888' },
  cardExpired: { color: '#dc2626', fontWeight: '600' },
  cardRight: { alignItems: 'center', marginLeft: 8, gap: 2 },
  cardStatus: { fontSize: 10, fontWeight: '600' },
});
