import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import GoogleLogo from "../components/Google";
import { APP_NAME, APP_TAGLINE } from "../lib/Brand";
import { supabase } from "../lib/supabase";

// Lets the browser window close itself after Google / Facebook sign-in
WebBrowser.maybeCompleteAuthSession();

type Mode = "login" | "signup" | "forgot";

const C = {
  teal: "#0B6E6E",
  tealDark: "#083F3F",
  mint: "#F2FAF8",
  line: "#9FD3CB",
  cross: "#E5484D",
  muted: "#5B7B7A",
} as const;

interface FieldProps extends TextInputProps {
  icon: keyof typeof Ionicons.glyphMap;
  secure?: boolean;
  show?: boolean;
  onToggle?: () => void;
}

function Field({ icon, secure, show, onToggle, ...props }: FieldProps) {
  const [focused, setFocused] = useState<boolean>(false);
  return (
    <View style={[styles.field, focused && styles.fieldFocus]}>
      <Ionicons
        name={icon}
        size={20}
        color={C.muted}
        style={{ marginRight: 10 }}
      />
      <TextInput
        style={styles.input}
        placeholderTextColor={C.muted}
        autoCapitalize="none"
        secureTextEntry={secure && !show}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
      {secure && (
        <TouchableOpacity onPress={onToggle} hitSlop={10}>
          <Ionicons
            name={show ? "eye-off-outline" : "eye-outline"}
            size={20}
            color={C.muted}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>("login");
  const [studentId, setStudentId] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirm, setConfirm] = useState<string>("");
  const [showPw, setShowPw] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);
  const [socialBusy, setSocialBusy] = useState<"google" | "facebook" | null>(
    null,
  );
  const [error, setError] = useState<string>("");

  const go = (m: Mode): void => {
    setMode(m);
    setError("");
    setPassword("");
    setConfirm("");
  };

  const emailFor = async (sid: string): Promise<string | null> => {
    const { data, error: e } = await supabase.rpc("get_email_by_student_id", {
      sid: sid.trim(),
    });
    if (e) throw e;
    return (data as string | null) ?? null;
  };

  const handleLogin = async (): Promise<void> => {
    if (!studentId.trim() || !password) {
      setError("Enter your Student ID and password.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const mail = await emailFor(studentId);
      if (!mail) throw new Error("not-found");
      const { error: e } = await supabase.auth.signInWithPassword({
        email: mail,
        password,
      });
      if (e) throw e;
    } catch {
      setError("Student ID or password is incorrect.");
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async (): Promise<void> => {
    if (!studentId.trim() || !fullName.trim() || !email.trim() || !password) {
      setError("Fill in all fields.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { data, error: e } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { student_id: studentId.trim(), full_name: fullName.trim() },
        },
      });
      if (e) {
        if (/database error/i.test(e.message)) {
          throw new Error("That Student ID is already registered.");
        }
        throw e;
      }
      if (!data.session) {
        Alert.alert(
          "Check your email",
          "We sent a confirmation link. Confirm it, then log in.",
        );
        go("login");
      }
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Could not create your account.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleForgot = async (): Promise<void> => {
    if (!studentId.trim()) {
      setError("Enter your Student ID.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const mail = await emailFor(studentId);
      if (mail) await supabase.auth.resetPasswordForEmail(mail);
      Alert.alert(
        "Check your email",
        "If that Student ID is registered, a reset link is on its way.",
      );
      go("login");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  // Google / Facebook sign-in through Supabase
  const handleSocial = async (
    provider: "google" | "facebook",
  ): Promise<void> => {
    setSocialBusy(provider);
    setError("");
    try {
      const redirectTo = Linking.createURL("/");
      // Add this exact URL to Supabase > Authentication > URL Configuration > Redirect URLs
      console.log("Supabase redirect URL:", redirectTo);

      const { data, error: e } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (e || !data?.url) throw e ?? new Error("Could not start sign-in.");

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo,
      );
      if (result.type !== "success") return; // the student closed the window

      const url = result.url;
      const query = url.includes("#")
        ? url.split("#")[1]
        : (url.split("?")[1] ?? "");
      const params = new URLSearchParams(query);

      const failure = params.get("error_description");
      if (failure) throw new Error(failure);

      const code = params.get("code");
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (code) {
        const { error: ex } = await supabase.auth.exchangeCodeForSession(code);
        if (ex) throw ex;
      } else if (accessToken && refreshToken) {
        const { error: es } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (es) throw es;
      } else {
        throw new Error("Sign-in did not finish. Please try again.");
      }
      // On success, index.tsx notices the new session and opens the dashboard
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not sign in. Please try again.",
      );
    } finally {
      setSocialBusy(null);
    }
  };

  const submit: () => Promise<void> =
    mode === "login"
      ? handleLogin
      : mode === "signup"
        ? handleSignUp
        : handleForgot;
  const label =
    mode === "login"
      ? "Login"
      : mode === "signup"
        ? "Create account"
        : "Send reset link";
  const heading =
    mode === "login"
      ? "Login to your account"
      : mode === "signup"
        ? "Create your account"
        : "Reset your password";

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand */}
          <View style={styles.logo}>
            <View style={styles.crossV} />
            <View style={styles.crossH} />
          </View>
          <Text style={styles.title}>{APP_NAME}</Text>
          <Text style={styles.subtitle}>{APP_TAGLINE}</Text>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.heading}>{heading}</Text>

            <Field
              icon="id-card-outline"
              placeholder="Student ID"
              value={studentId}
              onChangeText={setStudentId}
            />

            {mode === "signup" && (
              <>
                <Field
                  icon="person-outline"
                  placeholder="Full name"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
                <Field
                  icon="mail-outline"
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                />
              </>
            )}

            {mode !== "forgot" && (
              <Field
                icon="lock-closed-outline"
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secure
                show={showPw}
                onToggle={() => setShowPw(!showPw)}
              />
            )}

            {mode === "signup" && (
              <Field
                icon="lock-closed-outline"
                placeholder="Confirm password"
                value={confirm}
                onChangeText={setConfirm}
                secure
                show={showPw}
                onToggle={() => setShowPw(!showPw)}
              />
            )}

            {mode === "login" && (
              <TouchableOpacity
                onPress={() => go("forgot")}
                style={styles.forgot}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            {!!error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={[styles.btn, busy && { opacity: 0.7 }]}
              onPress={submit}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>{label}</Text>
              )}
            </TouchableOpacity>

            {mode === "login" ? (
              <TouchableOpacity
                onPress={() => go("signup")}
                style={styles.link}
              >
                <Text style={styles.linkText}>Sign Up</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => go("login")} style={styles.link}>
                <Text style={styles.linkText}>Back to login</Text>
              </TouchableOpacity>
            )}

            {mode !== "forgot" && (
              <>
                <View style={styles.orRow}>
                  <View style={styles.orLine} />
                  <Text style={styles.orText}>or continue with</Text>
                  <View style={styles.orLine} />
                </View>

                <TouchableOpacity
                  style={[styles.socialBtn, styles.googleBtn]}
                  onPress={() => handleSocial("google")}
                  disabled={!!socialBusy || busy}
                >
                  {socialBusy === "google" ? (
                    <ActivityIndicator color="#333" />
                  ) : (
                    <>
                      <GoogleLogo size={20} />
                      <Text style={styles.googleText}>
                        Continue with Google
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.socialBtn, styles.fbBtn]}
                  onPress={() => handleSocial("facebook")}
                  disabled={!!socialBusy || busy}
                >
                  {socialBusy === "facebook" ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="logo-facebook" size={20} color="#fff" />
                      <Text style={styles.fbText}>Continue with Facebook</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.mint },
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderWidth: 2,
    borderColor: C.line,
  },
  crossV: {
    position: "absolute",
    width: 14,
    height: 40,
    borderRadius: 4,
    backgroundColor: C.cross,
  },
  crossH: {
    position: "absolute",
    width: 40,
    height: 14,
    borderRadius: 4,
    backgroundColor: C.cross,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: C.tealDark,
    letterSpacing: 1.5,
  },
  subtitle: { fontSize: 14, color: C.muted, marginTop: 4, marginBottom: 24 },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 22,
    shadowColor: C.tealDark,
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  heading: {
    fontSize: 20,
    fontWeight: "700",
    color: C.tealDark,
    textAlign: "center",
    marginBottom: 18,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.line,
    backgroundColor: "#FAFEFD",
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  fieldFocus: { borderColor: C.teal },
  input: { flex: 1, fontSize: 16, color: C.tealDark },
  forgot: { alignSelf: "flex-start", marginBottom: 14 },
  forgotText: { fontSize: 13, fontWeight: "600", color: C.tealDark },
  error: {
    color: C.cross,
    fontSize: 13,
    marginBottom: 12,
    textAlign: "center",
  },
  btn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: C.teal,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  link: { alignItems: "center", marginTop: 16 },
  linkText: { fontSize: 15, fontWeight: "700", color: C.tealDark },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 14,
  },
  orLine: { flex: 1, height: 1, backgroundColor: C.line },
  orText: { marginHorizontal: 10, fontSize: 12, color: C.muted },
  socialBtn: {
    height: 48,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  googleBtn: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#DADCE0",
  },
  googleText: {
    marginLeft: 10,
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
  },
  fbBtn: { backgroundColor: "#1877F2" },
  fbText: { marginLeft: 10, fontSize: 15, fontWeight: "700", color: "#fff" },
});
