import api from "../api/axios";

export async function getReports(params) {
  const { data } = await api.get("/reports", { params });
  return data.data;
}

export async function saveReport(payload) {
  const { data } = await api.post("/reports", payload);
  return data.data;
}

export async function getReport(reportId) {
  const { data } = await api.get(`/reports/${encodeURIComponent(reportId)}`);
  return data.data;
}

export async function updateReport(reportId, payload) {
  const { data } = await api.put(`/reports/${encodeURIComponent(reportId)}`, payload);
  return data.data;
}
