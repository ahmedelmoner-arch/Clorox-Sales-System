import { Box, AppBar, Toolbar, Typography, Avatar } from "@mui/material";
import { useAuth } from "../../context/AuthContext";
import BottomNav from "../navigation/BottomNavigation";

export default function MainLayout({ children }) {
  const { user } = useAuth();

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#F4F8FF" }}>

      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: "#0057FF",
          borderRadius: 0,
        }}
      >
        <Toolbar
          sx={{
            display: "flex",
            justifyContent: "space-between",
            minHeight: 70,
          }}
        >
          <Typography
            variant="h6"
            fontWeight="bold"
          >
            Clorox Sales
          </Typography>

          <Box
            display="flex"
            alignItems="center"
            gap={2}
          >
            <Typography fontWeight={600}>
              {user?.DelegateName}
            </Typography>

            <Avatar
              sx={{
                bgcolor: "#fff",
                color: "#0057FF",
                fontWeight: "bold",
              }}
            >
              {user?.DelegateName?.charAt(0) || "D"}
            </Avatar>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          p: 3,
        }}
      >
        {children}
        <Box sx={{ height: 90 }} />

       <BottomNav />
      </Box>

    </Box>
  );
}