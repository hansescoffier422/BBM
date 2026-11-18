import AdminGate from "../components/AdminGate";
import AdminDoctorFormScreen from "../screen/AdminDoctorFormScreen";

export default function AdminDoctorForm() {
  return (
    <AdminGate>
      <AdminDoctorFormScreen />
    </AdminGate>
  );
}
