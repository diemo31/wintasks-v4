import React, { useState, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Colors } from '../theme';
import { useGlobal } from '../context/GlobalContext';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const formatExpiry = (iso) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

export default function TaskProgressScreen({ route, navigation }) {
  const { taskId, readonly } = route.params;
  const { currentUser, tasks, startTask, completeTask, saveTaskPhoto, taskPhotos, sendReminder } = useGlobal();
  const task = tasks.find(t => t.id === taskId);

  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [processing, setProcessing] = useState(false);
  const cameraRef = useRef(null);

  if (!task) {
    return (
      <View style={styles.screen}>
        <View style={styles.center}>
          <Text style={styles.empty}>Tarea no encontrada</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryBtnText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const getStatusLabel = () => {
    if (task.status === 'pending' && currentUser?.role === 'menor') {
      return task.redoneAt ? 'Rehacer' : 'Nueva';
    }
    const map = {
      pending: 'Pendiente', in_progress: 'En proceso', completed: 'Completada',
      approved: 'Aprobada', rejected: 'Rechazada', expired: 'Vencida',
    };
    return map[task.status] || 'Pendiente';
  };

  const handleStart = () => {
    const now = new Date();
    if (new Date(task.expiresAt) <= now) {
      Alert.alert('Tarea vencida', 'Esta tarea ya venció y no puede ser iniciada.');
      return;
    }
    startTask(task.id);
  };

  const handleFinish = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara para tomar la foto de prueba.');
        return;
      }
    }
    setShowCamera(true);
  };

  const handleCapture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        setProcessing(true);
        saveTaskPhoto(task.id, photo.uri);
        await completeTask(task.id, currentUser.id);
        setProcessing(false);
        setShowCamera(false);
        Alert.alert('¡Tarea completada!', 'Tu tarea fue enviada para aprobación.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } catch (e) {
        Alert.alert('Error', 'No se pudo tomar la foto');
        setProcessing(false);
      }
    }
  };

  if (showCamera) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back">
          <View style={styles.cameraOverlay}>
            <TouchableOpacity style={styles.cameraClose} onPress={() => setShowCamera(false)}>
              <Ionicons name="close" size={28} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.cameraGuide}>
              <Ionicons name="camera-outline" size={48} color="rgba(255,255,255,0.3)" />
              <Text style={styles.cameraHint}>Tomá la foto de tu tarea realizada</Text>
            </View>
            <TouchableOpacity style={styles.captureBtn} onPress={handleCapture} disabled={processing}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.cardAccent} />
          <View style={styles.cardBody}>
            <Text style={[styles.statusLabel, task.redoneAt && task.status === 'pending' && { color: '#CC7A00' }]}>{getStatusLabel()}</Text>
            <Text style={styles.title}>{task.title}</Text>
            {task.description ? <Text style={styles.desc}>{task.description}</Text> : null}
            <View style={styles.metaRow}>
              <Ionicons name="trophy" size={15} color={Colors.primary} />
              <Text style={styles.metaValue}>{task.tokenReward}</Text>
            </View>
            <View style={styles.datesBox}>
              <View style={styles.dateRow}>
                <Ionicons name="calendar-outline" size={13} color="#c4b5a5" />
                <Text style={styles.dateLabel}>Vence </Text>
                <Text style={styles.dateValue}>{formatExpiry(task.expiresAt)}</Text>
              </View>
              {task.completedAt && (
                <View style={styles.dateRow}>
                  <Ionicons name="checkmark-done" size={13} color="#5B9E4A" />
                  <Text style={styles.dateLabel}>Completada </Text>
                  <Text style={styles.dateValue}>{formatExpiry(task.completedAt)}</Text>
                </View>
              )}
              {task.approvedAt && (
                <View style={styles.dateRow}>
                  <Ionicons name="ribbon" size={13} color={Colors.primary} />
                  <Text style={styles.dateLabel}>Aprobada </Text>
                  <Text style={styles.dateValue}>{formatExpiry(task.approvedAt)}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {(task.status === 'completed' || task.status === 'approved') && taskPhotos[task.id] && (
          <View style={styles.photoSection}>
            <Text style={styles.photoLabel}>Foto de prueba</Text>
            <Image source={{ uri: taskPhotos[task.id] }} style={styles.photoPreview} />
          </View>
        )}

        {task.status === 'completed' && !readonly && (() => {
          const now = Date.now();
          const originMs = new Date(task.completedAt).getTime();
          const lastReminderMs = task.lastReminderAt ? new Date(task.lastReminderAt).getTime() : 0;
          const cooldown = 2 * 24 * 60 * 60 * 1000;
          const canRemind = now - (lastReminderMs || originMs) >= cooldown;

          return (
            <TouchableOpacity
              style={[styles.reminderBtn, !canRemind && styles.reminderBtnDisabled]}
              onPress={() => {
                sendReminder(task.id);
                Alert.alert('Recordatorio enviado', 'Le recordamos a tu tutor que revise esta tarea.');
              }}
              disabled={!canRemind}
            >
              <Ionicons name="notifications" size={18} color={canRemind ? '#FFF' : '#ccc'} />
              <Text style={[styles.reminderText, !canRemind && { color: '#ccc' }]}>Reclamar pendiente</Text>
            </TouchableOpacity>
          );
        })()}

        {task.status === 'approved' && currentUser?.role === 'adulto' && (
          <TouchableOpacity style={styles.reactivateBtn} onPress={() => navigation.navigate('CreateTask', {
            prefillTitle: task.title,
            prefillDescription: task.description,
            prefillTokenReward: task.tokenReward,
          })}>
            <Ionicons name="refresh" size={18} color={Colors.primary} />
            <Text style={styles.reactivateText}>Reactivar como plantilla</Text>
          </TouchableOpacity>
        )}

        {!readonly && (
          <View style={styles.actions}>
            {task.status === 'pending' && (
              <TouchableOpacity style={styles.primaryBtn} onPress={handleStart}>
                <Ionicons name="play" size={20} color="#FFF" />
                <Text style={styles.primaryBtnText}>Empezar tarea</Text>
              </TouchableOpacity>
            )}
            {task.status === 'in_progress' && (
              <TouchableOpacity style={styles.primaryBtn} onPress={handleFinish}>
                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                <Text style={styles.primaryBtnText}>Terminada</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F6F4' },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { color: '#ccc', fontStyle: 'italic', textAlign: 'center', marginTop: 40, fontSize: 16 },

  card: { flexDirection: 'row', backgroundColor: '#FFF8F3', borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: '#F5E6D6', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1, overflow: 'hidden' },
  cardAccent: { width: 3, backgroundColor: Colors.primary },
  cardBody: { flex: 1, padding: 16 },

  statusLabel: { fontSize: 12, fontWeight: '700', color: Colors.primary, marginBottom: 4 },
  title: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 6 },
  desc: { fontSize: 14, color: '#a8a29e', marginBottom: 12, lineHeight: 20 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  metaValue: { fontSize: 14, fontWeight: '700', color: Colors.primary },

  datesBox: { gap: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0ebe4' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateLabel: { fontSize: 13, color: '#8c8680' },
  dateValue: { fontSize: 13, color: '#1e293b', fontWeight: '600' },

  photoSection: { marginBottom: 16 },
  photoLabel: { fontSize: 13, fontWeight: '600', color: '#8c8680', marginBottom: 8 },
  photoPreview: { width: '100%', height: 200, borderRadius: 10, backgroundColor: '#f0f0f0' },

  actions: { gap: 12 },
  primaryBtn: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  primaryBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },

  reminderBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#5B9E4A', paddingVertical: 12, borderRadius: 10, marginBottom: 16 },
  reminderBtnDisabled: { backgroundColor: '#f0ebe4' },
  reminderText: { fontSize: 14, fontWeight: '600', color: '#FFF' },

  reactivateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FFF8F3', paddingVertical: 12, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: Colors.primary },
  reactivateText: { fontSize: 14, fontWeight: '600', color: Colors.primary },

  statusBox: { alignItems: 'center', padding: 24, gap: 10 },
  statusText: { fontSize: 15, color: '#c4b5a5', fontWeight: '500', textAlign: 'center' },

  cameraContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraOverlay: { flex: 1, justifyContent: 'space-between', paddingVertical: 60, alignItems: 'center' },
  cameraClose: { alignSelf: 'flex-start', marginLeft: 20 },
  cameraGuide: { alignItems: 'center', gap: 12 },
  cameraHint: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  captureBtn: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  captureInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF' },
});
