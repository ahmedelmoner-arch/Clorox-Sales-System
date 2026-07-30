import { BottomNavigation, BottomNavigationAction, Paper } from "@mui/material";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import AddCircleRoundedIcon from "@mui/icons-material/AddCircleRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import { useLocation, useNavigate } from "react-router-dom";

const items = [
  { label: "الرئيسية", path: "/dashboard", icon: <DashboardRoundedIcon /> },
  { label: "إضافة تقرير", path: "/visit", icon: <AddCircleRoundedIcon /> },
  { label: "تقاريري", path: "/reports", icon: <DescriptionRoundedIcon /> },
  { label: "حسابي", path: "/profile", icon: <PersonRoundedIcon /> },
];

export default function AppNavigation() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const active = Math.max(0, items.findIndex((item) => pathname.startsWith(item.path)));

  return (
    <Paper elevation={0} sx={{ position: "fixed", zIndex: 20, bottom: { xs: 12, md: 24 }, left: "50%", transform: "translateX(-50%)", width: { xs: "calc(100% - 24px)", sm: 540 }, border: "1px solid #e4eaf5", borderRadius: 4, overflow: "hidden", boxShadow: "0 12px 35px rgba(28, 57, 111, .14)" }}>
      <BottomNavigation value={active} showLabels onChange={(_, value) => navigate(items[value].path)} sx={{ height: 72, bgcolor: "rgba(255,255,255,.96)", "& .Mui-selected": { color: "primary.main", fontWeight: 800 } }}>
        {items.map((item) => <BottomNavigationAction key={item.path} label={item.label} icon={item.icon} />)}
      </BottomNavigation>
    </Paper>
  );
}
