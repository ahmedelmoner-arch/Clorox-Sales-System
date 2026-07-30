import {
  BottomNavigation as MuiBottomNavigation,
  BottomNavigationAction,
  Paper,
} from "@mui/material";

import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import AddCircleRoundedIcon from "@mui/icons-material/AddCircleRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";

import { useLocation, useNavigate } from "react-router-dom";
import { useMemo } from "react";

export default function BottomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const value = useMemo(() => {
    if (location.pathname.includes("visit")) return 1;
    if (location.pathname.includes("report")) return 2;
    if (location.pathname.includes("profile")) return 3;
    return 0;
  }, [location.pathname]);

  return (
    <Paper
      elevation={8}
      sx={{
        position: "fixed",
        bottom: 15,
        left: "50%",
        transform: "translateX(-50%)",
        width: {
          xs: "95%",
          sm: 500,
        },
        borderRadius: 5,
        overflow: "hidden",
        zIndex: 999,
        backdropFilter: "blur(20px)",
        background: "rgba(255,255,255,.92)",
      }}
    >
      <MuiBottomNavigation
        value={value}
        showLabels
        onChange={(e, newValue) => {
          switch (newValue) {
            case 0:
              navigate("/dashboard");
              break;

            case 1:
              navigate("/visit");
              break;

            case 2:
              navigate("/reports");
              break;

            case 3:
              navigate("/profile");
              break;

            default:
              break;
          }
        }}
        sx={{
          height: 72,

          "& .Mui-selected": {
            color: "#0057FF",
            fontWeight: "bold",
          },
        }}
      >
        <BottomNavigationAction
          label="الرئيسية"
          icon={<DashboardRoundedIcon />}
        />

        <BottomNavigationAction
          label="زيارة"
          icon={<AddCircleRoundedIcon />}
        />

        <BottomNavigationAction
          label="التقارير"
          icon={<DescriptionRoundedIcon />}
        />

        <BottomNavigationAction
          label="حسابي"
          icon={<PersonRoundedIcon />}
        />
      </MuiBottomNavigation>
    </Paper>
  );
}