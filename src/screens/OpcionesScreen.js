import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme';

const OPCIONES = [
  { key: 'mejorprecio', label: 'Mejor precio', icon: 'pricetags', navigate: 'MejorPrecio' },
  { key: 'placeholder1', label: 'Listas', icon: 'list-outline', navigate: null },
  { key: 'placeholder2', label: 'Historial', icon: 'time-outline', navigate: null },
  { key: 'placeholder3', label: 'Estadísticas', icon: 'stats-chart-outline', navigate: null },
  { key: 'placeholder4', label: 'Recordatorios', icon: 'alarm-outline', navigate: null },
  { key: 'placeholder5', label: 'Compartir', icon: 'share-outline', navigate: null },
];

export default function OpcionesScreen({ navigation }) {
  return (
    <LinearGradient colors={['#FFFFFF', '#F2F2F2']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Más opciones</Text>
        <View style={styles.grid}>
          {OPCIONES.map((op) => (
            <TouchableOpacity
              key={op.key}
              style={styles.optionBox}
              onPress={() => op.navigate && navigation.navigate(op.navigate)}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIcon, op.navigate ? styles.optionIconActive : styles.optionIconDisabled]}>
                <Ionicons name={op.icon} size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.optionText}>{op.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scroll: { padding: 24, paddingTop: 40 },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.text, textAlign: 'center', marginBottom: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  optionBox: { width: '33.333%', alignItems: 'center', marginBottom: 28 },
  optionIcon: { width: 60, height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  optionIconActive: { backgroundColor: '#FF8C00' },
  optionIconDisabled: { backgroundColor: Colors.disabled },
  optionText: { fontSize: 13, color: Colors.text, fontWeight: '500', marginTop: 8, textAlign: 'center' },
});
