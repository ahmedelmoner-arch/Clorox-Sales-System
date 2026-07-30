import { CircularProgress, Box } from "@mui/material";
import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useSession } from "./context/SessionContext";
import { normalizeRole, roleHome } from "./utils/roles";

const Login = lazy(() => import("./pages/Login/ReferenceLogin"));
const Dashboard = lazy(() => import("./pages/Dashboard/ReferenceDashboard"));
const NewVisit = lazy(() => import("./pages/NewVisit/NewVisitPage"));
const Reports = lazy(() => import("./pages/Reports/ReportsPage"));
const Vacation = lazy(() => import("./pages/Vacation/VacationPage"));
const Profile = lazy(() => import("./pages/Profile/ProfilePage"));
const Charts = lazy(() => import("./pages/Charts/ChartsPage"));
const Oversight = lazy(() => import("./pages/Oversight/OversightPage"));

function RouteLoader() {
  return <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}><CircularProgress /></Box>;
}

function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, ready, user } = useSession();
  if (!ready) return <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}><CircularProgress /></Box>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles?.length && !roles.includes(normalizeRole(user?.role))) return <Navigate to={roleHome(user?.role)} replace />;
  return children;
}

function HomeRedirect() {
  const { isAuthenticated, ready, user } = useSession();
  if (!ready) return <RouteLoader />;
  return <Navigate to={isAuthenticated ? roleHome(user?.role) : "/login"} replace />;
}

export default function App() {
  return (
    <Suspense fallback={<RouteLoader />}><Routes>

      <Route path="/" element={<HomeRedirect />} />

      <Route path="/login" element={<Login />} />

      <Route path="/dashboard" element={<ProtectedRoute roles={["Delegate"]}><Dashboard /></ProtectedRoute>} />

      <Route path="/visit" element={<ProtectedRoute roles={["Delegate"]}><NewVisit /></ProtectedRoute>} />

      <Route path="/reports" element={<ProtectedRoute roles={["Delegate"]}><Reports /></ProtectedRoute>} />

      <Route path="/vacation" element={<ProtectedRoute roles={["Delegate"]}><Vacation /></ProtectedRoute>} />

      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

      <Route path="/charts" element={<ProtectedRoute roles={["Delegate"]}><Charts /></ProtectedRoute>} />

      <Route path="/oversight" element={<ProtectedRoute roles={["Supervisor", "Management"]}><Oversight /></ProtectedRoute>} />

    </Routes></Suspense>
  );
}
