import { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export interface Doctor {
  id: string;
  full_name: string;
  rating: number;
  review_count: number;
  location: string | null;
  available_today: boolean;
  specialty_id: string | null;
  specialties: { name: string } | null;
}

const C = {
  ink: "#111111",
  blue: "#1A1AFF",
  card: "#D9D9D9",
  viewBtn: "#CBD0F5",
  pillBg: "#C9F7D5",
  pillText: "#16C060",
  star: "#F5B301",
} as const;

export const initialsOf = (name: string): string =>
  name
    .replace(/^dr\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

interface Props {
  doctor: Doctor;
  onView?: (d: Doctor) => void;
}

export default function DoctorCard({ doctor: d, onView }: Props) {
  const router = useRouter();

  const handleView = (): void => {
    if (onView) return onView(d);
    // Opens the Doctor Profile screen, which shows a loading circle while it loads
    router.push({ pathname: "/doctor", params: { id: d.id } } as Href);
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsOf(d.full_name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {d.full_name}
            </Text>
            <Ionicons name="star" size={16} color={C.star} />
            <Text style={styles.rating}> {d.rating.toFixed(1)}</Text>
            <Text style={styles.reviews}> ({d.review_count})</Text>
          </View>
          <Text style={styles.spec}>{d.specialties?.name ?? "General"}</Text>
        </View>
      </View>

      {!!d.location && (
        <View style={styles.locRow}>
          <Ionicons name="location" size={20} color={C.ink} />
          <Text style={styles.locText}>{d.location}</Text>
        </View>
      )}

      {d.available_today && (
        <View style={styles.pill}>
          <Text style={styles.pillText}>Available Today</Text>
        </View>
      )}

      <TouchableOpacity style={styles.viewBtn} onPress={handleView}>
        <Text style={styles.viewBtnText}>View Doctor</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  cardTop: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 50,
    height: 44,
    borderRadius: 8,
    backgroundColor: C.blue,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  nameRow: { flexDirection: "row", alignItems: "center" },
  name: { flex: 1, fontSize: 14, fontWeight: "700", color: C.ink },
  rating: { fontSize: 14, fontWeight: "700", color: C.ink },
  reviews: { fontSize: 11, color: "#444" },
  spec: { fontSize: 11, fontWeight: "700", color: C.blue, marginTop: 4 },
  locRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginLeft: 8,
  },
  locText: { fontSize: 11, fontWeight: "600", color: C.ink, marginLeft: 12 },
  pill: {
    alignSelf: "flex-start",
    backgroundColor: C.pillBg,
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 2,
    marginTop: 6,
    marginLeft: 42,
  },
  pillText: { fontSize: 8, fontWeight: "700", color: C.pillText },
  viewBtn: {
    height: 40,
    borderRadius: 4,
    backgroundColor: C.viewBtn,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  viewBtnText: { fontSize: 15, fontWeight: "700", color: C.blue },
});
