import api from "../api/axios";
import { loadCachedRequest } from "../utils/request-cache";

export async function getDashboard(month) {
  const key = `dashboard:${month || "current"}`;
  return loadCachedRequest(key, 30 * 1000, async () => {
    const { data } = await api.get("/dashboard", { params: month ? { month } : undefined });
    return data.data;
  });
}
