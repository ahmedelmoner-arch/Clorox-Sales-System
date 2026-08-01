import { Box, IconButton, Paper, Typography } from "@mui/material";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import SpaceDashboardRoundedIcon from "@mui/icons-material/SpaceDashboardRounded";
import { useLocation, useNavigate } from "react-router-dom";
import { preloadRoute } from "../../utils/page-preload";
import "../../styles/reference.css";

const items = [
  { label: "الرئيسية", path: "/dashboard", icon: <HomeRoundedIcon /> },
  { label: "تقاريري", path: "/reports", icon: <AssessmentRoundedIcon /> },
  { label: "إضافة", path: "/visit", icon: <AddRoundedIcon />, primary: true },
  { label: "تحليل", path: "/charts", icon: <SpaceDashboardRoundedIcon /> },
  { label: "حسابي", path: "/profile", icon: <PersonRoundedIcon /> },
];

export default function ReferenceNavigation() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const goTo = (path) => {
    preloadRoute(path);
    navigate(path);
  };
  const preloadHandlers = (path) => ({
    onFocus: () => preloadRoute(path),
    onMouseEnter: () => preloadRoute(path),
    onTouchStart: () => preloadRoute(path),
  });
  return <Paper elevation={0} className="reference-nav" sx={{ position: "fixed", zIndex: 25, bottom: { xs: 10, sm: 18 }, left: "50%", transform: "translateX(-50%)", width: { xs: "calc(100% - 20px)", sm: 620 }, borderRadius: 4, border: "1px solid #e0e6f0", boxShadow: "0 15px 35px rgba(24,48,93,.16)" }}><Box sx={{ height: 78, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", alignItems: "center", textAlign: "center" }}>{items.map((item) => {
    const selected = pathname === item.path && !item.primary;
    if (item.primary) return <Box key={item.label} {...preloadHandlers(item.path)}><IconButton className="reference-add-button" onClick={() => goTo(item.path)} aria-label="إضافة تقرير"><AddRoundedIcon sx={{ fontSize: 34 }} /></IconButton><Typography variant="caption" display="block" fontWeight={800} color="primary.main" sx={{ mt: -0.3 }}>تقرير جديد</Typography></Box>;
    return <Box key={item.label} role="button" tabIndex={0} onClick={() => goTo(item.path)} onKeyDown={(event) => event.key === "Enter" && goTo(item.path)} {...preloadHandlers(item.path)} sx={{ cursor: "pointer", color: selected ? "#075be1" : "#8b98b3", transition: "color .2s", "&:hover": { color: "#075be1" } }}>{item.icon}<Typography variant="caption" display="block" fontWeight={selected ? 900 : 700} sx={{ fontSize: { xs: 9, sm: 11 }, lineHeight: 1.15 }}>{item.label}</Typography></Box>;
  })}</Box></Paper>;
}
