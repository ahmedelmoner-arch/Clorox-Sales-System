import { useState } from "react";
import { Alert, Box, Button, CircularProgress, InputAdornment, Paper, Stack, TextField, Typography } from "@mui/material";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useSession } from "../../context/SessionContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useSession();
  const [delegateCode, setDelegateCode] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (!delegateCode.trim() || !secretCode.trim()) return setError("اكتبي كود المندوبة والكود السري.");
    try {
      setLoading(true);
      const { data } = await api.post("/auth/login", { delegateCode, secretCode });
      login(data.user, data.token);
      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "تعذر تسجيل الدخول. تأكدي من البيانات وحاولي مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{ minHeight: "100vh", p: 2, display: "grid", placeItems: "center", background: "radial-gradient(circle at 88% 15%, #83b9ff 0, transparent 27%), linear-gradient(135deg, #062f74, #0d5dda)" }}>
      <Paper component="form" onSubmit={handleSubmit} elevation={0} sx={{ width: "min(100%, 470px)", p: { xs: 3, sm: 5 }, borderRadius: 5, boxShadow: "0 26px 70px rgba(0, 21, 75, .35)" }}>
        <Stack alignItems="center" spacing={1.25} sx={{ mb: 4 }}>
          <Box component="img" src="/clorox.png" alt="Clorox" sx={{ width: 116, height: 80, objectFit: "contain" }} />
          <Typography variant="h4" fontWeight={900} color="#102d67">أهلًا بك</Typography>
          <Typography color="text.secondary" textAlign="center">سجّلي الدخول لمتابعة أهدافك وتقاريرك اليومية.</Typography>
        </Stack>
        <Stack spacing={2}>
          {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
          <TextField fullWidth label="كود المندوبة" value={delegateCode} onChange={(event) => setDelegateCode(event.target.value)} autoComplete="username" inputMode="text" inputProps={{ autoCapitalize: "characters", spellCheck: false }} InputProps={{ startAdornment: <InputAdornment position="start"><BadgeOutlinedIcon color="primary" /></InputAdornment> }} />
          <TextField fullWidth label="الكود السري" type="password" value={secretCode} onChange={(event) => setSecretCode(event.target.value)} autoComplete="current-password" InputProps={{ startAdornment: <InputAdornment position="start"><LockOutlinedIcon color="primary" /></InputAdornment> }} />
          <Button type="submit" size="large" variant="contained" disabled={loading} endIcon={loading ? <CircularProgress size={19} color="inherit" /> : <LoginRoundedIcon />} sx={{ mt: 1, py: 1.45, borderRadius: 3 }}>
            {loading ? "جارٍ التحقق..." : "تسجيل الدخول"}
          </Button>
        </Stack>
        <Typography variant="caption" display="block" color="text.secondary" textAlign="center" sx={{ mt: 3 }}>نظام تقارير المبيعات — Clorox مصر</Typography>
      </Paper>
    </Box>
  );
}
