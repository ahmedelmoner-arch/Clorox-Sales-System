import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { saveReport } from "../services/report.service";
import { saveShortages } from "../services/shortage.service";
import { enqueueVisit, getQueuedVisits, isNetworkRequestError, removeQueuedVisit, setQueuedVisitError } from "../utils/offline-storage";
import { useSession } from "./SessionContext";

const OfflineContext = createContext(null);

function delegateIdFor(user) {
  return String(user?.delegateId || user?.id || "").trim();
}

function errorMessage(error) {
  return error?.response?.data?.message || error?.message || "تعذرت مزامنة أحد التقارير المحفوظة على الجهاز.";
}

export function OfflineProvider({ children }) {
  const { user, isAuthenticated } = useSession();
  const delegateId = delegateIdFor(user);
  const isDelegate = user?.role === "Delegate";
  const [isOnline, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastError, setLastError] = useState("");
  const syncingRef = useRef(false);

  const refreshPending = useCallback(async () => {
    if (!isAuthenticated || !isDelegate || !delegateId) {
      setPendingCount(0);
      return 0;
    }
    const items = await getQueuedVisits(delegateId);
    setPendingCount(items.length);
    return items.length;
  }, [delegateId, isAuthenticated, isDelegate]);

  const syncNow = useCallback(async () => {
    if (syncingRef.current || !isAuthenticated || !isDelegate || !delegateId || (typeof navigator !== "undefined" && !navigator.onLine)) return;
    syncingRef.current = true;
    setSyncing(true);
    setLastError("");
    try {
      const items = await getQueuedVisits(delegateId);
      for (const item of items) {
        try {
          const savedReport = item.reportPayload ? await saveReport(item.reportPayload) : null;
          if (item.shortagePayload) {
            await saveShortages({
              ...item.shortagePayload,
              reportId: item.shortagePayload.reportId || savedReport?.reportId || "",
            });
          }
          await removeQueuedVisit(item.id);
        } catch (error) {
          const message = errorMessage(error);
          await setQueuedVisitError(item.id, message);
          setLastError(message);
          if (isNetworkRequestError(error)) break;
        }
      }
    } finally {
      await refreshPending();
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [delegateId, isAuthenticated, isDelegate, refreshPending]);

  const queueVisit = useCallback(async ({ reportPayload, shortagePayload }) => {
    const record = await enqueueVisit({ delegateId, reportPayload, shortagePayload });
    await refreshPending();
    return record;
  }, [delegateId, refreshPending]);

  useEffect(() => {
    refreshPending().catch(() => undefined);
  }, [refreshPending]);

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      syncNow().catch(() => undefined);
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [syncNow]);

  useEffect(() => {
    if (isOnline) syncNow().catch(() => undefined);
  }, [isOnline, syncNow]);

  const value = useMemo(() => ({
    isOnline,
    pendingCount,
    syncing,
    lastError,
    queueVisit,
    refreshPending,
    syncNow,
  }), [isOnline, lastError, pendingCount, queueVisit, refreshPending, syncNow, syncing]);

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) throw new Error("useOffline must be used inside OfflineProvider");
  return context;
}
