import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LoadingCircle from "../components/LoadingCircle";
import ScreenHeader from "../components/ScreenHeader";
import { supabase } from "../lib/supabase";

interface UserRow {
  id: string;
  full_name: string | null;
  student_id: string | null;
  email: string | null;
  role: "student" | "admin";
}

const C = { bg: "#F8E7E6", ink: "#111111", blue: "#1A1AFF" } as const;

const initials = (u: UserRow): string => {
  const src = (u.full_name || u.email || "?").trim();
  return src
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
};

export default function AdminUsersScreen({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [query, setQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setMyId(data.session?.user.id ?? null));
  }, []);

  const load = useCallback(async (): Promise<void> => {
    setError("");
    try {
      const { data, error: e } = await supabase
        .from("profiles")
        .select("id, full_name, student_id, email, role")
        .order("full_name");
      if (e) throw e;
      setUsers(data as UserRow[]);
    } catch {
      setError("Could not load users. Pull down to try again.");
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

  const changeRole = (u: UserRow): void => {
    const makeAdmin = u.role !== "admin";
    const who = u.full_name || u.email || "this user";
    Alert.alert(
      makeAdmin ? "Make admin" : "Remove admin",
      makeAdmin
        ? `${who} will be able to manage doctors, read all feedback and ratings, and manage users.`
        : `${who} will become a regular student.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: makeAdmin ? "Make admin" : "Remove",
          style: makeAdmin ? "default" : "destructive",
          onPress: async () => {
            setBusyId(u.id);
            const { error: e } = await supabase.rpc("set_user_role", {
              target: u.id,
              new_role: makeAdmin ? "admin" : "student",
            });
            setBusyId(null);
            if (e) Alert.alert("Could not update", e.message);
            else
              setUsers((list) =>
                list.map((x) =>
                  x.id === u.id
                    ? { ...x, role: makeAdmin ? "admin" : "student" }
                    : x,
                ),
              );
          },
        },
      ],
    );
  };

  const q = query.trim().toLowerCase();
  const shown = users
    .filter(
      (u) =>
        !q ||
        (u.full_name ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q) ||
        (u.student_id ?? "").toLowerCase().includes(q),
    )
    // admins first
    .sort((a, b) => (a.role === b.role ? 0 : a.role === "admin" ? -1 : 1));

  const adminCount = users.filter((u) => u.role === "admin").length;

  return (
    <SafeAreaView style={styles.safe} edges={embedded ? [] : ["top", "bottom"]}>
      <ScreenHeader title="Users" back={!embedded} />

      <View style={styles.search}>
        <Ionicons name="search" size={20} color="#777" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search name, email or Student ID"
          placeholderTextColor="#888"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery("")} hitSlop={10}>
            <Ionicons name="close-circle" size={20} color="#777" />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.count}>
        {adminCount} admin{adminCount === 1 ? "" : "s"} ·{" "}
        {users.length - adminCount} student
        {users.length - adminCount === 1 ? "" : "s"}
      </Text>

      {loading ? (
        <View style={styles.center}>
          <LoadingCircle label="Loading users…" />
        </View>
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(u) => u.id}
          contentContainerStyle={[
            styles.list,
            embedded && { paddingBottom: 130 },
          ]}
          keyboardShouldPersistTaps="handled"
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
              {error || "No users found."}
            </Text>
          }
          renderItem={({ item: u }) => (
            <View style={styles.card}>
              <View
                style={[
                  styles.avatar,
                  u.role === "admin" && { backgroundColor: C.blue },
                ]}
              >
                <Text style={styles.avatarText}>{initials(u)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.name} numberOfLines={1}>
                    {u.full_name || "No name"}
                  </Text>
                  <View
                    style={[
                      styles.pill,
                      u.role === "admin"
                        ? styles.pillAdmin
                        : styles.pillStudent,
                    ]}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        u.role === "admin" && { color: "#fff" },
                      ]}
                    >
                      {u.role === "admin" ? "ADMIN" : "STUDENT"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.meta} numberOfLines={1}>
                  {u.email ?? "No email"}
                </Text>
                {!!u.student_id && (
                  <Text style={styles.meta}>ID: {u.student_id}</Text>
                )}
              </View>

              {u.id !== myId &&
                (busyId === u.id ? (
                  <ActivityIndicator color={C.blue} />
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.btn,
                      u.role === "admin" ? styles.btnRemove : styles.btnMake,
                    ]}
                    onPress={() => changeRole(u)}
                  >
                    <Text
                      style={[
                        styles.btnText,
                        u.role === "admin"
                          ? { color: "#D03030" }
                          : { color: C.blue },
                      ]}
                    >
                      {u.role === "admin" ? "Remove" : "Make admin"}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  search: {
    flexDirection: "row",
    alignItems: "center",
    height: 46,
    borderRadius: 16,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    marginHorizontal: 20,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: C.ink },
  count: {
    fontSize: 12,
    fontWeight: "600",
    color: "#555",
    marginHorizontal: 22,
    marginTop: 10,
    marginBottom: 8,
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#8A8A8A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  nameRow: { flexDirection: "row", alignItems: "center" },
  name: { flexShrink: 1, fontSize: 14, fontWeight: "700", color: C.ink },
  pill: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  pillAdmin: { backgroundColor: C.blue },
  pillStudent: { backgroundColor: "#E6E6E6" },
  pillText: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: "#444",
  },
  meta: { fontSize: 11, color: "#555", marginTop: 2 },
  btn: {
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  btnMake: { backgroundColor: "#E8EAFF" },
  btnRemove: { backgroundColor: "#FDE7E7" },
  btnText: { fontSize: 12, fontWeight: "700" },
});
