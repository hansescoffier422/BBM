import { Ionicons } from "@expo/vector-icons";
import type { Session } from "@supabase/supabase-js";
import type { Href } from "expo-router";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  RefreshControl,
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
import AdminTabBar from "../components/AdminTabBar";
import LoadingCircle from "../components/LoadingCircle";
import { errText } from "../lib/errors";
import { supabase } from "../lib/supabase";
import AdminDoctorsScreen from "./AdminDoctorScreen";
import AdminFeedbackScreen from "./AdminFeedbackScreen";
import AdminUsersScreen from "./AdminUserScreen";
type AdminTab = "overview" | "doctors" | "feedback" | "users";

interface RecentFeedback {
  id: string;
  message: string;
  created_at: string;
  profiles: { full_name: string | null; student_id: string | null } | null;
}

interface Overview {
  doctors: number;
  availableToday: number;
  students: number;
  feedback: number;
  ratingCount: number;
  ratingAvg: number | null;
  bySpeciality: { name: string; count: number }[];
  recent: RecentFeedback[];
}

const C = {
  bg: "#fbf5f4",
  ink: "#14142B",
  muted: "#6B6B7B",
  blue: "#1A1AFF",
  blueDark: "#1208C8",
} as const;

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const greeting = (): string => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};
const todayText = (): string => {
  const d = new Date();
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
};
const initialsOf = (s: string): string =>
  s
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "A";

function StatCard(props: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  tint: string;
  value: string;
  label: string;
  sub: string;
}) {
  return (
    <View style={styles.stat}>
      <View style={[styles.statIcon, { backgroundColor: props.tint }]}>
        <Ionicons name={props.icon} size={20} color={props.color} />
      </View>
      <Text style={styles.statValue}>{props.value}</Text>
      <Text style={styles.statLabel}>{props.label}</Text>
      <Text style={[styles.statSub, { color: props.color }]}>{props.sub}</Text>
    </View>
  );
}

function OverviewTab({
  name,
  onSeeAll,
}: {
  name: string;
  onSeeAll: () => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const load = useCallback(async (): Promise<void> => {
    setError("");
    try {
      const [d, s, f, r, recent] = await Promise.all([
        supabase
          .from("doctors")
          .select("id, available_today, specialties(name)"),
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "student"),
        supabase.from("feedback").select("*", { count: "exact", head: true }),
        supabase.from("app_ratings").select("rating"),
        supabase
          .from("feedback")
          .select("id, message, created_at, profiles(full_name, student_id)")
          .order("created_at", { ascending: false })
          .limit(3),
      ]);
      const failed = d.error ?? s.error ?? f.error ?? r.error ?? recent.error;
      if (failed) throw failed;

      const docs = (d.data ?? []) as unknown as {
        id: string;
        available_today: boolean;
        specialties: { name: string } | null;
      }[];
      const ratings = (r.data ?? []) as { rating: number }[];
      const counts: Record<string, number> = {};
      docs.forEach((x) => {
        const n = x.specialties?.name ?? "Other";
        counts[n] = (counts[n] ?? 0) + 1;
      });

      setData({
        doctors: docs.length,
        availableToday: docs.filter((x) => x.available_today).length,
        students: s.count ?? 0,
        feedback: f.count ?? 0,
        ratingCount: ratings.length,
        ratingAvg: ratings.length
          ? ratings.reduce((a, x) => a + x.rating, 0) / ratings.length
          : null,
        bySpeciality: Object.entries(counts)
          .map(([n, c]) => ({ name: n, count: c }))
          .sort((a, b) => b.count - a.count),
        recent: (recent.data ?? []) as unknown as RecentFeedback[],
      });
    } catch (err: unknown) {
      setError(`Could not load the numbers: ${errText(err)}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onLogout = (): void => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/");
        },
      },
    ]);
  };

  const pct = data && data.doctors > 0 ? data.availableToday / data.doctors : 0;
  const maxSpec = data
    ? Math.max(1, ...data.bySpeciality.map((x) => x.count))
    : 1;

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scroll,
        { paddingBottom: insets.bottom + 120 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsOf(name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.date}>{todayText()}</Text>
          <Text style={styles.hello} numberOfLines={1}>
            {greeting()}, {name}
          </Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={onLogout} hitSlop={8}>
          <Ionicons name="log-out-outline" size={22} color={C.ink} />
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={{ marginTop: 60 }}>
          <LoadingCircle label="Loading overview…" />
        </View>
      )}
      {!!error && <Text style={styles.error}>{error}</Text>}

      {data && (
        <>
          {/* Hero */}
          <View style={styles.hero}>
            <View
              style={[
                styles.blob,
                { width: 170, height: 170, right: -50, top: -60 },
              ]}
            />
            <View
              style={[
                styles.blob,
                { width: 110, height: 110, right: 40, bottom: -50 },
              ]}
            />

            <View style={styles.heroTop}>
              <View>
                <Text style={styles.heroLabel}>Doctors available today</Text>
                <Text style={styles.heroNumber}>
                  {data.availableToday}
                  <Text style={styles.heroOf}> / {data.doctors}</Text>
                </Text>
              </View>
              <TouchableOpacity
                style={styles.heroBtn}
                onPress={() => router.push("/admin-doctor-form" as Href)}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={18} color={C.blue} />
                <Text style={styles.heroBtnText}>Add doctor</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.heroTrack}>
              <View
                style={[
                  styles.heroFill,
                  { width: `${Math.round(pct * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.heroHint}>
              {data.doctors === 0
                ? "No doctors added yet"
                : `${Math.round(pct * 100)}% of the clinic team is available`}
            </Text>
          </View>

          {/* Stats */}
          <View style={styles.grid}>
            <StatCard
              icon="medkit"
              color="#1A1AFF"
              tint="#E3E5FF"
              value={String(data.doctors)}
              label="Doctors"
              sub={`${data.availableToday} available`}
            />
            <StatCard
              icon="people"
              color="#16A34A"
              tint="#DCFCE7"
              value={String(data.students)}
              label="Students"
              sub="registered"
            />
            <StatCard
              icon="chatbox-ellipses"
              color="#D97706"
              tint="#FEF3C7"
              value={String(data.feedback)}
              label="Feedback"
              sub="messages received"
            />
            <StatCard
              icon="star"
              color="#E5484D"
              tint="#FDE2E4"
              value={data.ratingAvg != null ? data.ratingAvg.toFixed(1) : "–"}
              label="App rating"
              sub={`${data.ratingCount} rating${data.ratingCount === 1 ? "" : "s"}`}
            />
          </View>

          {/* By speciality */}
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Doctors by speciality</Text>
            {data.bySpeciality.length === 0 && (
              <Text style={styles.empty}>No doctors yet.</Text>
            )}
            {data.bySpeciality.map((x) => (
              <View key={x.name} style={styles.specRow}>
                <Text style={styles.specName} numberOfLines={1}>
                  {x.name}
                </Text>
                <View style={styles.specTrack}>
                  <View
                    style={[
                      styles.specFill,
                      { width: `${(x.count / maxSpec) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.specCount}>{x.count}</Text>
              </View>
            ))}
          </View>

          {/* Recent feedback */}
          <View style={styles.panel}>
            <View style={styles.panelHead}>
              <Text style={styles.panelTitle}>Recent feedback</Text>
              <TouchableOpacity onPress={onSeeAll} hitSlop={8}>
                <Text style={styles.seeAll}>See all ›</Text>
              </TouchableOpacity>
            </View>
            {data.recent.length === 0 && (
              <Text style={styles.empty}>No feedback yet.</Text>
            )}
            {data.recent.map((x, i) => (
              <View
                key={x.id}
                style={[styles.fbRow, i > 0 && styles.fbDivider]}
              >
                <View style={styles.fbAvatar}>
                  <Text style={styles.fbAvatarText}>
                    {initialsOf(x.profiles?.full_name ?? "S")}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.fbTop}>
                    <Text style={styles.fbName} numberOfLines={1}>
                      {x.profiles?.full_name ?? "Student"}
                    </Text>
                    <Text style={styles.fbDate}>
                      {new Date(x.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.fbMsg} numberOfLines={2}>
                    {x.message}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

export default function AdminDashboardScreen({
  session,
}: {
  session: Session;
}) {
  const [tab, setTab] = useState<AdminTab>("overview");
  const name: string =
    session.user.user_metadata?.full_name ??
    session.user.user_metadata?.name ??
    "Admin";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={{ flex: 1 }}>
        {tab === "overview" && (
          <OverviewTab name={name} onSeeAll={() => setTab("feedback")} />
        )}
        {tab === "doctors" && <AdminDoctorsScreen embedded />}
        {tab === "feedback" && <AdminFeedbackScreen embedded />}
        {tab === "users" && <AdminUsersScreen embedded />}
        <AdminTabBar active={tab} onChange={setTab} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 14 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.blue,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  date: { fontSize: 12, fontWeight: "600", color: C.muted },
  hello: { fontSize: 18, fontWeight: "800", color: C.ink, marginTop: 1 },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  error: { color: "#D03030", textAlign: "center", marginTop: 16 },

  hero: {
    backgroundColor: C.blue,
    borderRadius: 24,
    padding: 20,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: C.blue,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  blob: {
    position: "absolute",
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontWeight: "600",
  },
  heroNumber: { color: "#fff", fontSize: 44, fontWeight: "800", marginTop: 2 },
  heroOf: { fontSize: 22, fontWeight: "700", color: "rgba(255,255,255,0.75)" },
  heroBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 38,
  },
  heroBtnText: {
    color: C.blue,
    fontWeight: "800",
    fontSize: 12,
    marginLeft: 2,
  },
  heroTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.28)",
    marginTop: 14,
    overflow: "hidden",
  },
  heroFill: { height: 8, borderRadius: 4, backgroundColor: "#fff" },
  heroHint: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
    marginBottom: 16,
  },
  stat: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#14142B",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statValue: { fontSize: 28, fontWeight: "800", color: C.ink },
  statLabel: { fontSize: 13, fontWeight: "700", color: C.ink, marginTop: 1 },
  statSub: { fontSize: 11, fontWeight: "700", marginTop: 4 },

  panel: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#14142B",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  panelHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: C.ink,
    marginBottom: 12,
  },
  seeAll: { fontSize: 12, fontWeight: "800", color: C.blue, marginBottom: 12 },
  empty: { fontSize: 13, color: C.muted },

  specRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  specName: { width: 110, fontSize: 12, fontWeight: "700", color: C.ink },
  specTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ECECF4",
    overflow: "hidden",
  },
  specFill: { height: 10, borderRadius: 5, backgroundColor: C.blue },
  specCount: {
    width: 26,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "800",
    color: C.ink,
  },

  fbRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
  },
  fbDivider: { borderTopWidth: 1, borderTopColor: "#F0F0F6" },
  fbAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E3E5FF",
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  fbAvatarText: { color: C.blue, fontWeight: "800", fontSize: 12 },
  fbTop: { flexDirection: "row", justifyContent: "space-between" },
  fbName: { flex: 1, fontSize: 13, fontWeight: "800", color: C.ink },
  fbDate: { fontSize: 11, color: C.muted, marginLeft: 8 },
  fbMsg: { fontSize: 13, color: "#33334D", lineHeight: 18, marginTop: 2 },
});
