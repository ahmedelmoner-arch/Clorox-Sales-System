import { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  InputAdornment,
  CircularProgress,
} from "@mui/material";

import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";

import { useNavigate } from "react-router-dom";
import { login as loginService } from "../../services/auth.service";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [delegateCode, setDelegateCode] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!delegateCode || !secretCode) return;

    setLoading(true);

    const result = await loginService(delegateCode, secretCode);

    setLoading(false);

    if (!result.success) {
      alert(result.message);
      return;
    }

    login(result.user);

    navigate("/dashboard");
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg,#d8ecff 0%,#4b8cff 55%,#0d5eff 100%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        p: 3,
      }}
    >
      <Paper
        elevation={12}
        sx={{
          width: 470,
          borderRadius: 8,
          p: 5,
          background: "rgba(255,255,255,.96)",
        }}
      >
        <Box textAlign="center">

          <img
            src="/clorox.png"
            alt="Clorox"
            style={{
              width: 180,
              marginBottom: 10,
            }}
          />

          <Typography
            fontWeight="bold"
            fontSize={46}
            color="#16316f"
          >
            Sales App
          </Typography>

          <Typography
            color="text.secondary"
            mb={5}
            fontSize={25}
          >
            تسجيل دخول المندوبة
          </Typography>

          <Avatar
            sx={{
              width: 90,
              height: 90,
              margin: "auto",
              bgcolor: "#eef5ff",
              color: "#1769ff",
              mb: 4,
            }}
          >
            <PersonOutlineIcon sx={{ fontSize: 45 }} />
          </Avatar>
        </Box>

        <TextField
          fullWidth
          label="كود المندوبة"
          value={delegateCode}
          onChange={(e) => setDelegateCode(e.target.value)}
          margin="normal"
          dir="rtl"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PersonOutlineIcon color="primary" />
              </InputAdornment>
            ),
          }}
        />

        <TextField
          fullWidth
          type="password"
          label="الكود السري"
          value={secretCode}
          onChange={(e) => setSecretCode(e.target.value)}
          margin="normal"
          dir="rtl"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockOutlinedIcon color="primary" />
              </InputAdornment>
            ),
          }}
        />

        <Button
          fullWidth
          size="large"
          variant="contained"
          sx={{
            mt: 4,
            py: 1.8,
            borderRadius: 3,
            fontSize: 24,
            fontWeight: "bold",
          }}
          disabled={loading}
          onClick={handleLogin}
        >
          {loading ? (
            <CircularProgress
              color="inherit"
              size={30}
            />
          ) : (
            "تسجيل الدخول"
          )}
        </Button>

        <Box
          textAlign="center"
          mt={5}
        >
          <ShieldOutlinedIcon
            color="primary"
            sx={{ fontSize: 45 }}
          />

          <Typography
            mt={1}
            color="green"
            fontWeight="bold"
            fontSize={22}
          >
            نظافة أفضل ... حياة أفضل
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}