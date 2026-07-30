import { Box, Container } from "@mui/material";
import BottomNavigation from "./BottomNavigation";

export default function MainLayout({ children }) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "#F5F7FB",
      }}
    >
      <Container
        maxWidth="lg"
        sx={{
          pt: 3,
          pb: 12,
        }}
      >
        {children}
      </Container>

      <BottomNavigation />
    </Box>
  );
}