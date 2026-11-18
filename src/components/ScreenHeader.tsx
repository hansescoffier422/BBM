import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface Props {
  title: string;
  right?: React.ReactNode;
  back?: boolean; // false = no back arrow (used inside the admin tabs)
}

export default function ScreenHeader({ title, right, back = true }: Props) {
  const router = useRouter();
  const goBack = (): void => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  return (
    <View style={styles.header}>
      {back && (
        <TouchableOpacity style={styles.back} onPress={goBack} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
      )}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
  },
  back: {
    width: 44,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  title: { flex: 1, fontSize: 22, fontWeight: "800", color: "#111" },
});
