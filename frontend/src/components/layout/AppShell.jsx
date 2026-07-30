import { Avatar, Box, Button, Container, Stack, Typography } from "@mui/material";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { useNavigate } from "react-router-dom";
import { useSession } from "../../context/SessionContext";
import AppNavigation from "../navigation/ReferenceNavigation";

export default function AppShell({ children, hideHeader = false, hideNavigation = false }) {
  const navigate = useNavigate();
  const { user, logout } = useSession();
  const name = user?.delegateName || user?.name || "مندوبة المبيعات";

  return (
    <Box sx={{ minHeight: "100vh", pb: 12, bgcolor: "#f5f7fc" }}>
      {!hideHeader && <Box component="header" sx={{ bgcolor: "#fff", borderBottom: "1px solid #e6ebf4" }}>
        <Container maxWidth="lg" sx={{ minHeight: 74, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Box component="img" src="/clorox.png" alt="Clorox" sx={{ width: 48, height: 48, objectFit: "contain" }} />
            <Box><Typography fontWeight={900} color="#12295a">Clorox Sales</Typography><Typography variant="caption" color="text.secondary">نظام تقارير المندوبات</Typography></Box>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ display: { xs: "none", sm: "block" }, textAlign: "left" }}><Typography variant="body2" fontWeight={800}>{name}</Typography><Typography variant="caption" color="text.secondary">{user?.role === "Delegate" ? "مندوبة مبيعات" : user?.role}</Typography></Box>
            <Avatar sx={{ bgcolor: "#e8f0ff", color: "primary.main", fontWeight: 800 }}>{name.charAt(0)}</Avatar>
            <Button onClick={() => { logout(); navigate("/login"); }} color="inherit" aria-label="تسجيل الخروج" sx={{ minWidth: 40, p: 1 }}><LogoutRoundedIcon /></Button>
          </Stack>
        </Container>
      </Box>}
      <Container maxWidth="lg" sx={{ pt: { xs: 2, sm: 3 } }}>{children}</Container>
      {!hideNavigation && <AppNavigation />}
    </Box>
  );
}
