import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../lib/supabase";
import LoadingCircle from "./LoadingCircle";

type Access = "checking" | "ok" | "denied";

// Wrap an admin screen with this. Students who reach it by accident are turned away.
// (The real protection is the database rules in supabase_admin.sql.)
export default function AdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [access, setAccess] = useState<Access>("checking");

  useEffect(() => {
    supabase.rpc("is_admin").then(({ data, error }) => {
      setAccess(!error && data === true ? "ok" : "denied");
    });
  }, []);

  if (access === "checking") {
    return (
      <View style={styles.center}>
        <LoadingCircle label="Checking access…" />
      </View>
    );
  }

  if (access === "denied") {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>This area is for admins only.</Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/")
          }
        >
          <Text style={styles.btnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8E7E6",
  },
  text: { fontSize: 15, fontWeight: "600", color: "#111" },
  btn: {
    marginTop: 14,
    backgroundColor: "#1A1AFF",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  btnText: { color: "#fff", fontWeight: "700" },
});
