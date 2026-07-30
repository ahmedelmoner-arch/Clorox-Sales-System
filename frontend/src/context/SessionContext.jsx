import { createContext, useContext, useEffect, useMemo, useState } from "react";

const SessionContext = createContext(null);
const storageKey = "clorox.sales.session";

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setSession(JSON.parse(saved));
    } finally {
      setReady(true);
    }
  }, []);

  const value = useMemo(() => ({
    user: session?.user ?? null,
    token: session?.token ?? null,
    ready,
    isAuthenticated: Boolean(session?.token),
    login: (user, token) => {
      const nextSession = { user, token };
      localStorage.setItem(storageKey, JSON.stringify(nextSession));
      setSession(nextSession);
    },
    logout: () => {
      localStorage.removeItem(storageKey);
      setSession(null);
    },
  }), [ready, session]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside SessionProvider");
  return context;
}
