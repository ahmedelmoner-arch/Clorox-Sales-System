import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeModeContext = createContext(null);
const storageKey = "clorox.sales.theme-mode";

function initialMode() {
  try {
    return localStorage.getItem(storageKey) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function ThemeModeProvider({ children }) {
  const [mode, setMode] = useState(initialMode);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
    localStorage.setItem(storageKey, mode);
  }, [mode]);

  const value = useMemo(() => ({
    mode,
    isDark: mode === "dark",
    toggleMode: () => setMode((current) => current === "dark" ? "light" : "dark"),
  }), [mode]);

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
}

export function useThemeMode() {
  const context = useContext(ThemeModeContext);
  if (!context) throw new Error("useThemeMode must be used inside ThemeModeProvider");
  return context;
}
