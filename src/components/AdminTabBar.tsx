import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type AdminTab = "overview" | "doctors" | "feedback" | "users";

interface TabDef {
  key: AdminTab;
  label: string;
  on: keyof typeof Ionicons.glyphMap;
  off: keyof typeof Ionicons.glyphMap;
}

const TABS: TabDef[] = [
  { key: "overview", label: "Overview", on: "grid", off: "grid-outline" },
  { key: "doctors", label: "Doctors", on: "medkit", off: "medkit-outline" },
  {
    key: "feedback",
    label: "Feedback",
    on: "chatbox-ellipses",
    off: "chatbox-ellipses-outline",
  },
  { key: "users", label: "Users", on: "people", off: "people-outline" },
];

interface Props {
  active: AdminTab;
  onChange: (t: AdminTab) => void;
}

export default function AdminTabBar({ active, onChange }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { bottom: insets.bottom + 12 }]}>
      {TABS.map((t) => {
        const on = t.key === active;
        return (
          <TouchableOpacity
            key={t.key}
            style={[styles.item, on && styles.itemOn]}
            onPress={() => onChange(t.key)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={on ? t.on : t.off}
              size={22}
              color={on ? "#fff" : "#6B6B7B"}
            />
            {on && <Text style={styles.label}>{t.label}</Text>}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 18,
    right: 18,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
    shadowColor: "#1A1AFF",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  item: {
    height: 46,
    minWidth: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: 12,
  },
  itemOn: { backgroundColor: "#1A1AFF", paddingHorizontal: 16 },
  label: { color: "#fff", fontSize: 13, fontWeight: "700", marginLeft: 8 },
});
