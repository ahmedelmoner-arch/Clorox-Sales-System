import api from "../api/axios";
import { invalidateRequestCache, loadCachedRequest } from "../utils/request-cache";

export async function saveShortages(payload) {
  const { data } = await api.post("/shortages", payload);
  invalidateRequestCache("dashboard", "reports", "oversight", "invoices", "shortages");
  return data.data;
}

export async function getShortages(month) {
  const params = month ? { month } : undefined;
  return loadCachedRequest(`shortages:${month || "current"}`, 45 * 1000, async () => {
    const { data } = await api.get("/shortages", { params });
    return data.data;
  });
}

export async function updateShortageStatus(shortageId, status) {
  const { data } = await api.patch(`/shortages/${encodeURIComponent(shortageId)}/status`, { status });
  invalidateRequestCache("dashboard", "reports", "oversight", "invoices", "shortages");
  return data.data;
}
