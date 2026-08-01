import { Avatar, Box, Button, Container, Stack, Typography, useTheme } from "@mui/material";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import { useNavigate } from "react-router-dom";
import { useSession } from "../../context/SessionContext";
import AppNavigation from "../navigation/ReferenceNavigation";
import ThemeModeToggle from "../common/ThemeModeToggle";

export default function AppShell({ children, hideHeader = false, hideNavigation = false }) {
  const navigate = useNavigate();
  const { user, logout } = useSession();
  const theme = useTheme();
  const name = user?.delegateName || user?.name || "مندوبة المبيعات";

  return (
    <Box sx={{ minHeight: "100vh", pb: 12, bgcolor: "background.default", color: "text.primary", transition: "background-color .2s ease, color .2s ease" }}>
      {hideHeader && <Box sx={{ position: "fixed", zIndex: 40, top: { xs: 12, sm: 18 }, left: { xs: 12, sm: 18 } }}><ThemeModeToggle /></Box>}
      {!hideHeader && <Box component="header" sx={{ bgcolor: "background.paper", borderBottom: "1px solid", borderColor: "divider" }}>
        <Container maxWidth="lg" sx={{ minHeight: 74, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Box component="img" src="/clorox.png" alt="Clorox" sx={{ width: 48, height: 48, objectFit: "contain" }} />
            <Box><Typography fontWeight={900} color={theme.palette.mode === "dark" ? "#dce9ff" : "#12295a"}>Clorox Sales</Typography><Typography variant="caption" color="text.secondary">نظام تقارير المندوبات</Typography></Box>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ display: { xs: "none", sm: "block" }, textAlign: "left" }}><Typography variant="body2" fontWeight={800}>{name}</Typography><Typography variant="caption" color="text.secondary">{user?.role === "Delegate" ? "مندوبة مبيعات" : user?.role}</Typography></Box>
            <Avatar src={user?.avatarUrl || undefined} sx={{ bgcolor: "#e8f0ff", color: "primary.main", fontWeight: 800 }}>{name.charAt(0)}</Avatar>
            {user?.role === "Management" && <Button size="small" startIcon={<ReceiptLongOutlinedIcon />} onClick={() => navigate("/invoices")}>تحليل الفواتير</Button>}
            <ThemeModeToggle />
            <Button onClick={() => { logout(); navigate("/login"); }} color="inherit" aria-label="تسجيل الخروج" sx={{ minWidth: 40, p: 1 }}><LogoutRoundedIcon /></Button>
          </Stack>
        </Container>
      </Box>}
      <Container maxWidth="lg" sx={{ pt: { xs: 2, sm: 3 } }}>{children}</Container>
      {!hideNavigation && <AppNavigation />}
    </Box>
  );
}
