import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { ThemeProvider, CssBaseline } from "@mui/material";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";

import theme from "./theme";
import App from "./App";
import "./styles/global.css";

import { SessionProvider } from "./context/SessionContext";

const cacheRtl = createCache({
  key: "mui-rtl",
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <CacheProvider value={cacheRtl}>
      <ThemeProvider theme={theme}>
        <CssBaseline />

        <BrowserRouter>
          <SessionProvider>
            <App />
          </SessionProvider>
        </BrowserRouter>

      </ThemeProvider>
    </CacheProvider>
  </React.StrictMode>
);
