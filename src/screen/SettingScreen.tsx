import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { APP_NAME } from "../lib/Brand";
import { supabase } from "../lib/supabase";

type Config = Record<string, string>;

interface Row {
  key: string;
  label: string;
  icon: React.ReactElement;
  onPress: () => void;
}

const C = {
  bg: "#F8E7E6",
  ink: "#111111",
  blue: "#2A1AF5",
  star: "#F5B301",
} as const;

const ion = (name: keyof typeof Ionicons.glyphMap): React.ReactElement => (
  <Ionicons name={name} size={24} color={C.ink} />
);

export default function SettingsScreen() {
  const router = useRouter();
  const [cfg, setCfg] = useState<Config>({});

  const [rateOpen, setRateOpen] = useState<boolean>(false);
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");

  const [feedbackOpen, setFeedbackOpen] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string>("");

  const [busy, setBusy] = useState<boolean>(false);

  // Contact email, share message, etc. come from the app_settings table
  useEffect(() => {
    supabase
      .from("app_settings")
      .select("key, value")
      .then(({ data }) => {
        if (!data) return;
        const c: Config = {};
        (data as { key: string; value: string }[]).forEach((r) => {
          c[r.key] = r.value;
        });
        setCfg(c);
      });
  }, []);

  const goBack = (): void => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  const openLegal = (slug: "privacy" | "terms" | "cookies"): void => {
    router.push({ pathname: "/legal", params: { slug } } as Href);
  };

  const onShare = async (): Promise<void> => {
    try {
      await Share.share({
        message:
          cfg.share_message ?? `Check out ${APP_NAME}, the campus clinic app!`,
      });
    } catch {
      Alert.alert("Share App", "Could not open the share menu.");
    }
  };

  const onContact = (): void => {
    const email = cfg.contact_email;
    const phone = cfg.contact_phone;
    if (!email && !phone) {
      Alert.alert("Contact", "Contact details are not available yet.");
      return;
    }
    const buttons: { text: string; onPress?: () => void; style?: "cancel" }[] =
      [];
    if (email) {
      buttons.push({
        text: "Email us",
        onPress: () =>
          Linking.openURL(
            `mailto:${email}?subject=${encodeURIComponent(APP_NAME + " inquiry")}`,
          ),
      });
    }
    if (phone) {
      buttons.push({
        text: "Call us",
        onPress: () => Linking.openURL(`tel:${phone}`),
      });
    }
    buttons.push({ text: "Cancel", style: "cancel" });
    Alert.alert("Contact", [email, phone].filter(Boolean).join("\n"), buttons);
  };

  const submitRating = async (): Promise<void> => {
    if (rating === 0) {
      Alert.alert("Rate App", "Tap a star to choose your rating.");
      return;
    }
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("not signed in");
      const { error } = await supabase
        .from("app_ratings")
        .upsert(
          { user_id: u.user.id, rating, comment: comment.trim() || null },
          { onConflict: "user_id" },
        );
      if (error) throw error;
      setRateOpen(false);
      setRating(0);
      setComment("");
      Alert.alert("Thank you!", "Your rating has been saved.");
    } catch {
      Alert.alert(
        "Could not save",
        "Please check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const submitFeedback = async (): Promise<void> => {
    const text = feedback.trim();
    if (!text) {
      Alert.alert("Feedback", "Please write your feedback first.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase
        .from("feedback")
        .insert({ message: text });
      if (error) throw error;
      setFeedbackOpen(false);
      setFeedback("");
      Alert.alert("Thank you!", "Your feedback has been sent.");
    } catch {
      Alert.alert(
        "Could not send",
        "Please check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  };

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

  const rows: Row[] = [
    {
      key: "rate",
      label: "Rate App",
      icon: ion("star-outline"),
      onPress: () => setRateOpen(true),
    },
    {
      key: "share",
      label: "Share App",
      icon: ion("share-social-outline"),
      onPress: onShare,
    },
    {
      key: "privacy",
      label: "Privacy Policy",
      icon: ion("lock-closed-outline"),
      onPress: () => openLegal("privacy"),
    },
    {
      key: "terms",
      label: "Terms and Conditions",
      icon: ion("document-outline"),
      onPress: () => openLegal("terms"),
    },
    {
      key: "cookies",
      label: "Cookies Policy",
      icon: (
        <MaterialCommunityIcons name="cookie-outline" size={24} color={C.ink} />
      ),
      onPress: () => openLegal("cookies"),
    },
    {
      key: "contact",
      label: "Contact",
      icon: ion("mail-outline"),
      onPress: onContact,
    },
    {
      key: "feedback",
      label: "Feedback",
      icon: ion("chatbox-outline"),
      onPress: () => setFeedbackOpen(true),
    },
    {
      key: "logout",
      label: "Logout",
      icon: ion("log-out-outline"),
      onPress: onLogout,
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} hitSlop={12} style={styles.back}>
          <Ionicons name="arrow-back" size={26} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {rows.map((r) => (
          <TouchableOpacity
            key={r.key}
            style={styles.row}
            onPress={r.onPress}
            activeOpacity={0.6}
          >
            <View style={styles.iconBox}>{r.icon}</View>
            <Text style={styles.label}>{r.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Rate App */}
      <Modal
        visible={rateOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRateOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.backdrop}
        >
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Rate {APP_NAME}</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity
                  key={n}
                  onPress={() => setRating(n)}
                  hitSlop={6}
                >
                  <Ionicons
                    name={n <= rating ? "star" : "star-outline"}
                    size={38}
                    color={C.star}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Tell us more (optional)"
              placeholderTextColor="#888"
              value={comment}
              onChangeText={setComment}
              multiline
              maxLength={500}
            />
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setRateOpen(false)}
                disabled={busy}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sendBtn}
                onPress={submitRating}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.sendText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Feedback */}
      <Modal
        visible={feedbackOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setFeedbackOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.backdrop}
        >
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Send feedback</Text>
            <TextInput
              style={[styles.input, { minHeight: 120 }]}
              placeholder="Write your feedback here"
              placeholderTextColor="#888"
              value={feedback}
              onChangeText={setFeedback}
              multiline
              maxLength={1000}
              textAlignVertical="top"
            />
            <Text style={styles.counter}>{feedback.length}/1000</Text>
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setFeedbackOpen(false)}
                disabled={busy}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sendBtn}
                onPress={submitFeedback}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.sendText}>Send</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  back: { marginRight: 24 },
  title: { fontSize: 20, fontWeight: "800", color: C.ink },
  list: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30 },
  row: { flexDirection: "row", alignItems: "center", height: 68 },
  iconBox: { width: 34, alignItems: "flex-start" },
  label: { fontSize: 16, fontWeight: "700", color: C.ink, marginLeft: 8 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  sheet: {
    width: "88%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: C.ink,
    textAlign: "center",
    marginBottom: 14,
  },
  stars: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#D9C9C8",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: C.ink,
    minHeight: 70,
    backgroundColor: "#FFFAF9",
  },
  counter: { alignSelf: "flex-end", fontSize: 11, color: "#777", marginTop: 4 },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEE",
  },
  cancelText: { fontWeight: "700", color: "#333" },
  sendBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.blue,
  },
  sendText: { fontWeight: "700", color: "#fff" },
});
