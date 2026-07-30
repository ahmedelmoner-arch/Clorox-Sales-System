import { useState } from "react";
import { Alert, Box, Button, CircularProgress, Divider, InputAdornment, Paper, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import SupervisorAccountRoundedIcon from "@mui/icons-material/SupervisorAccountRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useSession } from "../../context/SessionContext";
import { roleHome } from "../../utils/roles";
import "../../styles/reference.css";

const roles = [
  { value: "Delegate", label: "مندوبة", codeLabel: "كود المندوبة", icon: <PersonOutlineRoundedIcon /> },
  { value: "Supervisor", label: "مشرف", codeLabel: "كود المشرف", icon: <SupervisorAccountRoundedIcon /> },
  { value: "Management", label: "الإدارة", codeLabel: "كود الإدارة", icon: <ManageAccountsRoundedIcon /> },
];

export default function ReferenceLogin() {
  const navigate = useNavigate();
  const { login } = useSession();
  const [role, setRole] = useState("Delegate");
  const [accessCode, setAccessCode] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const activeRole = roles.find((item) => item.value === role) || roles[0];

  function selectRole(_, nextRole) {
    if (!nextRole) return;
    setRole(nextRole);
    setAccessCode("");
    setSecretCode("");
    setError("");
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!accessCode.trim() || !secretCode.trim()) return setError("أدخل كود الحساب والرمز السري للمتابعة.");
    try {
      setLoading(true);
      const { data } = await api.post("/auth/login", { role, code: accessCode, secretCode });
      login(data.user, data.token);
      navigate(roleHome(data.user.role), { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "تعذر تسجيل الدخول. راجع الأكواد وحاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  return <Box className="clorox-login"><Paper component="form" onSubmit={submit} elevation={0} className="clorox-login-card" sx={{ width: "min(100%, 540px)", px: { xs: 3, sm: 7 }, py: { xs: 4, sm: 5.5 }, borderRadius: { xs: 4, sm: 5 }, bgcolor: "rgba(255,255,255,.97)", boxShadow: "0 30px 70px rgba(0,51,132,.28)", border: "1px solid rgba(255,255,255,.75)" }}><Stack alignItems="center" spacing={1.1}><Box component="img" src="/clorox.png" alt="Clorox" sx={{ width: 165, maxHeight: 100, objectFit: "contain" }} /><Typography sx={{ color: "#0a2c69", fontWeight: 900, fontSize: { xs: 34, sm: 42 }, lineHeight: 1 }}>Sales App</Typography><Typography sx={{ color: "#617095", fontSize: { xs: 17, sm: 20 }, fontWeight: 700 }}>بوابة تسجيل الدخول</Typography></Stack><Stack spacing={2.1} sx={{ mt: 3.2 }}>{error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}<ToggleButtonGroup value={role} exclusive onChange={selectRole} fullWidth size="small" aria-label="نوع الحساب" sx={{ "& .MuiToggleButton-root": { flex: 1, gap: .45, py: 1, borderColor: "#dce5f2", fontWeight: 800, fontSize: { xs: 12, sm: 14 } }, "& .Mui-selected": { color: "#075be1 !important", bgcolor: "#eef5ff !important" } }}>{roles.map((item) => <ToggleButton key={item.value} value={item.value}>{item.icon}{item.label}</ToggleButton>)}</ToggleButtonGroup><Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: "100%" }}><Divider flexItem sx={{ my: "auto" }} /><Box sx={{ width: 62, height: 62, borderRadius: "50%", display: "grid", placeItems: "center", color: "#0a68ea", bgcolor: "#e7f0ff" }}>{activeRole.icon}</Box><Divider flexItem sx={{ my: "auto" }} /></Stack><TextField fullWidth label={activeRole.codeLabel} placeholder="أدخل الكود" value={accessCode} onChange={(event) => setAccessCode(event.target.value)} autoComplete="username" inputMode="text" inputProps={{ autoCapitalize: "characters", spellCheck: false }} InputProps={{ startAdornment: <InputAdornment position="start"><BadgeOutlinedIcon color="primary" /></InputAdornment> }} /><TextField fullWidth label="الرمز السري" placeholder="أدخل الرمز السري" value={secretCode} onChange={(event) => setSecretCode(event.target.value)} type="password" autoComplete="current-password" InputProps={{ startAdornment: <InputAdornment position="start"><LockOutlinedIcon color="primary" /></InputAdornment> }} /><Button size="large" type="submit" variant="contained" disabled={loading} endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LoginRoundedIcon />} sx={{ mt: .4, py: 1.45, fontSize: 18, fontWeight: 800, borderRadius: 2.5, bgcolor: "#075be1", boxShadow: "0 11px 18px rgba(0,62,167,.25)", "&:hover": { bgcolor: "#064db8" } }}>{loading ? "جارٍ التحقق..." : "تسجيل الدخول"}</Button></Stack></Paper></Box>;
}
