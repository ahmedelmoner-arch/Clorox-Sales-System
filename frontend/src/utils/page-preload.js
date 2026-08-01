export const pageLoaders = {
  "/login": () => import("../pages/Login/ReferenceLogin"),
  "/dashboard": () => import("../pages/Dashboard/ReferenceDashboard"),
  "/visit": () => import("../pages/NewVisit/NewVisitPage"),
  "/reports": () => import("../pages/Reports/ReportsPage"),
  "/vacation": () => import("../pages/Vacation/VacationPage"),
  "/profile": () => import("../pages/Profile/ProfilePage"),
  "/charts": () => import("../pages/Charts/ChartsPage"),
  "/oversight": () => import("../pages/Oversight/OversightPage"),
  "/invoices": () => import("../pages/Oversight/InvoiceAnalysisPage"),
  "/product-guide": () => import("../pages/ProductGuide/ProductGuidePage"),
};

export function preloadRoute(path) {
  const load = pageLoaders[path];
  if (!load) return;
  load().catch(() => undefined);
}
