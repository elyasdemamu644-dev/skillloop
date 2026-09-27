import { Routes, Route } from "react-router-dom";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import DashboardPage from "@/pages/DashboardPage";
import MySkillsPage from "@/pages/MySkillsPage";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DiscoverPage from "@/pages/DiscoverPage";
import OfferingsPage from "@/pages/OfferingsPage";
import BrowseOfferingsPage from "@/pages/BrowseOfferingsPage";
import ExchangesPage from "@/pages/ExchangesPage";
import AvailabilityPage from "@/pages/AvailabilityPage";
import SessionsPage from "@/pages/SessionsPage";
import MessagesPage from "@/pages/MessagesPage";
import LearningPage from "@/pages/LearningPage";
import ReputationPage from "@/pages/ReputationPage";
import NotificationsPage from "@/pages/NotificationsPage";
import AdminPage from "@/pages/AdminPage";
import PaymentsPage from "@/pages/PaymentsPage";
import AIPage from "@/pages/AIPage";
import MaterialsPage from "@/pages/MaterialsPage";

// Phase 2 adds authentication routes and one protected page (Dashboard) to
// prove the whole login -> access -> refresh -> logout flow works.
// Phase 3 adds the protected /skills page for a user's teach/learn profile.
// Later phases add /discover, /exchanges, /sessions, etc.
export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/discover" element={<DiscoverPage />} />
      <Route path="/offerings/browse" element={<BrowseOfferingsPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/skills" element={<MySkillsPage />} />
        <Route path="/offerings" element={<OfferingsPage />} />
        <Route path="/exchanges" element={<ExchangesPage />} />
        <Route path="/sessions" element={<SessionsPage />} />
        <Route path="/availability" element={<AvailabilityPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/learning" element={<LearningPage />} />
        <Route path="/reputation" element={<ReputationPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/ai" element={<AIPage />} />
        <Route path="/materials" element={<MaterialsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Route>
    </Routes>
  );
}
