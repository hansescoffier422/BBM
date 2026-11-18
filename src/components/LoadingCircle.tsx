import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

interface Props {
  label?: string;
  size?: number;
  color?: string;
}

// A spinning ring: a faint circle with one bright arc that rotates
export default function LoadingCircle({
  label,
  size = 56,
  color = "#1A1AFF",
}: Props) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  const stroke = Math.max(4, Math.round(size / 11));

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: stroke,
          borderColor: `${color}33`,
          borderTopColor: color,
          transform: [{ rotate }],
        }}
      />
      {!!label && <Text style={styles.label}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  label: { marginTop: 16, fontSize: 13, fontWeight: "600", color: "#444" },
});
