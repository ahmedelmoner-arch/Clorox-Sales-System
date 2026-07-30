import { BottomNavigation, BottomNavigationAction, Paper } from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AddBusinessIcon from "@mui/icons-material/AddBusiness";
import AssessmentIcon from "@mui/icons-material/Assessment";
import PersonIcon from "@mui/icons-material/Person";

import { useLocation, useNavigate } from "react-router-dom";

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const routes = {
    "/dashboard": 0,
    "/visit": 1,
    "/reports": 2,
    "/profile": 3,
  };

  const pages = [
    "/dashboard",
    "/visit",
    "/reports",
    "/profile",
  ];

  return (
    <Paper
      elevation={10}
      sx={{
        position: "fixed",
        bottom: 15,
        left: "50%",
        transform: "translateX(-50%)",
        width: "95%",
        maxWidth: 650,
        borderRadius: 4,
        overflow: "hidden",
        zIndex: 9999,
      }}
    >
      <BottomNavigation
        value={routes[location.pathname] ?? 0}
        onChange={(e, value) => navigate(pages[value])}
        showLabels
      >
        <BottomNavigationAction
          label="الرئيسية"
          icon={<DashboardIcon />}
        />

        <BottomNavigationAction
          label="زيارة"
          icon={<AddBusinessIcon />}
        />

        <BottomNavigationAction
          label="التقارير"
          icon={<AssessmentIcon />}
        />

        <BottomNavigationAction
          label="حسابي"
          icon={<PersonIcon />}
        />
      </BottomNavigation>
    </Paper>
  );
}