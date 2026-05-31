import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme';
import { useGlobal } from '../context/GlobalContext';
import PearlBackground from '../components/PearlBackground';

export default function DashboardMenorScreen({ navigation }) {
  const { currentUser, getUserTokens, getTutorName, logout } = useGlobal();

  return (
    <PearlBackground>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>¡Hola, {currentUser?.alias}!</Text>
            <Text style={styles.tutorText}>Tutor: {getTutorName(currentUser?.tutorId)}</Text>
          </View>
          <TouchableOpacity onPress={logout}>
            <Ionicons name="log-out-outline" size={24} color={Colors.textLight} />
          </TouchableOpacity>
        </View>

        <View style={styles.tokenCard}>
          <Text style={styles.tokenLabel}>Tus tokens</Text>
          <Text style={styles.tokenAmount}>{getUserTokens(currentUser?.id)}</Text>
        </View>

        <Text style={styles.sectionTitle}>Tareas pendientes</Text>
        <View style={styles.emptyCard}>
          <Ionicons name="checkmark-done" size={32} color={Colors.disabled} />
          <Text style={styles.emptyText}>No tenés tareas pendientes</Text>
        </View>

        <Text style={styles.sectionTitle}>Acciones</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.appButton} onPress={() => navigation.navigate('TareasMenor')}>
              <View style={styles.appIcon}>
                <Ionicons name="list" size={32} color={Colors.primary} />
              </View>
              <Text style={styles.appText}>Tareas</Text>
            </TouchableOpacity>
          <TouchableOpacity style={styles.appButton}>
            <View style={styles.appIcon}>
              <Ionicons name="gift" size={32} color={Colors.secondary} />
            </View>
            <Text style={styles.appText}>Premios</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.appButton}>
            <View style={styles.appIcon}>
              <Ionicons name="swap-horizontal" size={32} color={Colors.accent} />
            </View>
            <Text style={styles.appText}>Transferir</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.appButton}>
            <View style={styles.appIcon}>
              <Ionicons name="stats-chart" size={32} color={Colors.text} />
            </View>
            <Text style={styles.appText}>Historial</Text>
          </TouchableOpacity>
        </View>
      </View>
    </PearlBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  greeting: { fontSize: 22, fontWeight: 'bold', color: Colors.text },
  tutorText: { fontSize: 14, color: Colors.textLight, marginTop: 2 },
  tokenCard: {
    backgroundColor: Colors.primary, padding: 32, borderRadius: 24, alignItems: 'center',
    marginBottom: 24, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  tokenLabel: { fontSize: 16, color: Colors.white, opacity: 0.9 },
  tokenAmount: { fontSize: 52, fontWeight: 'bold', color: Colors.white, marginTop: 4, letterSpacing: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: Colors.text, marginBottom: 12, marginTop: 4 },
  emptyCard: {
    backgroundColor: Colors.white, padding: 24, borderRadius: 20, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.surface, marginBottom: 24, gap: 8,
  },
  emptyText: { fontSize: 14, color: Colors.disabled },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center' },
  appButton: { alignItems: 'center', width: '20%', minWidth: 72 },
  appIcon: { width: 60, height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.white },
  appText: { fontSize: 12, color: Colors.text, fontWeight: '500', marginTop: 6, textAlign: 'center' },
});
