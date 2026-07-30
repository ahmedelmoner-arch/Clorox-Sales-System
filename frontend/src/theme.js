import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  direction: "rtl",

  palette: {
    primary: {
      main: "#0057FF",
    },

    secondary: {
      main: "#00B894",
    },

    background: {
      default: "#F4F8FF",
      paper: "#FFFFFF",
    },

    success: {
      main: "#22C55E",
    },

    warning: {
      main: "#F59E0B",
    },

    error: {
      main: "#EF4444",
    },
  },

  shape: {
    borderRadius: 18,
  },

  typography: {
    fontFamily: "Cairo, sans-serif",
    fontWeightRegular: 500,
    fontWeightMedium: 600,
    fontWeightBold: 800,

    body1: {
      fontWeight: 500,
      lineHeight: 1.7,
    },

    h4: {
      fontWeight: 700,
    },

    h5: {
      fontWeight: 700,
    },

    h6: {
      fontWeight: 700,
    },

    button: {
      textTransform: "none",
      fontWeight: 700,
    },
  },

  components: {
    MuiButton: {
      styleOverrides: { root: { borderRadius: 12 } },
    },
    MuiOutlinedInput: {
      styleOverrides: { root: { borderRadius: 12, backgroundColor: "#fff" } },
    },
    MuiInputLabel: {
      styleOverrides: { root: { fontWeight: 600 } },
    },
  },
});

export default theme;
