import { CircularProgress, Box } from "@mui/material";
import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useSession } from "./context/SessionContext";
import { normalizeRole, roleHome } from "./utils/roles";
import { pageLoaders, preloadRoute } from "./utils/page-preload";

const Login = lazy(pageLoaders["/login"]);
const Dashboard = lazy(pageLoaders["/dashboard"]);
const NewVisit = lazy(pageLoaders["/visit"]);
const Reports = lazy(pageLoaders["/reports"]);
const Vacation = lazy(pageLoaders["/vacation"]);
const Profile = lazy(pageLoaders["/profile"]);
const Charts = lazy(pageLoaders["/charts"]);
const Oversight = lazy(pageLoaders["/oversight"]);
const ProductGuide = lazy(pageLoaders["/product-guide"]);

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
  const { isAuthenticated, user } = useSession();

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const paths = normalizeRole(user?.role) === "Delegate"
      ? ["/visit", "/reports", "/profile"]
      : ["/profile"];
    const preload = () => paths.forEach(preloadRoute);
    const supportsIdleCallback = typeof window.requestIdleCallback === "function";
    const idleCallback = supportsIdleCallback ? window.requestIdleCallback(preload, { timeout: 1600 }) : undefined;
    const timeout = supportsIdleCallback ? undefined : window.setTimeout(preload, 700);
    return () => {
      if (supportsIdleCallback) window.cancelIdleCallback?.(idleCallback);
      else window.clearTimeout(timeout);
    };
  }, [isAuthenticated, user?.role]);

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

      <Route path="/product-guide" element={<ProtectedRoute><ProductGuide /></ProtectedRoute>} />

      <Route path="/oversight" element={<ProtectedRoute roles={["Supervisor", "Management"]}><Oversight /></ProtectedRoute>} />

    </Routes></Suspense>
  );
}
