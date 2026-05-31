import React, { useCallback, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Dimensions, Animated } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { SvgXml } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
const ORANGE = '#f97316';
const { width: W, height: H } = Dimensions.get('window');
const SEGS = 50;

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

function jitter(x) {
  const t = x * 0.05;
  return (
    Math.sin(t * 9 + 1) * 3 +
    Math.sin(t * 23 + 3) * 2 +
    Math.sin(t * 7 + 7) * 1.5
  );
}

function buildTopPts(bh) {
  const center = H * 0.5;
  const topEdge = center - bh;
  const xs = [];
  for (let i = 0; i <= SEGS; i++) xs.push((W / SEGS) * i);
  const pts = [`0,0`];
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i];
    const j = i === 0 || i === xs.length - 1 ? 0 : jitter(x);
    pts.push(`${x},${topEdge + j}`);
  }
  pts.push(`${W},0`);
  return pts.join(' ');
}

function buildBotPts(bh) {
  const center = H * 0.5;
  const botEdge = center + bh;
  const xs = [];
  for (let i = 0; i <= SEGS; i++) xs.push((W / SEGS) * i);
  const pts = [`0,${H}`];
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i];
    const j = i === 0 || i === xs.length - 1 ? 0 : jitter(x);
    pts.push(`${x},${botEdge + j}`);
  }
  pts.push(`${W},${H}`);
  return pts.join(' ');
}

export default function WelcomeScreen({ navigation }) {
  const [topPts, setTopPts] = useState(() => buildTopPts(0));
  const [botPts, setBotPts] = useState(() => buildBotPts(0));
  const bandOpen = useRef(new Animated.Value(0)).current;
  const btnsOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.95)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      bandOpen.setValue(0);
      btnsOpacity.setValue(0);
      logoScale.setValue(0.95);
      logoOpacity.setValue(0);
      setTopPts(buildTopPts(0));
      setBotPts(buildBotPts(0));

      const listener = bandOpen.addListener(({ value }) => {
        const bh = value * 63;
        setTopPts(buildTopPts(bh));
        setBotPts(buildBotPts(bh));
      });

      Animated.sequence([
        Animated.delay(2000),
        Animated.timing(bandOpen, { toValue: 1, duration: 1000, useNativeDriver: false }),
        Animated.parallel([
          Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(logoScale, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(logoScale, { toValue: 1.08, duration: 900, useNativeDriver: true }),
          Animated.timing(logoScale, { toValue: 1, duration: 900, useNativeDriver: true }),
        ]),
        Animated.delay(200),
        Animated.timing(btnsOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]).start();

      return () => bandOpen.removeListener(listener);
    }, [])
  );

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Polygon points={topPts} fill={ORANGE} />
        <Polygon points={botPts} fill={ORANGE} />
      </Svg>

      <Animated.View style={[styles.logoArea, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <SvgXml xml={LOGO_SVG} width={320} height={64} />
      </Animated.View>

      <Animated.View style={[styles.buttons, { opacity: btnsOpacity }]}>
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.primaryButtonText}>Crear cuenta</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.secondaryButtonText}>Ya tengo cuenta</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFCF8',
  },
  logoArea: {
    position: 'absolute',
    top: H * 0.5 - 32,
    left: 0,
    right: 0,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttons: {
    position: 'absolute',
    bottom: 50,
    left: 32,
    right: 32,
    gap: 14,
  },
  primaryButton: {
    backgroundColor: '#FEFCF8',
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  primaryButtonText: {
    color: ORANGE,
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: 'rgba(254,252,248,0.7)',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#FEFCF8',
    fontSize: 17,
    fontWeight: '600',
  },
});
