import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Doctor } from "../components/DoctorCard";
import DoctorCard from "../components/DoctorCard";
import { supabase } from "../lib/supabase";

export default function DoctorsScreen() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const load = useCallback(async (): Promise<void> => {
    setError("");
    try {
      const { data, error: e } = await supabase
        .from("doctors")
        .select("*, specialties(name)")
        .order("full_name");
      if (e) throw e;
      setDoctors(data as unknown as Doctor[]);
    } catch {
      setError("Could not load doctors. Pull down to try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const goBack = (): void => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={goBack} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.title}>Available Doctors</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#1A1AFF" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={doctors}
          keyExtractor={(d) => d.id}
          renderItem={({ item }) => <DoctorCard doctor={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
          ListEmptyComponent={
            <Text style={error ? styles.error : styles.empty}>
              {error || "No doctors found."}
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8E7E6" },
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
  title: { fontSize: 22, fontWeight: "800", color: "#111" },
  list: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 30 },
  error: { color: "#D03030", textAlign: "center", marginTop: 30 },
  empty: { color: "#666", textAlign: "center", marginTop: 30 },
});
