import AdminGate from "../components/AdminGate";
import AdminFeedbackScreen from "../screen/AdminFeedbackScreen";

export default function AdminFeedback() {
  return (
    <AdminGate>
      <AdminFeedbackScreen />
    </AdminGate>
  );
}
