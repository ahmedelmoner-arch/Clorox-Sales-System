const STORAGE_PREFIX = "clorox.sales.request-cache.v1:";
const inFlight = new Map();

function sessionScope() {
  try {
    const session = JSON.parse(localStorage.getItem("clorox.sales.session") || "null");
    const user = session?.user || {};
    return [user.role || "anonymous", user.delegateId || user.id || "anonymous"].join(":");
  } catch {
    return "anonymous";
  }
}

function storageKey(key) {
  return `${STORAGE_PREFIX}${sessionScope()}:${key}`;
}

function getStorage() {
  return typeof window === "undefined" ? null : window.sessionStorage;
}

export function invalidateRequestCache(...names) {
  const storage = getStorage();
  if (!storage) return;
  const targets = names.flat().filter(Boolean);
  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index);
    if (key?.startsWith(STORAGE_PREFIX) && targets.some((name) => key.includes(`:${name}`))) {
      storage.removeItem(key);
    }
  }
}

export async function loadCachedRequest(key, ttlMs, loader) {
  const storage = getStorage();
  const keyWithScope = storageKey(key);
  if (storage) {
    try {
      const cached = JSON.parse(storage.getItem(keyWithScope) || "null");
      if (cached && Date.now() - cached.savedAt < ttlMs) return cached.value;
    } catch {
      storage.removeItem(keyWithScope);
    }
  }

  if (!inFlight.has(keyWithScope)) {
    inFlight.set(keyWithScope, Promise.resolve(loader()).then((value) => {
      try {
        storage?.setItem(keyWithScope, JSON.stringify({ savedAt: Date.now(), value }));
      } catch {
        // Session storage is an optimisation only; never fail a real API read.
      }
      return value;
    }).finally(() => inFlight.delete(keyWithScope)));
  }
  return inFlight.get(keyWithScope);
}
