import { Avatar, Box, Button, Card, CardContent, Divider, Stack, Typography } from "@mui/material";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import AppShell from "../../components/layout/AppShell";
import { useSession } from "../../context/SessionContext";
import { useNavigate } from "react-router-dom";

export default function ProfilePage() {
  const { user, logout } = useSession();
  const navigate = useNavigate();
  const name = user?.delegateName || user?.name || "مندوبة المبيعات";
  return <AppShell><Typography variant="h5" fontWeight={900} sx={{ mb: 2.5 }}>حسابي</Typography><Card elevation={0} sx={{ maxWidth: 620, mx: "auto", border: "1px solid #e8edf7", borderRadius: 4 }}><CardContent sx={{ p: 3 }}><Stack alignItems="center" spacing={1.25}><Avatar sx={{ width: 86, height: 86, fontSize: 32, bgcolor: "#e9f1ff", color: "primary.main" }}>{name.charAt(0)}</Avatar><Typography variant="h6" fontWeight={900}>{name}</Typography><Typography color="text.secondary">{user?.role === "Delegate" ? "مندوبة مبيعات" : user?.role || "مستخدم"}</Typography></Stack><Divider sx={{ my: 3 }} /><Stack spacing={2}>{[["كود المندوبة", user?.delegateId || "—"], ["كود المشرف", user?.supervisorCode || "—"], ["الدور", user?.role || "—"]].map(([label, value]) => <Stack key={label} direction="row" justifyContent="space-between"><Typography color="text.secondary">{label}</Typography><Typography fontWeight={800}>{value}</Typography></Stack>)}</Stack><Button fullWidth color="error" variant="outlined" endIcon={<LogoutRoundedIcon />} sx={{ mt: 4 }} onClick={() => { logout(); navigate("/login"); }}>تسجيل الخروج</Button></CardContent></Card></AppShell>;
}
