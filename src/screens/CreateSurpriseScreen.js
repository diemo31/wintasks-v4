import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, Alert, Modal, Dimensions, ActivityIndicator, PanResponder } from 'react-native';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLOR_SIZE = Math.floor((SCREEN_WIDTH - 40 - 6 * 7) / 7);
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync } from 'expo-image-manipulator';

import { Colors } from '../theme';
import { useGlobal } from '../context/GlobalContext';


const ICONS = [
  { icon: 'gift', label: 'Regalo' },
  { icon: 'airplane', label: 'Viaje' },
  { icon: 'game-controller', label: 'Juegos' },
  { icon: 'fast-food', label: 'Comida' },
  { icon: 'musical-notes', label: 'Música' },
  { icon: 'football', label: 'Deporte' },
  { icon: 'color-palette', label: 'Arte' },
  { icon: 'rocket', label: 'Aventura' },
];

const COLORS = [
  { hex: '#2D1B69', label: 'Púrpura' },
  { hex: '#7D3C98', label: 'Violeta' },
  { hex: '#C0392B', label: 'Rojo' },
  { hex: '#1B6B2D', label: 'Verde' },
  { hex: '#B85C3A', label: 'Naranja' },
  { hex: '#1A5276', label: 'Azul' },
  { hex: '#FADBD8', label: 'Rosa pastel' },
  { hex: '#D7BDE2', label: 'Lila pastel' },
  { hex: '#A9CCE3', label: 'Celeste pastel' },
  { hex: '#A3E4D7', label: 'Menta pastel' },
  { hex: '#F9E79F', label: 'Amarillo pastel' },
  { hex: '#F5CBA7', label: 'Durazno pastel' },
  { hex: '#E8DAEF', label: 'Orquídea pastel' },
  { hex: '#D5F5E3', label: 'Verde agua pastel' },
];

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const parseDate = (str) => {
  const parts = str.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d).toISOString();
};

const autoFormatDate = (text) => {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  let formatted = '';
  for (let i = 0; i < digits.length; i++) {
    if (i === 2 || i === 4) formatted += '/';
    formatted += digits[i];
  }
  return formatted;
};

function CropModal({ visible, imageUri, onConfirm, onCancel }) {
  const [imgSize, setImgSize] = useState(null);
  const dims = {
    w: SCREEN_WIDTH,
    h: imgSize ? Math.min(SCREEN_HEIGHT * 0.6, SCREEN_WIDTH * imgSize.height / imgSize.width) : SCREEN_WIDTH * 0.75,
  };

  const initBox = { x: dims.w * 0.08, y: dims.h * 0.08, w: dims.w * 0.84, h: dims.h * 0.84 };
  const [box, setBox] = useState(initBox);
  const boxRef = useRef(box);
  const dimsRef = useRef(dims);
  const startRef = useRef(null);
  const [cropping, setCropping] = useState(false);

  boxRef.current = box;
  dimsRef.current = dims;

  React.useEffect(() => {
    if (visible && imageUri) {
      Image.getSize(imageUri, (w, h) => setImgSize({ width: w, height: h }), () => {});
      setBox(initBox);
    }
  }, [visible, imageUri]);

  const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

  const movePan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { startRef.current = { ...boxRef.current }; },
    onPanResponderMove: (_, gs) => {
      const s = startRef.current;
      const d = dimsRef.current;
      if (!s) return;
      setBox({ ...s, x: clamp(s.x + gs.dx, 0, d.w - s.w), y: clamp(s.y + gs.dy, 0, d.h - s.h) });
    },
  }));

  const resizePan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { startRef.current = { ...boxRef.current }; },
    onPanResponderMove: (_, gs) => {
      const s = startRef.current;
      const d = dimsRef.current;
      if (!s) return;
      const nw = clamp(s.w + gs.dx, 60, d.w);
      const nh = clamp(s.h + gs.dy, 60, d.h);
      setBox({ x: clamp(s.x, 0, d.w - nw), y: clamp(s.y, 0, d.h - nh), w: nw, h: nh });
    },
  }));

  const handleDone = async () => {
    if (!imgSize || !imageUri) return;
    setCropping(true);
    try {
      const scX = imgSize.width / dims.w;
      const scY = imgSize.height / dims.h;
      const result = await manipulateAsync(imageUri, [{ crop: { originX: Math.round(box.x * scX), originY: Math.round(box.y * scY), width: Math.round(box.w * scX), height: Math.round(box.h * scY) } }], { compress: 0.7 });
      onConfirm(result.uri);
    } catch (e) {
      Alert.alert('Error', 'No se pudo recortar la imagen.');
      setCropping(false);
    }
  };

  const overlayViews = imgSize ? (
    <>
      <View style={[cropStyles.overlay, { top: 0, left: 0, right: 0, height: box.y }]} />
      <View style={[cropStyles.overlay, { top: box.y, left: 0, width: box.x, height: box.h }]} />
      <View style={[cropStyles.overlay, { top: box.y, left: box.x + box.w, right: 0, height: box.h }]} />
      <View style={[cropStyles.overlay, { top: box.y + box.h, left: 0, right: 0, bottom: 0 }]} />
    </>
  ) : null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={cropStyles.container}>
        <View style={cropStyles.header}>
          <TouchableOpacity onPress={onCancel}>
            <Text style={cropStyles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={cropStyles.headerTitle}>Recortar imagen</Text>
          <TouchableOpacity onPress={handleDone}>
            <Text style={cropStyles.doneText}>Listo</Text>
          </TouchableOpacity>
        </View>

        <View style={cropStyles.imageArea}>
          {imgSize ? (
            <View style={{ width: dims.w, height: dims.h }}>
              <Image source={{ uri: imageUri }} style={{ width: dims.w, height: dims.h }} resizeMode="cover" />
              {overlayViews}
              <View style={[cropStyles.cropBox, { left: box.x, top: box.y, width: box.w, height: box.h }]} {...movePan.current.panHandlers}>
                <View style={cropStyles.cornerTL} />
                <View style={cropStyles.cornerTR} />
                <View style={cropStyles.cornerBL} />
                <View style={[cropStyles.cornerBR, { position: 'absolute', bottom: -6, right: -6 }]} {...resizePan.current.panHandlers}>
                  <Ionicons name="resize" size={18} color="#FFD700" />
                </View>
              </View>
            </View>
          ) : (
            <ActivityIndicator size="large" color={Colors.primary} />
          )}
          {cropping ? (
            <ActivityIndicator size="large" color={Colors.primary} style={cropStyles.spinner} />
          ) : null}
        </View>

        <View style={cropStyles.hintArea}>
          <Text style={cropStyles.hintText}>Arrastrá el cuadro para ajustar el recorte</Text>
        </View>
      </View>
    </Modal>
  );
}

const cropStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 16 },
  cancelText: { fontSize: 16, color: '#FFF', opacity: 0.7 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFF' },
  doneText: { fontSize: 16, color: Colors.primary, fontWeight: '700' },
  imageArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  spinner: { position: 'absolute' },
  overlay: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.55)' },
  cropBox: { position: 'absolute', borderWidth: 2, borderColor: '#FFF', borderRadius: 2 },
  cornerTL: { position: 'absolute', top: -1, left: -1, width: 20, height: 20, borderTopWidth: 4, borderLeftWidth: 4, borderColor: '#FFD700' },
  cornerTR: { position: 'absolute', top: -1, right: -1, width: 20, height: 20, borderTopWidth: 4, borderRightWidth: 4, borderColor: '#FFD700' },
  cornerBL: { position: 'absolute', bottom: -1, left: -1, width: 20, height: 20, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: '#FFD700' },
  cornerBR: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#2D1B69', alignItems: 'center', justifyContent: 'center' },
  hintArea: { paddingBottom: 40, alignItems: 'center' },
  hintText: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
});

export default function CreateSurpriseScreen({ navigation }) {
  const { currentUser, getChildren, createAndSendSurprise, getSurprisesForAdult } = useGlobal();
  const children = getChildren(currentUser.id);
  const surprises = getSurprisesForAdult(currentUser.id);
  const sent = surprises.filter(s => s.status !== 'pending');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [childId, setChildId] = useState('');
  const [forAll, setForAll] = useState(false);
  const [tokenReward, setTokenReward] = useState('');
  const [expDate, setExpDate] = useState('');
  const [icon, setIcon] = useState('gift');
  const [bgColor, setBgColor] = useState('#2D1B69');
  const [bgImageUri, setBgImageUri] = useState(null);
  const [iconImageUri, setIconImageUri] = useState(null);

  const [cropTarget, setCropTarget] = useState(null);
  const [cropUri, setCropUri] = useState(null);

  const isValid = title.trim() && (forAll || childId) && tokenReward && Number(tokenReward) > 0;
  const getChildName = (id) => children.find(c => c.id === id)?.alias || '—';

  const pickAndCrop = async (target) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setCropTarget(target);
      setCropUri(result.assets[0].uri);
    }
  };

  const handleCropDone = (uri) => {
    if (cropTarget === 'bg') setBgImageUri(uri);
    else if (cropTarget === 'icon') setIconImageUri(uri);
    setCropUri(null);
    setCropTarget(null);
  };

  const handleCropCancel = () => {
    setCropUri(null);
    setCropTarget(null);
  };

  const handleSend = () => {
    if (!isValid) return;
    createAndSendSurprise({
      title: title.trim(), description: description.trim(),
      childId: forAll ? currentUser.id : childId,
      tokenReward: Number(tokenReward), createdBy: currentUser.id,
      icon: icon || 'gift', bgColor, expirationDate: parseDate(expDate),
      bgImageUri: bgImageUri || null,
      iconImageUri: iconImageUri || null,
      forAll,
    });
    setTitle(''); setDescription(''); setChildId(''); setForAll(false); setTokenReward('');
    setExpDate(''); setIcon('gift'); setBgColor('#2D1B69');
    setBgImageUri(null); setIconImageUri(null);
  };

  const preview = {
    icon: icon || 'gift', bgColor,
    title: title.trim() || 'Nombre de la sorpresa',
    description: description.trim(),
    tokenReward: Number(tokenReward) || 0,
    expDate: parseDate(expDate),
    bgImageUri, iconImageUri,
  };

  const PreviewCard = ({ data, small }) => (
    <View style={[styles.previewCard, small && styles.previewCardSmall, { backgroundColor: data.bgColor }]}>
      {data.bgImageUri ? (
        <Image source={{ uri: data.bgImageUri }} style={[StyleSheet.absoluteFill, { borderRadius: small ? 12 : 20 }]} />
      ) : (
        <LinearGradient colors={[data.bgColor, '#0D0D2B']} style={[StyleSheet.absoluteFill, { borderRadius: small ? 12 : 20 }]} />
      )}
      <View style={[styles.previewOverlay, small && styles.previewOverlaySmall]}>
        {data.iconImageUri ? (
          <Image source={{ uri: data.iconImageUri }} style={small ? styles.previewImageSmall : styles.previewImage} />
        ) : (
          <Ionicons name={data.icon} size={small ? 28 : 48} color="#FFD700" />
        )}
        <Text style={[styles.previewTitle, small && { fontSize: 13 }]} numberOfLines={2}>{data.title}</Text>
        {!small && data.description ? <Text style={styles.previewDesc} numberOfLines={2}>{data.description}</Text> : null}
        <View style={[styles.previewPrice, small && { paddingVertical: 3, paddingHorizontal: 10 }]}>
          <Ionicons name="diamond" size={small ? 14 : 18} color="#FFD700" />
          <Text style={[styles.previewPriceText, small && { fontSize: 13 }]}>{data.tokenReward}</Text>
        </View>
        {data.expDate && !small ? (
          <Text style={styles.previewExp}>Vence {formatDate(data.expDate)}</Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={styles.wrapper}>
      <CropModal visible={!!cropUri} imageUri={cropUri} onConfirm={handleCropDone} onCancel={handleCropCancel} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <Ionicons name="sparkles" size={22} color={Colors.white} />
          </View>
          <Text style={styles.title}>Crear sorpresa</Text>
        </View>

        <Text style={styles.label}>Nombre de la sorpresa</Text>
        <TextInput style={styles.input} placeholder="Ej: Viaje a Disney" value={title} onChangeText={setTitle} placeholderTextColor="#BBB" />

        <Text style={styles.label}>Descripción</Text>
        <TextInput style={[styles.input, styles.textArea]} placeholder="Contale de qué se trata..." value={description} onChangeText={setDescription} multiline placeholderTextColor="#BBB" />

        <Text style={styles.label}>Para</Text>
        <TouchableOpacity style={[styles.chip, forAll && styles.chipActive, { alignSelf: 'flex-start', marginBottom: 8 }]} onPress={() => { setForAll(!forAll); if (!forAll) setChildId(''); }}>
          <Text style={[styles.chipText, forAll && styles.chipTextActive]}>Todos los chicos</Text>
        </TouchableOpacity>
        {!forAll && (children.length === 0 ? (
          <Text style={styles.noChildren}>No tenés hijos vinculados</Text>
        ) : (
          <View style={styles.chipRow}>
            {children.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.chip, childId === c.id && styles.chipActive]}
                onPress={() => setChildId(c.id)}
              >
                <Text style={[styles.chipText, childId === c.id && styles.chipTextActive]}>{c.alias}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.label}>Costo en tokens</Text>
            <TextInput style={styles.input} placeholder="Ej: 50" value={tokenReward} onChangeText={setTokenReward} keyboardType="number-pad" placeholderTextColor="#BBB" />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.label}>Vence el</Text>
            <TextInput style={styles.input} placeholder="DD/MM/AAAA" value={expDate} onChangeText={t => setExpDate(autoFormatDate(t))} keyboardType="number-pad" placeholderTextColor="#BBB" />
          </View>
        </View>

        <View style={styles.designCard}>
          <View style={styles.designHeader}>
            <Ionicons name="color-palette" size={18} color={Colors.primary} />
            <Text style={styles.designTitle}>Diseño de la sorpresa</Text>
          </View>

          <Text style={styles.sectionLabel}>Fondo</Text>
          {bgImageUri ? (
            <View style={styles.imageRow}>
              <View style={styles.bgThumbWrap}>
                <Image source={{ uri: bgImageUri }} style={styles.bgThumb} />
                <TouchableOpacity style={styles.removeBtn} onPress={() => setBgImageUri(null)}>
                  <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => pickAndCrop('bg')}>
                <Text style={styles.changeText}>Cambiar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.colorRow}>
                {COLORS.map(c => (
                  <TouchableOpacity key={c.hex} style={[styles.colorBtn, { backgroundColor: c.hex }, bgColor === c.hex && styles.colorBtnActive]} onPress={() => setBgColor(c.hex)} />
                ))}
              </View>
              <TouchableOpacity style={styles.imageOptionBtn} onPress={() => pickAndCrop('bg')}>
                <Ionicons name="image-outline" size={20} color={Colors.primary} />
                <Text style={styles.imageOptionText}>Usar imagen como fondo</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.sectionDivider} />
          <Text style={styles.sectionLabel}>Icono</Text>
          {iconImageUri ? (
            <View style={styles.imageRow}>
              <View style={styles.bgThumbWrap}>
                <Image source={{ uri: iconImageUri }} style={styles.iconThumb} />
                <TouchableOpacity style={styles.removeBtn} onPress={() => setIconImageUri(null)}>
                  <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => pickAndCrop('icon')}>
                <Text style={styles.changeText}>Cambiar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.iconGrid}>
                {ICONS.map(item => (
                  <TouchableOpacity key={item.icon} style={[styles.iconBtn, icon === item.icon && styles.iconBtnActive]} onPress={() => { setIcon(item.icon); setIconImageUri(null); }}>
                    <Ionicons name={item.icon} size={24} color={icon === item.icon ? '#FFF' : Colors.text} />
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.imageOptionBtn} onPress={() => pickAndCrop('icon')}>
                <Ionicons name="image-outline" size={20} color={Colors.primary} />
                <Text style={styles.imageOptionText}>Usar imagen como icono</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.sectionDivider} />
          <Text style={styles.sectionLabel}>Vista previa</Text>
          <View style={styles.previewWrap}>
            <PreviewCard data={preview} />
          </View>
        </View>

        <TouchableOpacity style={[styles.sendBtn, !isValid && styles.sendBtnDisabled]} onPress={handleSend}>
          <Ionicons name="send" size={20} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.sendBtnText}>Crear y enviar sorpresa</Text>
        </TouchableOpacity>

        {sent.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Enviadas ({sent.length})</Text>
            {sent.map(s => (
              <View key={s.id} style={styles.sentCard}>
                <PreviewCard data={{
                  icon: s.icon || 'gift', bgColor: s.bgColor || '#2D1B69',
                  title: s.title, tokenReward: s.tokenReward, expDate: s.expirationDate,
                  bgImageUri: s.bgImageUri || null,
                  iconImageUri: s.iconImageUri || null,
                }} small />
                <View style={styles.sentInfo}>
                  <Text style={styles.sentChild}>{getChildName(s.childId)}</Text>
                  <Ionicons name={
                    s.status === 'claimed' ? 'checkmark-circle' :
                    s.status === 'opened' ? 'eye' : 'paper-plane'
                  } size={20} color={
                    s.status === 'claimed' ? Colors.success :
                    s.status === 'opened' ? Colors.primary : Colors.textLight
                  } />
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#FFF' },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  headerIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: Colors.white, borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#E8E0D6' },
  textArea: { height: 80, textAlignVertical: 'top' },
  noChildren: { color: '#999', fontStyle: 'italic' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, backgroundColor: Colors.white, borderWidth: 1, borderColor: '#E8E0D6' },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 14, color: Colors.text },
  chipTextActive: { color: '#FFF', fontWeight: '600' },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  designCard: {
    backgroundColor: Colors.white, borderRadius: 20, padding: 20, marginTop: 24,
    borderWidth: 1, borderColor: '#E8E0D6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  designHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0EDEA' },
  designTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  sectionDivider: { height: 1, backgroundColor: '#F0EDEA', marginVertical: 16 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  colorBtn: { width: COLOR_SIZE, height: COLOR_SIZE, borderRadius: COLOR_SIZE / 2, borderWidth: 2, borderColor: 'transparent' },
  colorBtnActive: { borderColor: Colors.primary },
  imageOptionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: Colors.primary, borderStyle: 'dashed', backgroundColor: '#FFF8F0', alignSelf: 'flex-start' },
  imageOptionText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  imageRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bgThumbWrap: { position: 'relative' },
  bgThumb: { width: 80, height: 56, borderRadius: 10 },
  iconThumb: { width: 56, height: 56, borderRadius: 14 },
  removeBtn: { position: 'absolute', top: -8, right: -8 },
  changeText: { fontSize: 14, color: Colors.primary, fontWeight: '500' },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  iconBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#F8F6F3', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E8E0D6' },
  iconBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  previewWrap: { alignItems: 'center', marginTop: 4 },
  previewCard: { width: 200, borderRadius: 20, alignItems: 'center', overflow: 'hidden' },
  previewCardSmall: { width: 80, borderRadius: 12 },
  previewOverlay: { padding: 20, alignItems: 'center', gap: 8, width: '100%' },
  previewOverlaySmall: { padding: 8, gap: 3 },
  previewImage: { width: 60, height: 60, borderRadius: 30 },
  previewImageSmall: { width: 28, height: 28, borderRadius: 14 },
  previewTitle: { fontSize: 16, fontWeight: '700', color: '#FFF', textAlign: 'center' },
  previewDesc: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  previewPrice: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,215,0,0.15)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, gap: 6 },
  previewPriceText: { fontSize: 20, fontWeight: '800', color: '#FFD700' },
  previewExp: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  sendBtn: { flexDirection: 'row', backgroundColor: Colors.primary, padding: 18, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 24, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginTop: 28, marginBottom: 12 },
  sentCard: {
    flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 14, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: '#E8E0D6', marginBottom: 10, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  sentInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sentChild: { fontSize: 12, color: Colors.textLight, fontWeight: '500' },
});
