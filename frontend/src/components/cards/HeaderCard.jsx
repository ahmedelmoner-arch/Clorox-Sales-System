import {
  Avatar,
  Box,
  IconButton,
  Paper,
  Typography,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import { useAuth } from "../../context/AuthContext";

export default function HeaderCard() {
  const { user } = useAuth();

  const today = new Date().toLocaleDateString("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Paper
      elevation={0}
      sx={{
        mb: 3,
        p: 2.5,
        borderRadius: 5,
        overflow: "hidden",
        position: "relative",
        background:
          "linear-gradient(135deg,#0066FF 0%,#3388FF 55%,#5AA3FF 100%)",
        color: "#fff",
        boxShadow: "0 15px 35px rgba(0,102,255,.28)",
      }}
    >
      {/* Background Circle */}
      <Box
        sx={{
          position: "absolute",
          width: 220,
          height: 220,
          borderRadius: "50%",
          background: "rgba(255,255,255,.08)",
          top: -80,
          left: -70,
        }}
      />

      <Box
        sx={{
          position: "absolute",
          width: 140,
          height: 140,
          borderRadius: "50%",
          background: "rgba(255,255,255,.06)",
          bottom: -40,
          right: -30,
        }}
      />

      {/* Notification */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="flex-start"
        mb={3}
      >
        <Typography
          sx={{
            opacity: .9,
            fontSize: 14,
          }}
        >
          {today}
        </Typography>

        <IconButton
          sx={{
            bgcolor: "rgba(255,255,255,.18)",
            color: "#fff",
            "&:hover": {
              bgcolor: "rgba(255,255,255,.28)",
            },
          }}
        >
          <NotificationsNoneRoundedIcon />
        </IconButton>
      </Box>

      <Box
        display="flex"
        alignItems="center"
        gap={2.5}
      >
        <Avatar
          sx={{
            width: 64,
            height: 64,
            bgcolor: "#fff",
            color: "#0066FF",
            boxShadow: "0 8px 20px rgba(0,0,0,.18)",
          }}
        >
          <PersonIcon sx={{ fontSize: 40 }} />
        </Avatar>

        <Box>
          <Typography
            sx={{
              opacity: .9,
              fontSize: 15,
            }}
          >
            أهلاً بك 👋
          </Typography>

          <Typography
            sx={{
              fontWeight: 700,
              fontSize: 24,
              lineHeight: 1.3,
            }}
          >
            {user?.DelegateName || "مندوب المبيعات"}
          </Typography>

          <Typography
            sx={{
              opacity: .85,
              fontSize: 15,
              mt: .5,
            }}
          >
            Sales Representative
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}