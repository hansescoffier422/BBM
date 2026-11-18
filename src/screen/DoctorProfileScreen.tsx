import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";
import { initialsOf } from "../components/DoctorCard";
import LoadingCircle from "../components/LoadingCircle";
import { supabase } from "../lib/supabase";

interface DoctorProfile {
  id: string;
  full_name: string;
  rating: number;
  review_count: number;
  patients_count: number | null;
  experience: string | null;
  distance_km: number | null;
  about: string | null;
  consultation_fee: number | null;
  session_minutes: number | null;
  specialties: { name: string } | null;
}

const C = {
  bg: "#F8E7E6",
  ink: "#111111",
  blue: "#1A1AFF",
  iconBg: "#D6D9FF",
  green: "#16C060",
  star: "#F5B301",
} as const;

// Keep the loading circle visible long enough to see, even on a fast connection
const MIN_LOADING_MS = 800;

const withCommas = (n: number): string =>
  String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

function Stat({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value?: string;
  label: string;
}) {
  return (
    <View style={styles.stat}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={18} color={C.blue} />
      </View>
      {!!value && <Text style={styles.statValue}>{value}</Text>}
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function DoctorProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const load = useCallback(async (): Promise<void> => {
    if (!id) {
      setError("Doctor not found.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    const started = Date.now();
    try {
      const { data, error: e } = await supabase
        .from("doctors")
        .select("*, specialties(name)")
        .eq("id", id)
        .single();
      if (e) throw e;
      const wait = MIN_LOADING_MS - (Date.now() - started);
      if (wait > 0) await new Promise<void>((r) => setTimeout(r, wait));
      setDoctor(data as unknown as DoctorProfile);
    } catch {
      setError("Could not load this doctor. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const goBack = (): void => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  const d = doctor;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={goBack} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Doctor Profile</Text>
      </View>

      {loading && (
        <View style={styles.center}>
          <LoadingCircle label="Loading doctor profile…" />
        </View>
      )}

      {!loading && !!error && (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <TouchableOpacity style={styles.retry} onPress={load}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && d && (
        <>
          <ScrollView
            contentContainerStyle={[
              styles.scroll,
              { paddingBottom: insets.bottom + 190 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Profile card */}
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {initialsOf(d.full_name)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{d.full_name}</Text>
                  <Text style={styles.spec}>
                    {d.specialties?.name ?? "General"}
                  </Text>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={16} color={C.star} />
                    <Text style={styles.rating}>
                      {" "}
                      {Number(d.rating).toFixed(1)}
                    </Text>
                    <Text style={styles.reviews}>
                      {" "}
                      ({d.review_count} reviewers)
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.statsRow}>
                <Stat
                  icon="people-outline"
                  value={withCommas(d.patients_count ?? 0)}
                  label="Patients"
                />
                <Stat
                  icon="school-outline"
                  value={d.experience ?? undefined}
                  label="Experience"
                />
                <Stat
                  icon="location-outline"
                  value={
                    d.distance_km != null ? `${d.distance_km}km` : undefined
                  }
                  label="Distance"
                />
              </View>
            </View>

            {/* About */}
            <Text style={styles.aboutTitle}>About</Text>
            <Text style={styles.aboutText}>
              {d.about ?? "No description yet."}
            </Text>
          </ScrollView>

          {/* Fee + booking */}
          <View style={[styles.panel, { paddingBottom: insets.bottom + 14 }]}>
            <Text style={styles.feeLabel}>Consultation fee</Text>
            <View style={styles.feeRow}>
              <Text style={styles.fee}>₱{Number(d.consultation_fee ?? 0)}</Text>
              <View style={styles.session}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={16}
                  color={C.green}
                />
                <Text style={styles.sessionText}>
                  {" "}
                  {d.session_minutes ?? 30} mins session
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.bookBtn}
              onPress={() =>
                Alert.alert(
                  "Book Appointment",
                  `Booking with ${d.full_name} is coming soon.`,
                )
              }
            >
              <Text style={styles.bookText}>Book Appointment</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
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
  title: { fontSize: 22, fontWeight: "800", color: C.ink },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 80,
  },
  error: { color: "#D03030", textAlign: "center", paddingHorizontal: 30 },
  retry: {
    marginTop: 14,
    backgroundColor: C.blue,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  retryText: { color: "#fff", fontWeight: "700" },
  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  card: {
    backgroundColor: "#F6E9E7",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#2B2B2B",
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start" },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: C.blue,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  name: { fontSize: 14, fontWeight: "700", color: C.ink },
  spec: { fontSize: 11, fontWeight: "700", color: C.blue, marginTop: 3 },
  ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  rating: { fontSize: 13, fontWeight: "800", color: C.ink },
  reviews: { fontSize: 10, fontWeight: "600", color: "#444" },
  divider: {
    height: 1,
    backgroundColor: "#444",
    marginTop: 20,
    marginBottom: 18,
    marginHorizontal: 12,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-start",
  },
  stat: { alignItems: "center", minWidth: 80 },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: C.iconBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  statValue: { fontSize: 11, fontWeight: "700", color: C.ink },
  statLabel: { fontSize: 11, fontWeight: "700", color: C.ink },
  aboutTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: C.ink,
    marginTop: 14,
    marginBottom: 8,
  },
  aboutText: {
    fontSize: 11,
    fontWeight: "600",
    color: C.ink,
    lineHeight: 17,
    paddingHorizontal: 4,
  },
  panel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  feeLabel: { fontSize: 12, fontWeight: "600", color: "#555" },
  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 14,
  },
  fee: { fontSize: 18, fontWeight: "800", color: C.ink },
  session: { flexDirection: "row", alignItems: "center" },
  sessionText: { fontSize: 10, fontWeight: "700", color: C.green },
  bookBtn: {
    height: 48,
    borderRadius: 6,
    backgroundColor: "#2A1AF5",
    alignItems: "center",
    justifyContent: "center",
  },
  bookText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
