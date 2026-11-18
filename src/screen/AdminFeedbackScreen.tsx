import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LoadingCircle from "../components/LoadingCircle";
import ScreenHeader from "../components/ScreenHeader";
import { errText } from "../lib/errors";
import { supabase } from "../lib/supabase";

interface Person {
  full_name: string | null;
  student_id: string | null;
}
interface FeedbackRow {
  id: string;
  message: string;
  created_at: string;
  profiles: Person | null;
}
interface RatingRow {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles: Person | null;
}

type Tab = "feedback" | "ratings";

const C = {
  bg: "#F8E7E6",
  ink: "#111111",
  blue: "#1A1AFF",
  star: "#F5B301",
} as const;

const who = (p: Person | null): string => {
  const name = p?.full_name || "Student";
  return p?.student_id ? `${name} (${p.student_id})` : name;
};
const day = (iso: string): string => new Date(iso).toLocaleDateString();

export default function AdminFeedbackScreen({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [tab, setTab] = useState<Tab>("feedback");
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const load = useCallback(async (): Promise<void> => {
    setError("");
    try {
      const [f, r] = await Promise.all([
        supabase
          .from("feedback")
          .select("id, message, created_at, profiles(full_name, student_id)")
          .order("created_at", { ascending: false }),
        supabase
          .from("app_ratings")
          .select(
            "id, rating, comment, created_at, profiles(full_name, student_id)",
          )
          .order("created_at", { ascending: false }),
      ]);
      if (f.error || r.error) throw f.error ?? r.error;
      setFeedback(f.data as unknown as FeedbackRow[]);
      setRatings(r.data as unknown as RatingRow[]);
    } catch (err: unknown) {
      setError(`Could not load: ${errText(err)}`);
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

  const removeFeedback = (row: FeedbackRow): void => {
    Alert.alert(
      "Delete feedback",
      "Remove this message? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error: e } = await supabase
              .from("feedback")
              .delete()
              .eq("id", row.id);
            if (e) Alert.alert("Could not delete", errText(e));
            else setFeedback((list) => list.filter((x) => x.id !== row.id));
          },
        },
      ],
    );
  };

  const avg = ratings.length
    ? ratings.reduce((a, r) => a + r.rating, 0) / ratings.length
    : null;
  const refresh = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        load();
      }}
    />
  );

  return (
    <SafeAreaView style={styles.safe} edges={embedded ? [] : ["top", "bottom"]}>
      <ScreenHeader title="Feedback & Ratings" back={!embedded} />

      <View style={styles.tabs}>
        {(["feedback", "ratings"] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabOn]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>
              {t === "feedback"
                ? `Feedback (${feedback.length})`
                : `Ratings (${ratings.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <LoadingCircle label="Loading…" />
        </View>
      ) : tab === "feedback" ? (
        <FlatList
          data={feedback}
          keyExtractor={(x) => x.id}
          contentContainerStyle={[
            styles.list,
            embedded && { paddingBottom: 130 },
          ]}
          refreshControl={refresh}
          ListEmptyComponent={
            <Text style={error ? styles.error : styles.empty}>
              {error || "No feedback yet."}
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.who}>{who(item.profiles)}</Text>
                  <Text style={styles.date}>{day(item.created_at)}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeFeedback(item)}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={20} color="#D03030" />
                </TouchableOpacity>
              </View>
              <Text style={styles.message}>{item.message}</Text>
            </View>
          )}
        />
      ) : (
        <View style={{ flex: 1 }}>
          {avg != null && (
            <View style={styles.summary}>
              <Ionicons name="star" size={22} color={C.star} />
              <Text style={styles.summaryText}>
                {"  "}
                {avg.toFixed(1)} average from {ratings.length} rating
                {ratings.length === 1 ? "" : "s"}
              </Text>
            </View>
          )}
          <FlatList
            data={ratings}
            keyExtractor={(x) => x.id}
            contentContainerStyle={[
              styles.list,
              embedded && { paddingBottom: 130 },
            ]}
            refreshControl={refresh}
            ListEmptyComponent={
              <Text style={error ? styles.error : styles.empty}>
                {error || "No ratings yet."}
              </Text>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.who}>{who(item.profiles)}</Text>
                    <Text style={styles.date}>{day(item.created_at)}</Text>
                  </View>
                  <View style={{ flexDirection: "row" }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Ionicons
                        key={n}
                        name={n <= item.rating ? "star" : "star-outline"}
                        size={16}
                        color={C.star}
                      />
                    ))}
                  </View>
                </View>
                {!!item.comment && (
                  <Text style={styles.message}>{item.comment}</Text>
                )}
              </View>
            )}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  tabs: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    height: 38,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  tabOn: { backgroundColor: C.blue },
  tabText: { fontSize: 13, fontWeight: "700", color: C.ink },
  tabTextOn: { color: "#fff" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 80,
  },
  list: { paddingHorizontal: 20, paddingBottom: 30 },
  error: { color: "#D03030", textAlign: "center", marginTop: 30 },
  empty: { color: "#666", textAlign: "center", marginTop: 30 },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  summaryText: { fontSize: 14, fontWeight: "700", color: C.ink },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cardTop: { flexDirection: "row", alignItems: "center" },
  who: { fontSize: 13, fontWeight: "800", color: C.ink },
  date: { fontSize: 11, color: "#666", marginTop: 2 },
  message: { fontSize: 14, color: "#222", lineHeight: 20, marginTop: 10 },
});
