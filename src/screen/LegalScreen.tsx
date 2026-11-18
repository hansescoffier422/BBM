import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
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
import LoadingCircle from "../components/LoadingCircle";
import { supabase } from "../lib/supabase";

interface Page {
  title: string;
  body: string;
}

const TITLES: Record<string, string> = {
  privacy: "Privacy Policy",
  terms: "Terms and Conditions",
  cookies: "Cookies Policy",
};

export default function LegalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError("");
    try {
      const { data, error: e } = await supabase
        .from("legal_pages")
        .select("title, body")
        .eq("slug", slug)
        .single();
      if (e) throw e;
      setPage(data as Page);
    } catch {
      setError("Could not load this page. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const goBack = (): void => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} hitSlop={12} style={styles.back}>
          <Ionicons name="arrow-back" size={26} color="#111" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {page?.title ?? TITLES[slug ?? ""] ?? "Policy"}
        </Text>
      </View>

      {loading && (
        <View style={styles.center}>
          <LoadingCircle label="Loading…" />
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

      {!loading && !error && page && (
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + 30 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.body}>{page.body}</Text>
        </ScrollView>
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
    paddingTop: 16,
    paddingBottom: 14,
  },
  back: { marginRight: 22 },
  title: { flex: 1, fontSize: 20, fontWeight: "800", color: "#111" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 80,
  },
  error: { color: "#D03030", textAlign: "center", paddingHorizontal: 30 },
  retry: {
    marginTop: 14,
    backgroundColor: "#1A1AFF",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  retryText: { color: "#fff", fontWeight: "700" },
  scroll: { paddingHorizontal: 24, paddingTop: 6 },
  body: { fontSize: 14, lineHeight: 22, color: "#222" },
});
