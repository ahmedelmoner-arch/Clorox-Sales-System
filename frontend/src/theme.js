import { createTheme } from "@mui/material/styles";

export function createAppTheme(mode = "light") {
  const isDark = mode === "dark";
  return createTheme({
    direction: "rtl",
    palette: {
      mode,
      primary: { main: isDark ? "#5b9cff" : "#0057ff" },
      secondary: { main: "#00b894" },
      background: {
        default: isDark ? "#101720" : "#f4f8ff",
        paper: isDark ? "#18222f" : "#ffffff",
      },
      text: {
        primary: isDark ? "#edf3fb" : "#1a2540",
        secondary: isDark ? "#aebdce" : "#5d6b82",
      },
      divider: isDark ? "#2b3949" : "#e1e8f1",
      success: { main: "#22c55e" },
      warning: { main: "#f59e0b" },
      error: { main: "#ef4444" },
    },
    shape: { borderRadius: 18 },
    typography: {
      fontFamily: "Cairo, sans-serif",
      fontWeightRegular: 500,
      fontWeightMedium: 600,
      fontWeightBold: 800,
      body1: { fontWeight: 500, lineHeight: 1.7 },
      h4: { fontWeight: 700 },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 700 },
      button: { textTransform: "none", fontWeight: 700 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: isDark ? "#101720" : "#f5f7fc" },
        },
      },
      MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
      MuiButton: { styleOverrides: { root: { borderRadius: 12 } } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundColor: isDark ? "#121b26" : "#ffffff",
          },
          notchedOutline: { borderColor: isDark ? "#39495c" : undefined },
        },
      },
      MuiInputLabel: { styleOverrides: { root: { fontWeight: 600 } } },
    },
  });
}

export default createAppTheme();
