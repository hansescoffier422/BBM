import { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { initialsOf } from "../components/DoctorCard";
import LoadingCircle from "../components/LoadingCircle";
import ScreenHeader from "../components/ScreenHeader";
import { errText } from "../lib/errors";
import { supabase } from "../lib/supabase";

interface AdminDoctor {
  id: string;
  full_name: string;
  location: string | null;
  available_today: boolean;
  rating: number;
  review_count: number;
  specialties: { name: string } | null;
}

const C = { bg: "#F8E7E6", ink: "#111111", blue: "#1A1AFF" } as const;

export default function AdminDoctorsScreen({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const router = useRouter();
  const [doctors, setDoctors] = useState<AdminDoctor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const load = useCallback(async (): Promise<void> => {
    setError("");
    try {
      const { data, error: e } = await supabase
        .from("doctors")
        .select(
          "id, full_name, location, available_today, rating, review_count, specialties(name)",
        )
        .order("full_name");
      if (e) throw e;
      setDoctors(data as unknown as AdminDoctor[]);
    } catch (err: unknown) {
      setError(`Could not load doctors: ${errText(err)}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Reload when coming back from the add / edit form
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const openForm = (id?: string): void => {
    router.push(
      (id ? `/admin-doctor-form?id=${id}` : "/admin-doctor-form") as Href,
    );
  };

  const toggleAvailable = async (
    d: AdminDoctor,
    value: boolean,
  ): Promise<void> => {
    setDoctors((list) =>
      list.map((x) => (x.id === d.id ? { ...x, available_today: value } : x)),
    );
    const { error: e } = await supabase
      .from("doctors")
      .update({ available_today: value })
      .eq("id", d.id);
    if (e) {
      setDoctors((list) =>
        list.map((x) =>
          x.id === d.id ? { ...x, available_today: !value } : x,
        ),
      );
      Alert.alert("Could not update", errText(e));
    }
  };

  const remove = (d: AdminDoctor): void => {
    Alert.alert(
      "Delete doctor",
      `Remove ${d.full_name}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error: e } = await supabase
              .from("doctors")
              .delete()
              .eq("id", d.id);
            if (e) Alert.alert("Could not delete", errText(e));
            else setDoctors((list) => list.filter((x) => x.id !== d.id));
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={embedded ? [] : ["top", "bottom"]}>
      <ScreenHeader
        back={!embedded}
        title="Doctors"
        right={
          <TouchableOpacity
            style={styles.add}
            onPress={() => openForm()}
            hitSlop={8}
          >
            <Ionicons name="add" size={26} color="#fff" />
          </TouchableOpacity>
        }
      />

      {loading ? (
        <View style={styles.center}>
          <LoadingCircle label="Loading doctors…" />
        </View>
      ) : (
        <FlatList
          data={doctors}
          keyExtractor={(d) => d.id}
          contentContainerStyle={[
            styles.list,
            embedded && { paddingBottom: 130 },
          ]}
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
              {error || "No doctors yet. Tap + to add one."}
            </Text>
          }
          renderItem={({ item: d }) => (
            <View style={styles.card}>
              <View style={styles.top}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {initialsOf(d.full_name)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {d.full_name}
                  </Text>
                  <Text style={styles.spec}>
                    {d.specialties?.name ?? "No speciality"}
                  </Text>
                  <Text style={styles.meta}>
                    {d.location ?? "No location"} • ★{" "}
                    {Number(d.rating).toFixed(1)} ({d.review_count})
                  </Text>
                </View>
              </View>

              <View style={styles.bottom}>
                <View style={styles.switchRow}>
                  <Switch
                    value={d.available_today}
                    onValueChange={(v) => toggleAvailable(d, v)}
                    trackColor={{ true: "#16C060", false: "#BBB" }}
                  />
                  <Text style={styles.switchLabel}>Available today</Text>
                </View>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => openForm(d.id)}
                >
                  <Ionicons name="create-outline" size={18} color={C.blue} />
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.delBtn}
                  onPress={() => remove(d)}
                >
                  <Ionicons name="trash-outline" size={18} color="#D03030" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  add: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 80,
  },
  list: { paddingHorizontal: 20, paddingBottom: 30 },
  error: { color: "#D03030", textAlign: "center", marginTop: 30 },
  empty: { color: "#666", textAlign: "center", marginTop: 30 },
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
  top: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 46,
    height: 42,
    borderRadius: 9,
    backgroundColor: C.blue,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  name: { fontSize: 15, fontWeight: "700", color: C.ink },
  spec: { fontSize: 11, fontWeight: "700", color: C.blue, marginTop: 2 },
  meta: { fontSize: 11, color: "#555", marginTop: 3 },
  bottom: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
  },
  switchRow: { flex: 1, flexDirection: "row", alignItems: "center" },
  switchLabel: { fontSize: 12, fontWeight: "600", color: C.ink, marginLeft: 6 },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#E8EAFF",
    marginRight: 8,
  },
  editText: { color: C.blue, fontWeight: "700", marginLeft: 4 },
  delBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FDE7E7",
    alignItems: "center",
    justifyContent: "center",
  },
});
