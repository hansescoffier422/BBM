import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { Session } from "@supabase/supabase-js";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import type { Doctor } from "../components/DoctorCard";
import DoctorCard from "../components/DoctorCard";
import { supabase } from "../lib/supabase";

type McIcon = keyof typeof MaterialCommunityIcons.glyphMap;

interface Specialty {
  id: string;
  name: string;
  icon: McIcon;
  color: string;
}

const C = {
  bg: "#e1dfdf",
  ink: "#111111",
  blue: "#1A1AFF",
  link: "#2A12D6",
  nav: "#fed1d1",
} as const;

export default function DashboardScreen({ session }: { session: Session }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const name: string =
    session.user.user_metadata?.full_name ??
    session.user.user_metadata?.name ??
    "Student";

  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const load = useCallback(async (): Promise<void> => {
    setError("");
    try {
      const [sp, dr] = await Promise.all([
        supabase.from("specialties").select("*").order("sort_order"),
        supabase
          .from("doctors")
          .select("*, specialties(name)")
          .order("full_name"),
      ]);
      if (sp.error || dr.error) throw new Error("load failed");
      setSpecialties(sp.data as Specialty[]);
      setDoctors(dr.data as unknown as Doctor[]);
    } catch {
      setError("Could not load clinic data. Pull down to try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = (): void => {
    setRefreshing(true);
    load();
  };

  // Dashboard preview: first 3 doctors (filtered by the selected specialty)
  // Search by doctor name, speciality or location, combined with the speciality tile filter
  const q = query.trim().toLowerCase();
  const matches = doctors.filter((d) => {
    if (selected && d.specialty_id !== selected) return false;
    if (!q) return true;
    return (
      d.full_name.toLowerCase().includes(q) ||
      (d.specialties?.name ?? "").toLowerCase().includes(q) ||
      (d.location ?? "").toLowerCase().includes(q)
    );
  });
  const shown = q ? matches : matches.slice(0, 3);

  const openSettings = (): void => {
    router.push("/settings" as Href);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 110 },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={22} color="#fff" />
          </View>
          <View>
            <Text style={styles.hello}>Hello, {name}</Text>
            <Text style={styles.how}>How are you feeling today?</Text>
          </View>
        </View>

        {/* Specialities */}
        {/* Search bar */}
        <View style={styles.search}>
          <Ionicons name="search" size={20} color="#777" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search doctors or specialities"
            placeholderTextColor="#888"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={10}>
              <Ionicons name="close-circle" size={20} color="#777" />
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.section, { marginTop: 28 }]}>Specialities</Text>
        <View style={styles.specRow}>
          {specialties.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={styles.specItem}
              onPress={() => setSelected(selected === s.id ? null : s.id)}
            >
              <View
                style={[
                  styles.tile,
                  { backgroundColor: s.color },
                  selected === s.id && styles.tileSelected,
                ]}
              >
                <MaterialCommunityIcons name={s.icon} size={38} color={C.ink} />
              </View>
              <Text style={styles.specLabel}>{s.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Available doctors */}
        <View style={styles.rowBetween}>
          <Text style={styles.section}>Available Doctors</Text>
          <TouchableOpacity onPress={() => router.push("/doctors")}>
            <Text style={styles.seeAll}>See all {">"}</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <ActivityIndicator color={C.blue} style={{ marginTop: 24 }} />
        )}
        {!!error && <Text style={styles.error}>{error}</Text>}
        {!loading && !error && shown.length === 0 && (
          <Text style={styles.empty}>
            {q ? `No doctors match "${query.trim()}".` : "No doctors found."}
          </Text>
        )}

        {shown.map((d) => (
          <DoctorCard key={d.id} doctor={d} />
        ))}
      </ScrollView>

      {/* Bottom bar */}
      <View style={[styles.nav, { bottom: insets.bottom + 14 }]}>
        <TouchableOpacity hitSlop={12}>
          <Ionicons name="home" size={24} color={C.ink} />
        </TouchableOpacity>
        <TouchableOpacity
          hitSlop={12}
          onPress={() => Alert.alert("Notifications", "No new notifications.")}
        >
          <Ionicons name="notifications" size={24} color={C.ink} />
        </TouchableOpacity>
        <TouchableOpacity hitSlop={12} onPress={openSettings}>
          <Ionicons name="settings-sharp" size={24} color={C.ink} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 16 },
  header: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.ink,
    borderWidth: 2,
    borderColor: "#8B7BFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  hello: { fontSize: 14, fontWeight: "500", color: C.ink },
  how: { fontSize: 10, color: C.ink, marginTop: 2 },
  search: {
    flexDirection: "row",
    alignItems: "center",
    height: 46,
    borderRadius: 16,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    marginTop: 22,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: C.ink },
  section: { fontSize: 20, fontWeight: "800", color: C.ink },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 14,
    marginBottom: 26,
  },
  specItem: { alignItems: "center", width: 100 },
  tile: {
    width: 62,
    height: 62,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  tileSelected: { borderWidth: 3, borderColor: C.blue },
  specLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: C.ink,
    marginTop: 6,
    textAlign: "center",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  seeAll: { fontSize: 11, fontWeight: "700", color: C.link },
  error: { color: "#D03030", textAlign: "center", marginTop: 16 },
  empty: { textAlign: "center", color: "#666", marginTop: 16 },
  nav: {
    position: "absolute",
    left: 36,
    right: 36,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.nav,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
});
