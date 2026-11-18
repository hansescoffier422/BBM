import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { APP_NAME, APP_TAGLINE } from "../lib/Brand";

const C = {
  teal: "#f6bdb9",
  mint: "#D9F2EC",
  cross: "#E5484D",
} as const;

interface Props {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: Props) {
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(14)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  const barWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  useEffect(() => {
    Animated.sequence([
      // 1. logo pops in
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      // 2. name appears and the loading bar fills
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(textY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: false,
        }),
      ]),
      Animated.delay(300),
      // 3. fade out, then go to login / dashboard
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onFinish();
    });
  }, [logoScale, logoOpacity, textOpacity, textY, progress, fadeOut, onFinish]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Animated.View style={[styles.content, { opacity: fadeOut }]}>
        <Animated.View
          style={[
            styles.logo,
            { opacity: logoOpacity, transform: [{ scale: logoScale }] },
          ]}
        >
          <View style={styles.crossV} />
          <View style={styles.crossH} />
        </Animated.View>

        <Animated.View
          style={{
            opacity: textOpacity,
            transform: [{ translateY: textY }],
            alignItems: "center",
          }}
        >
          <Text style={styles.title}>{APP_NAME}</Text>
          <Text style={styles.subtitle}>{APP_TAGLINE}</Text>

          <View style={styles.track}>
            <Animated.View style={[styles.fill, { width: barWidth }]} />
          </View>
          <Text style={styles.loading}>Loading…</Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.teal },
  content: { flex: 1, alignItems: "center", justifyContent: "center" },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  crossV: {
    position: "absolute",
    width: 24,
    height: 66,
    borderRadius: 7,
    backgroundColor: C.cross,
  },
  crossH: {
    position: "absolute",
    width: 66,
    height: 24,
    borderRadius: 7,
    backgroundColor: C.cross,
  },
  title: { fontSize: 32, fontWeight: "800", color: "#fff", letterSpacing: 2 },
  subtitle: { fontSize: 14, color: C.mint, marginTop: 8 },
  track: {
    width: 200,
    height: 6,
    borderRadius: 3,
    marginTop: 40,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
  },
  fill: { height: 6, borderRadius: 3, backgroundColor: "#fff" },
  loading: { fontSize: 12, color: C.mint, marginTop: 10, letterSpacing: 1 },
});
