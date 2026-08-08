import api from "../api/axios";
import { invalidateRequestCache, loadCachedRequest } from "../utils/request-cache";

export async function getReports(params) {
  const key = `reports:${JSON.stringify(params || {})}`;
  return loadCachedRequest(key, 30 * 1000, async () => {
    const { data } = await api.get("/reports", { params });
    return data.data;
  });
}

export async function saveReport(payload) {
  const { data } = await api.post("/reports", payload);
  invalidateRequestCache("dashboard", "reports", "oversight", "invoices");
  return data.data;
}

export async function getReport(reportId) {
  const { data } = await api.get(`/reports/${encodeURIComponent(reportId)}`);
  return data.data;
}

export async function updateReport(reportId, payload) {
  const { data } = await api.put(`/reports/${encodeURIComponent(reportId)}`, payload);
  invalidateRequestCache("dashboard", "reports", "oversight", "invoices");
  return data.data;
}
