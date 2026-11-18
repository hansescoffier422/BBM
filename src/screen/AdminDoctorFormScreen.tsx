import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  KeyboardTypeOptions,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LoadingCircle from "../components/LoadingCircle";
import ScreenHeader from "../components/ScreenHeader";
import { errText } from "../lib/errors";
import { supabase } from "../lib/supabase";

interface Specialty {
  id: string;
  name: string;
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  placeholder?: string;
}

const C = { bg: "#F8E7E6", ink: "#111111", blue: "#1A1AFF" } as const;

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  multiline,
  placeholder,
}: FieldProps) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          multiline && { minHeight: 100, textAlignVertical: "top" },
        ]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor="#999"
        autoCapitalize={multiline ? "sentences" : "words"}
      />
    </View>
  );
}

// Empty text -> null, text that is not a number -> NaN
const toNum = (v: string): number | null => {
  const t = v.trim();
  return t === "" ? null : Number(t);
};

export default function AdminDoctorFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;

  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [fullName, setFullName] = useState<string>("");
  const [specialtyId, setSpecialtyId] = useState<string | null>(null);
  const [location, setLocation] = useState<string>("Bipsu Main Campus");
  const [rating, setRating] = useState<string>("0");
  const [reviewCount, setReviewCount] = useState<string>("0");
  const [patients, setPatients] = useState<string>("0");
  const [experience, setExperience] = useState<string>("");
  const [distance, setDistance] = useState<string>("");
  const [fee, setFee] = useState<string>("0");
  const [minutes, setMinutes] = useState<string>("30");
  const [about, setAbout] = useState<string>("");
  const [available, setAvailable] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        const sp = await supabase
          .from("specialties")
          .select("id, name")
          .order("sort_order");
        if (sp.error) throw sp.error;
        setSpecialties(sp.data as Specialty[]);

        if (id) {
          const { data, error } = await supabase
            .from("doctors")
            .select("*")
            .eq("id", id)
            .single();
          if (error) throw error;
          setFullName(data.full_name ?? "");
          setSpecialtyId(data.specialty_id ?? null);
          setLocation(data.location ?? "");
          setRating(String(data.rating ?? 0));
          setReviewCount(String(data.review_count ?? 0));
          setPatients(String(data.patients_count ?? 0));
          setExperience(data.experience ?? "");
          setDistance(data.distance_km != null ? String(data.distance_km) : "");
          setFee(String(data.consultation_fee ?? 0));
          setMinutes(String(data.session_minutes ?? 30));
          setAbout(data.about ?? "");
          setAvailable(!!data.available_today);
        }
      } catch (err: unknown) {
        Alert.alert("Could not load", errText(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const save = async (): Promise<void> => {
    if (!fullName.trim())
      return void Alert.alert("Missing name", "Enter the doctor's full name.");
    if (!specialtyId)
      return void Alert.alert("Missing speciality", "Choose a speciality.");

    const r = toNum(rating);
    const rc = toNum(reviewCount);
    const pc = toNum(patients);
    const dist = toNum(distance);
    const f = toNum(fee);
    const m = toNum(minutes);

    const bad = [r, rc, pc, dist, f, m].some(
      (n) => n !== null && !Number.isFinite(n),
    );
    if (bad)
      return void Alert.alert(
        "Check the numbers",
        "Rating, reviews, patients, distance, fee and minutes must be numbers.",
      );
    if (r !== null && (r < 0 || r > 5))
      return void Alert.alert("Rating", "Rating must be between 0 and 5.");

    const payload = {
      full_name: fullName.trim(),
      specialty_id: specialtyId,
      location: location.trim() || null,
      rating: Math.round((r ?? 0) * 10) / 10,
      review_count: Math.round(rc ?? 0),
      patients_count: Math.round(pc ?? 0),
      experience: experience.trim() || null,
      distance_km: dist,
      consultation_fee: f ?? 0,
      session_minutes: Math.round(m ?? 30),
      about: about.trim() || null,
      available_today: available,
    };

    setSaving(true);
    try {
      const { error } = editing
        ? await supabase.from("doctors").update(payload).eq("id", id)
        : await supabase.from("doctors").insert(payload);
      if (error) throw error;
      Alert.alert("Saved", editing ? "Doctor updated." : "Doctor added.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: unknown) {
      Alert.alert("Could not save", errText(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScreenHeader title={editing ? "Edit Doctor" : "Add Doctor"} />

      {loading ? (
        <View style={styles.center}>
          <LoadingCircle label="Loading…" />
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Field
              label="Full name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Dr. Juan Dela Cruz"
            />

            <Text style={styles.label}>Speciality</Text>
            <View style={styles.chips}>
              {specialties.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.chip, specialtyId === s.id && styles.chipOn]}
                  onPress={() => setSpecialtyId(s.id)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      specialtyId === s.id && styles.chipTextOn,
                    ]}
                  >
                    {s.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Field
              label="Location"
              value={location}
              onChangeText={setLocation}
            />
            <View style={styles.two}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Rating (0–5)"
                  value={rating}
                  onChangeText={setRating}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Reviewers"
                  value={reviewCount}
                  onChangeText={setReviewCount}
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <View style={styles.two}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Patients"
                  value={patients}
                  onChangeText={setPatients}
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Experience"
                  value={experience}
                  onChangeText={setExperience}
                  placeholder="1 year"
                />
              </View>
            </View>
            <View style={styles.two}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Distance (km)"
                  value={distance}
                  onChangeText={setDistance}
                  keyboardType="decimal-pad"
                  placeholder="optional"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Session (mins)"
                  value={minutes}
                  onChangeText={setMinutes}
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <Field
              label="Consultation fee (₱)"
              value={fee}
              onChangeText={setFee}
              keyboardType="decimal-pad"
            />
            <Field
              label="About"
              value={about}
              onChangeText={setAbout}
              multiline
              placeholder="Short description of the doctor"
            />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Available today</Text>
              <Switch
                value={available}
                onValueChange={setAvailable}
                trackColor={{ true: "#16C060", false: "#BBB" }}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
              onPress={save}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveText}>
                  {editing ? "Save changes" : "Add doctor"}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 80,
  },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  fieldWrap: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: "700", color: C.ink, marginBottom: 6 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: C.ink,
    borderWidth: 1,
    borderColor: "#E3D2D1",
  },
  two: { flexDirection: "row", gap: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E3D2D1",
  },
  chipOn: { backgroundColor: C.blue, borderColor: C.blue },
  chipText: { fontSize: 12, fontWeight: "700", color: C.ink },
  chipTextOn: { color: "#fff" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  switchLabel: { fontSize: 14, fontWeight: "700", color: C.ink },
  saveBtn: {
    height: 48,
    borderRadius: 8,
    backgroundColor: "#2A1AF5",
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
