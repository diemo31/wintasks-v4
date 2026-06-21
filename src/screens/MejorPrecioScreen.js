import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, Linking, Dimensions, ActivityIndicator } from 'react-native';
import PearlBackground from '../components/PearlBackground';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Colors } from '../theme';
import usePreciosClaros from '../hooks/usePreciosClaros';

const { width } = Dimensions.get('window');

const DISCLAIMER = 'Los precios pueden no estar actualizados y no incluyen promociones puntuales de cada punto de venta. WinTasks no se responsabiliza por la precisión de los datos.';

export default function MejorPrecioScreen({ navigation }) {
  const [location, setLocation] = useState(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const { loading, error, product, prices, scanBarcode, reset } = usePreciosClaros();
  const errorTimerRef = useRef(null);
  const locationRequested = useRef(false);

  useEffect(() => {
    requestUserLocation();
  }, []);

  useEffect(() => {
    if (error) {
      errorTimerRef.current = setTimeout(() => reset(), 3000);
    }
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, [error]);

  const requestUserLocation = async () => {
    if (locationRequested.current) return;
    locationRequested.current = true;
    try {
      setLocationLoading(true);
      const { status: preStatus } = await Location.getForegroundPermissionsAsync();
      if (preStatus === 'granted') {
        setLocationDenied(false);
        try {
          const loc = await Promise.race([
            Location.getCurrentPositionAsync({}),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
          ]);
          setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        } catch {
          setLocation(null);
        }
        setLocationLoading(false);
        return;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationDenied(false);
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      } else {
        setLocationDenied(true);
        Alert.alert('Ubicación requerida', 'Para buscar precios necesitamos acceso a tu ubicación. Podés habilitarlo desde Configuración.', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir configuración', onPress: () => Linking.openSettings() },
        ]);
      }
    } catch {
      setLocationDenied(true);
    }
    setLocationLoading(false);
  };

  const handleBarcodeScanned = ({ data }) => {
    if (scanned) return;
    setScanned(true);
    setIsScanning(false);
    if (location) scanBarcode(data, location.latitude, location.longitude);
  };

  const startScanning = async () => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert('Cámara requerida', 'Necesitamos acceso a la cámara para escanear códigos de barras.');
        return;
      }
    }
    reset();
    setScanned(false);
    setIsScanning(true);
  };

  const formatPrice = (num) => `$${Number(num).toFixed(2)}`;
  const formatDist = (km) => km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;

  const Disclaimer = () => (
    <View style={styles.disclaimer}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <Ionicons name="information-circle-outline" size={16} color={Colors.textLight} style={{ marginTop: 2, marginRight: 6 }} />
        <Text style={styles.disclaimerText}>{DISCLAIMER}</Text>
      </View>
      <Text style={styles.attribution}>Datos: Precios Claros – SEPA, Secretaría de Comercio</Text>
    </View>
  );

  if (isScanning) {
    return (
      <View style={StyleSheet.absoluteFill}>
        <CameraView
          style={StyleSheet.absoluteFill}
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        />
        <TouchableOpacity style={styles.scanBackBtn} onPress={() => setIsScanning(false)}>
          <Ionicons name="close" size={28} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.scanOverlay}>
          <View style={styles.scanFrame} />
          <Text style={styles.scanHint}>Colocá el código de barras en el centro</Text>
        </View>
      </View>
    );
  }

  return (
    <PearlBackground>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.headerIconCircle}>
            <Ionicons name="pricetags" size={22} color={Colors.white} />
          </View>
          <Text style={styles.title}>Mejor precio</Text>
        </View>

        <View style={styles.body}>

          {locationLoading && (
            <View style={styles.stateWrap}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.stateDesc}>Solicitando ubicación...</Text>
            </View>
          )}

          {!locationLoading && locationDenied && (
            <View style={styles.stateWrap}>
              <Ionicons name="close-circle" size={56} color={Colors.error} />
              <Text style={styles.stateTitle}>Ubicación no disponible</Text>
              <Text style={styles.stateDesc}>
                Sin acceso a tu ubicación no podemos mostrarte precios de comercios cercanos.
              </Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => Linking.openSettings()}>
                <Ionicons name="settings-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.primaryBtnText}>Abrir configuración</Text>
              </TouchableOpacity>
            </View>
          )}

          {!locationLoading && !locationDenied && loading && (
            <View style={styles.stateWrap}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.stateDesc}>Buscando precios en comercios cercanos...</Text>
            </View>
          )}

          {!locationLoading && !locationDenied && !loading && error && (
            <View style={styles.stateWrap}>
              <Ionicons name="alert-circle" size={56} color={Colors.error} />
              <Text style={styles.stateTitle}>Sin resultados</Text>
              <Text style={styles.stateDesc}>{error}</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={startScanning}>
                <Ionicons name="scan-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.primaryBtnText}>Escanear otro</Text>
              </TouchableOpacity>
            </View>
          )}

          {!locationLoading && !locationDenied && !loading && !error && !product && (
            <View style={styles.stateWrap}>
              <Ionicons name="scan-outline" size={56} color={Colors.primary} />
              <Text style={styles.stateTitle}>Escaneá un producto</Text>
              <Text style={styles.stateDesc}>
                Tocá el botón y apuntá la cámara al código de barras para ver precios en supermercados cercanos.
              </Text>
              {!location && (
                <Text style={styles.locationMissingText}>
                  No se pudo obtener tu ubicación. Asegurate de tener los servicios de ubicación activados.
                </Text>
              )}
              <TouchableOpacity style={styles.primaryBtn} onPress={startScanning}>
                <Ionicons name="camera-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.primaryBtnText}>Escanear código</Text>
              </TouchableOpacity>
            </View>
          )}

          {!locationLoading && !locationDenied && !loading && product && (
            <FlatList
              data={prices}
              keyExtractor={(_, i) => String(i)}
              style={styles.priceList}
              ListHeaderComponent={
                <View style={styles.productCard}>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>{product.nombre}</Text>
                    {product.marca ? <Text style={styles.productMeta}>{product.marca}</Text> : null}
                  </View>
                  <TouchableOpacity style={styles.rescanBtn} onPress={startScanning}>
                    <Ionicons name="scan-outline" size={22} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              }
              ListFooterComponent={Disclaimer}
              renderItem={({ item, index }) => (
                <View style={[styles.priceRow, index === 0 && styles.priceRowFirst]}>
                  <View style={styles.rankCol}>
                    <View style={[styles.rankBadge, index === 0 && styles.rankBadgeFirst]}>
                      <Text style={[styles.rankNum, index === 0 && styles.rankNumFirst]}>
                        {index + 1}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.priceInfo}>
                    <Text style={styles.storeName}>{item.comercio || 'Comercio'}</Text>
                    {item.direccion ? <Text style={styles.storeAddr} numberOfLines={1}>{item.direccion}</Text> : null}
                    <Text style={styles.storeDist}>
                      <Ionicons name="location-sharp" size={12} color={Colors.textLight} /> {formatDist(item.distancia)}
                    </Text>
                  </View>
                  <View style={styles.priceCol}>
                    <Text style={[styles.priceAmount, index === 0 && styles.priceAmountFirst]}>
                      {formatPrice(item.precioLista)}
                    </Text>
                    {item.precioPromoA ? (
                      <Text style={styles.pricePromo}>{formatPrice(item.precioPromoA)}</Text>
                    ) : null}
                  </View>
                </View>
              )}
            />
          )}
        </View>

        {!locationLoading && !locationDenied && !loading && !product && <Disclaimer />}
      </View>
    </PearlBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  headerIconCircle: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text },
  body: { flex: 1 },
  locationMissingText: { fontSize: 13, color: Colors.error, textAlign: 'center', marginBottom: 12, paddingHorizontal: 8 },

  stateWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 40 },
  stateTitle: { fontSize: 18, fontWeight: '600', color: Colors.text, marginTop: 16, marginBottom: 8 },
  stateDesc: { fontSize: 14, color: Colors.textLight, textAlign: 'center', lineHeight: 20, marginBottom: 20, paddingHorizontal: 16 },

  primaryBtn: {
    flexDirection: 'row', backgroundColor: Colors.primary, paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },

  productCard: {
    flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 12, padding: 14,
    marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: Colors.surface,
  },
  productInfo: { flex: 1, marginRight: 12 },
  productName: { fontSize: 16, fontWeight: '600', color: Colors.text },
  productMeta: { fontSize: 13, color: Colors.textLight, marginTop: 2 },
  rescanBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },

  priceList: { flex: 1 },
  priceRow: {
    flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 10, padding: 12,
    marginBottom: 8, alignItems: 'center', borderWidth: 1, borderColor: Colors.surface,
  },
  priceRowFirst: { borderColor: Colors.primary, borderWidth: 1.5 },
  rankCol: { marginRight: 10 },
  rankBadge: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  rankBadgeFirst: { backgroundColor: Colors.primary },
  rankNum: { fontSize: 13, fontWeight: '700', color: Colors.text },
  rankNumFirst: { color: Colors.white },
  priceInfo: { flex: 1 },
  storeName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  storeAddr: { fontSize: 12, color: Colors.textLight, marginTop: 1 },
  storeDist: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
  priceCol: { alignItems: 'flex-end', marginLeft: 8 },
  priceAmount: { fontSize: 17, fontWeight: '700', color: Colors.text },
  priceAmountFirst: { color: Colors.success },
  pricePromo: { fontSize: 12, color: Colors.success, marginTop: 2 },

  disclaimer: { paddingVertical: 20, paddingHorizontal: 8, marginTop: 8, borderTopWidth: 1, borderTopColor: Colors.surface },
  disclaimerText: { fontSize: 13, color: Colors.textLight, lineHeight: 18, flex: 1 },
  attribution: { fontSize: 11, color: Colors.textLight, marginTop: 8, textAlign: 'center' },

  scanBackBtn: { position: 'absolute', top: 50, left: 16, zIndex: 10, padding: 8 },
  scanOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scanFrame: {
    width: width * 0.7, height: width * 0.7, borderWidth: 2, borderColor: '#FFF',
    borderRadius: 16, backgroundColor: 'transparent',
  },
  scanHint: { color: '#FFF', fontSize: 15, marginTop: 24, textAlign: 'center' },
});
