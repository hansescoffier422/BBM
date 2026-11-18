import type { Session } from "@supabase/supabase-js";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import SplashScreen from "../components/SplashScreen";
import { supabase } from "../lib/supabase";
import AdminDashboardScreen from "../screen/AdminDashboardScreen";
import AuthScreen from "../screen/AuthScreen";
import DashboardScreen from "../screen/DashboardScreen";

export default function Index() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [splashDone, setSplashDone] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const finishSplash = useCallback(() => setSplashDone(true), []);
  const userId = session?.user.id;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) =>
      setSession(s),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  // Find out whether the signed-in person is an admin or a student
  useEffect(() => {
    if (!userId) {
      setIsAdmin(null);
      return;
    }
    let active = true;
    supabase.rpc("is_admin").then(({ data }) => {
      if (active) setIsAdmin(data === true);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  // 1. Splash with the loading bar
  if (!splashDone) return <SplashScreen onFinish={finishSplash} />;

  // 2. Loading, while the session / role check is still running
  if (loading || (session && isAdmin === null)) {
    return (
      <View style={styles.center}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  // 3. Login form, student dashboard, or admin dashboard
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {!session ? (
        <AuthScreen />
      ) : isAdmin ? (
        <AdminDashboardScreen session={session} />
      ) : (
        <DashboardScreen session={session} />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B6E6E",
  },
  loadingText: {
    color: "#D9F2EC",
    fontSize: 12,
    marginTop: 12,
    letterSpacing: 1,
  },
});
