import api from "../api/axios";

export async function saveShortages(payload) {
  const { data } = await api.post("/shortages", payload);
  return data.data;
}

export async function getShortages(month) {
  const { data } = await api.get("/shortages", { params: month ? { month } : undefined });
  return data.data;
}

export async function updateShortageStatus(shortageId, status) {
  const { data } = await api.patch(`/shortages/${encodeURIComponent(shortageId)}/status`, { status });
  return data.data;
}
