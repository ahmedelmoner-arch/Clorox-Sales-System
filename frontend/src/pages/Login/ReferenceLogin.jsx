import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from "@mui/material";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import SupervisorAccountRoundedIcon from "@mui/icons-material/SupervisorAccountRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useSession } from "../../context/SessionContext";
import ThemeModeToggle from "../../components/common/ThemeModeToggle";
import { roleHome } from "../../utils/roles";
import "../../styles/reference.css";

const roles = [
  { value: "Delegate", label: "مندوبة", codeLabel: "كود المندوبة", icon: <PersonOutlineRoundedIcon /> },
  { value: "Supervisor", label: "مشرف", codeLabel: "كود المشرف", icon: <SupervisorAccountRoundedIcon /> },
  { value: "Management", label: "الإدارة", codeLabel: "كود الإدارة", icon: <ManageAccountsRoundedIcon /> },
];

export default function ReferenceLogin() {
  const navigate = useNavigate();
  const { login, isAuthenticated, ready, user } = useSession();
  const theme = useTheme();
  const [role, setRole] = useState("Delegate");
  const [accessCode, setAccessCode] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const activeRole = roles.find((item) => item.value === role) || roles[0];
  const isDark = theme.palette.mode === "dark";

  useEffect(() => {
    if (ready && isAuthenticated) navigate(roleHome(user?.role), { replace: true });
  }, [isAuthenticated, navigate, ready, user?.role]);

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
    if (!navigator.onLine) {
      setError("لا يمكن تسجيل الدخول لأول مرة بدون إنترنت. اتصلي مرة واحدة ثم سيفتح التطبيق لاحقًا بالجلسة المحفوظة.");
      return;
    }
    if (!accessCode.trim() || !secretCode.trim()) {
      setError("أدخل كود الحساب والرمز السري للمتابعة.");
      return;
    }

    try {
      setLoading(true);
      const { data } = await api.post("/auth/login", { role, code: accessCode, secretCode });
      login(data.user, data.token);
      navigate(roleHome(data.user.role), { replace: true });
    } catch (requestError) {
      const message = requestError.response?.data?.message;
      if (message) setError(message);
      else if (requestError.code === "ECONNABORTED") setError("استغرق الاتصال بالخادم وقتًا أطول من المتوقع. حاولي مرة أخرى.");
      else if (!navigator.onLine) setError("لا يمكن تسجيل الدخول لأول مرة بدون إنترنت. اتصلي مرة واحدة ثم سيفتح التطبيق لاحقًا بالجلسة المحفوظة.");
      else setError("تعذر الاتصال بالخادم. تحققي من الإنترنت ثم حاولي مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  if (ready && isAuthenticated) return null;

  return (
    <Box className="clorox-login">
      <Box className="clorox-login-dot-grid" />
      <Box className="clorox-login-glow clorox-login-glow-top" />
      <Box className="clorox-login-glow clorox-login-glow-bottom" />
      <Box className="clorox-login-theme-toggle"><ThemeModeToggle /></Box>

      <Paper
        component="form"
        onSubmit={submit}
        elevation={0}
        className="clorox-login-card"
        sx={{
          width: "min(100%, 860px)",
          px: { xs: 2.25, sm: 6, md: 8.5 },
          py: { xs: 4, sm: 5.25, md: 6 },
          borderRadius: { xs: "38px", sm: "54px" },
          bgcolor: isDark ? "rgba(24,34,47,.98)" : "rgba(255,255,255,.97)",
          borderColor: isDark ? "rgba(104,151,210,.34)" : "rgba(255,255,255,.86)",
        }}
      >
        <Stack alignItems="center" spacing={{ xs: 1, sm: 1.35 }}>
          <Box component="img" src="/clorox.png" alt="Clorox" className="clorox-login-logo" />
          <Typography className="clorox-login-title" sx={{ color: isDark ? "#edf4ff" : "#132d61" }}>
            تطبيق مبيعات المندوبات
          </Typography>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ color: isDark ? "#b9c6da" : "#536483" }}>
            <Box className="clorox-login-rule" />
            <Typography className="clorox-login-subtitle">بوابة تسجيل الدخول</Typography>
            <Box className="clorox-login-rule" />
          </Stack>
        </Stack>

        <Stack spacing={{ xs: 2, sm: 2.35 }} sx={{ mt: { xs: 3.25, sm: 4.25 } }}>
          {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}

          <ToggleButtonGroup
            value={role}
            exclusive
            onChange={selectRole}
            fullWidth
            aria-label="نوع الحساب"
            className="clorox-role-switcher"
          >
            {roles.map((item) => (
              <ToggleButton key={item.value} value={item.value} aria-label={item.label}>
                {item.icon}
                <span>{item.label}</span>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <Box className="clorox-login-role-icon" sx={{ color: isDark ? "#8fbbff" : "#fff" }}>
            {activeRole.icon}
          </Box>

          <TextField
            fullWidth
            label={activeRole.codeLabel}
            placeholder="أدخل الكود"
            value={accessCode}
            onChange={(event) => setAccessCode(event.target.value)}
            autoComplete="username"
            inputMode="text"
            inputProps={{ autoCapitalize: "characters", spellCheck: false }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><BadgeOutlinedIcon /></InputAdornment>,
            }}
            className="clorox-login-input"
          />
          <TextField
            fullWidth
            label="الرمز السري"
            placeholder="أدخل الرمز السري"
            value={secretCode}
            onChange={(event) => setSecretCode(event.target.value)}
            type="password"
            autoComplete="current-password"
            InputProps={{
              startAdornment: <InputAdornment position="start"><LockOutlinedIcon /></InputAdornment>,
            }}
            className="clorox-login-input"
          />

          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} className="clorox-login-options">
            <Typography variant="body2" color="primary.main" fontWeight={800}>تواصل مع الإدارة عند نسيان الرمز</Typography>
            <FormControlLabel
              sx={{ m: 0, flexShrink: 0 }}
              control={<Checkbox checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />}
              label="تذكرني"
            />
          </Stack>

          <Button
            size="large"
            type="submit"
            variant="contained"
            disabled={loading}
            endIcon={loading ? <CircularProgress size={21} color="inherit" /> : <ArrowBackRoundedIcon />}
            className="clorox-login-submit"
          >
            {loading ? "جارٍ التحقق..." : "تسجيل الدخول"}
          </Button>
        </Stack>
      </Paper>

      <Typography className="clorox-login-footer">كلوركس © 2026 - جميع الحقوق محفوظة</Typography>
    </Box>
  );
}
