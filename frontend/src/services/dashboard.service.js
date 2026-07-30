import api from "../api/axios";

export async function getDashboard(month) {
  const { data } = await api.get("/dashboard", { params: month ? { month } : undefined });
  return data.data;
}
