import AdminGate from "../components/AdminGate";
import AdminDoctorsScreen from "../screen/AdminDoctorScreen";

export default function AdminDoctors() {
  return (
    <AdminGate>
      <AdminDoctorsScreen />
    </AdminGate>
  );
}
