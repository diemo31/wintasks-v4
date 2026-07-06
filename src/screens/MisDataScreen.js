import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme';
import { useGlobal } from '../context/GlobalContext';

function InfoRow({ label, value, iconName }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.iconContainer}>
        <Ionicons name={iconName} size={28} color="#E05A47" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
}

export default function MisDataScreen({ navigation, route }) {
  const { currentUser } = useGlobal();
  const u = currentUser || {};

  useEffect(() => {
    if (!route.params?.fromDrawer) return;
    const target = currentUser?.role === 'menor' ? 'DashboardMenor' : 'DashboardAdulto';
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (e.data.action.type === 'GO_BACK' || e.data.action.type === 'POP') {
        e.preventDefault();
        navigation.navigate(target, { openDrawer: true });
      }
    });
    return unsub;
  }, [navigation, route.params?.fromDrawer, currentUser?.role]);

  return (
    <LinearGradient colors={['#FFFFFF', '#FFD699', '#C06000']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Datos personales</Text>
          <Text style={styles.sectionSubtitle}>Tus datos no pueden modificarse por seguridad.</Text>

          <InfoRow label="Nombre" value={u.nombre || ''} iconName="person-outline" />
          <InfoRow label="Apellido" value={u.apellido || ''} iconName="person-outline" />
          <InfoRow label="Correo electrónico" value={u.email || ''} iconName="mail-outline" />
          <InfoRow label="Usuario" value={`@${u.alias || ''}`} iconName="at-outline" />
          <InfoRow label="Teléfono" value={u.phone || ''} iconName="call-outline" />
          <InfoRow label="Fecha de nacimiento" value={u.fechaNac || ''} iconName="calendar-outline" />
          <InfoRow label="Edad" value={u.age ? `${u.age} años` : ''} iconName="hourglass-outline" />
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingTop: 32 },
  card: {
    backgroundColor: Colors.white, borderRadius: 24, padding: 20,
    elevation: 4, shadowColor: '#1e293b', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 10,
  },
  sectionTitle: {
    fontSize: 17, fontWeight: '900', color: '#E05A47', marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 11.2, color: '#64748b', marginBottom: 20, fontWeight: '400',
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fefcf8', borderRadius: 16, padding: 4, marginBottom: 4,
  },
  iconContainer: {
    width: 48, height: 48, backgroundColor: '#fff1e6', borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginRight: 15,
  },
  textContainer: { flex: 1, justifyContent: 'center' },
  label: {
    fontSize: 13, color: '#1e293b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.3,
  },
  value: {
    fontSize: 15, fontWeight: '400', color: '#64748b', marginTop: 1,
  },
});
