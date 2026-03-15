import { Navigate, Route, Routes } from "react-router-dom";
import Shell from "./components/Shell";
import { useAuth } from "./context/AuthContext";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import EventsPage from "./pages/EventsPage";
import UserDashboardPage from "./pages/UserDashboardPage";
import OrganizerDashboardPage from "./pages/OrganizerDashboardPage";
import DonationsPage from "./pages/DonationsPage";
import ContactPage from "./pages/ContactPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";

function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/donations" element={<DonationsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute roles={["user", "organizer", "admin"]}>
              <UserDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizer"
          element={
            <ProtectedRoute roles={["organizer", "admin"]}>
              <OrganizerDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute roles={["user", "organizer", "admin"]}>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute roles={["user", "organizer", "admin"]}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Shell>
  );
}
