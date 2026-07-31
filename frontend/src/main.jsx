import React, { useMemo } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { ThemeProvider, CssBaseline } from "@mui/material";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";

import { createAppTheme } from "./theme";
import App from "./App";
import "./styles/global.css";

import { SessionProvider } from "./context/SessionContext";
import { ThemeModeProvider, useThemeMode } from "./context/ThemeModeContext";

const cacheRtl = createCache({
  key: "mui-rtl",
});

function ThemedApplication() {
  const { mode } = useThemeMode();
  const theme = useMemo(() => createAppTheme(mode), [mode]);
  return <ThemeProvider theme={theme}><CssBaseline /><BrowserRouter><SessionProvider><App /></SessionProvider></BrowserRouter></ThemeProvider>;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode><CacheProvider value={cacheRtl}><ThemeModeProvider><ThemedApplication /></ThemeModeProvider></CacheProvider></React.StrictMode>
);
