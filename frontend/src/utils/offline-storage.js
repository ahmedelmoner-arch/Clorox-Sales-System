const DATABASE_NAME = "clorox.sales.offline";
const DATABASE_VERSION = 1;
const VISIT_CACHE_STORE = "visit-cache";
const QUEUE_STORE = "visit-queue";
const FALLBACK_PREFIX = "clorox.sales.offline.";

function hasIndexedDb() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openDatabase() {
  if (!hasIndexedDb()) return Promise.reject(new Error("IndexedDB is unavailable"));

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onerror = () => reject(request.error || new Error("Unable to open offline storage"));
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(VISIT_CACHE_STORE)) database.createObjectStore(VISIT_CACHE_STORE, { keyPath: "key" });
      if (!database.objectStoreNames.contains(QUEUE_STORE)) database.createObjectStore(QUEUE_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function runTransaction(storeName, mode, operation) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    let value;
    let completed = false;

    transaction.oncomplete = () => {
      completed = true;
      database.close();
      resolve(value);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error("Offline storage transaction failed"));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error || new Error("Offline storage transaction was aborted"));
    };

    try {
      const request = operation(store);
      if (request) {
        request.onsuccess = () => { value = request.result; };
        request.onerror = () => {
          if (!completed) transaction.abort();
        };
      }
    } catch (error) {
      if (!completed) transaction.abort();
      reject(error);
    }
  });
}

function fallbackKey(name) {
  return `${FALLBACK_PREFIX}${name}`;
}

function readFallback(name, defaultValue) {
  try {
    const saved = window.localStorage.getItem(fallbackKey(name));
    return saved ? JSON.parse(saved) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function writeFallback(name, value) {
  window.localStorage.setItem(fallbackKey(name), JSON.stringify(value));
}

function normalizedDelegateId(delegateId) {
  return String(delegateId || "").trim();
}

function visitCacheKey(delegateId, date, branch) {
  return [
    normalizedDelegateId(delegateId),
    String(date || "").trim(),
    String(branch?.code || "").trim(),
    String(branch?.name || "").trim(),
  ].join("|");
}

export function createOfflineId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
}

export function isNetworkRequestError(error) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  return !error?.response && ["ERR_NETWORK", "ECONNABORTED", "ERR_CANCELED"].includes(error?.code);
}

export async function cacheVisitInit({ delegateId, date, branch, data }) {
  const key = visitCacheKey(delegateId, date, branch);
  const record = { key, data, savedAt: new Date().toISOString() };
  try {
    await runTransaction(VISIT_CACHE_STORE, "readwrite", (store) => store.put(record));
  } catch {
    writeFallback(`visit:${key}`, record);
  }
  return record;
}

export async function getCachedVisitInit({ delegateId, date, branch }) {
  const key = visitCacheKey(delegateId, date, branch);
  try {
    const record = await runTransaction(VISIT_CACHE_STORE, "readonly", (store) => store.get(key));
    if (record) return record;
  } catch {
    // A small localStorage fallback supports browsers that disable IndexedDB.
  }
  return readFallback(`visit:${key}`, null);
}

export async function enqueueVisit({ delegateId, reportPayload, shortagePayload }) {
  const normalizedId = normalizedDelegateId(delegateId);
  if (!normalizedId) throw new Error("A delegate is required to queue an offline visit");
  const record = {
    id: createOfflineId(),
    delegateId: normalizedId,
    reportPayload: reportPayload || null,
    shortagePayload: shortagePayload || null,
    createdAt: new Date().toISOString(),
    lastError: "",
  };
  try {
    await runTransaction(QUEUE_STORE, "readwrite", (store) => store.put(record));
  } catch {
    const records = readFallback("queue", []);
    writeFallback("queue", [...records, record]);
  }
  return record;
}

export async function getQueuedVisits(delegateId) {
  const normalizedId = normalizedDelegateId(delegateId);
  if (!normalizedId) return [];
  try {
    const records = await runTransaction(QUEUE_STORE, "readonly", (store) => store.getAll());
    return records.filter((record) => record.delegateId === normalizedId).sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  } catch {
    return readFallback("queue", []).filter((record) => record.delegateId === normalizedId).sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }
}

export async function removeQueuedVisit(id) {
  try {
    await runTransaction(QUEUE_STORE, "readwrite", (store) => store.delete(id));
  } catch {
    writeFallback("queue", readFallback("queue", []).filter((record) => record.id !== id));
  }
}

export async function setQueuedVisitError(id, message) {
  try {
    const record = await runTransaction(QUEUE_STORE, "readonly", (store) => store.get(id));
    if (!record) return;
    await runTransaction(QUEUE_STORE, "readwrite", (store) => store.put({ ...record, lastError: String(message || "") }));
  } catch {
    writeFallback("queue", readFallback("queue", []).map((record) => record.id === id ? { ...record, lastError: String(message || "") } : record));
  }
}
