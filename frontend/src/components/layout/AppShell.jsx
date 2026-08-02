import { Avatar, Box, Button, Chip, Container, Stack, Typography, useTheme } from "@mui/material";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import CloudDoneRoundedIcon from "@mui/icons-material/CloudDoneRounded";
import CloudSyncRoundedIcon from "@mui/icons-material/CloudSyncRounded";
import WifiOffRoundedIcon from "@mui/icons-material/WifiOffRounded";
import { useNavigate } from "react-router-dom";
import { useSession } from "../../context/SessionContext";
import { useOffline } from "../../context/OfflineContext";
import AppNavigation from "../navigation/ReferenceNavigation";
import ThemeModeToggle from "../common/ThemeModeToggle";

export default function AppShell({ children, hideHeader = false, hideNavigation = false }) {
  const navigate = useNavigate();
  const { user, logout } = useSession();
  const { isOnline, pendingCount, syncing, syncNow } = useOffline();
  const theme = useTheme();
  const isDelegate = user?.role === "Delegate";
  const showOfflineStatus = isDelegate && (!isOnline || pendingCount > 0 || syncing);
  const syncLabel = syncing
    ? "جارٍ إرسال التقارير المحفوظة"
    : !isOnline
      ? pendingCount ? `${pendingCount} تقرير بانتظار الاتصال` : "أنتِ غير متصلة بالإنترنت"
      : `${pendingCount} تقرير بانتظار الإرسال`;
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
      {showOfflineStatus && <Box sx={{ position: "fixed", zIndex: 1300, top: { xs: 12, sm: 18 }, right: { xs: 12, sm: 18 }, maxWidth: "calc(100vw - 24px)" }}>
        <Stack direction="row" spacing={.75} alignItems="center" sx={{ px: 1, py: .75, borderRadius: 3, bgcolor: isOnline ? "#fff8e8" : "#fff0f0", border: "1px solid", borderColor: isOnline ? "#f4d18d" : "#f2b8b5", boxShadow: "0 8px 20px rgba(23, 42, 73, .14)" }}>
          <Chip size="small" icon={syncing ? <CloudSyncRoundedIcon /> : isOnline ? <CloudDoneRoundedIcon /> : <WifiOffRoundedIcon />} label={syncLabel} color={isOnline ? "warning" : "error"} sx={{ maxWidth: { xs: 225, sm: 310 }, "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" } }} />
          {isOnline && pendingCount > 0 && <Button size="small" onClick={() => syncNow().catch(() => undefined)} disabled={syncing} sx={{ minWidth: 0, px: .8, whiteSpace: "nowrap" }}>مزامنة</Button>}
        </Stack>
      </Box>}
      <Container maxWidth="lg" sx={{ pt: { xs: 2, sm: 3 } }}>{children}</Container>
      {!hideNavigation && <AppNavigation />}
    </Box>
  );
}
