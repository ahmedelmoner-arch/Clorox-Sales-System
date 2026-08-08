import api from "../api/axios";
import { cacheVisitInit, getCachedVisitInit, isNetworkRequestError } from "../utils/offline-storage";

const VISIT_INIT_CACHE_TTL_MS = 15 * 60 * 1000;

export async function getVisitInit(date, branch, delegateId) {
  const params = {
    ...(date ? { date } : {}),
    ...(branch?.code ? { branchId: branch.code } : {}),
    ...(branch?.name ? { branchName: branch.name } : {}),
  };
  const cached = await getCachedVisitInit({ delegateId, date, branch });
  const cachedAt = new Date(cached?.savedAt || 0).getTime();
  if (cached?.data && Number.isFinite(cachedAt) && Date.now() - cachedAt < VISIT_INIT_CACHE_TTL_MS) return cached.data;
  try {
    const { data } = await api.get("/visits/init", { params });
    await cacheVisitInit({ delegateId, date, branch, data: data.data });
    return data.data;
  } catch (error) {
    if (!isNetworkRequestError(error)) throw error;
    if (!cached?.data) throw error;
    return { ...cached.data, offlineCache: { savedAt: cached.savedAt } };
  }
}
