import api from "../api/axios";
import { cacheVisitInit, getCachedVisitInit, isNetworkRequestError } from "../utils/offline-storage";

export async function getVisitInit(date, branch, delegateId) {
  const params = {
    ...(date ? { date } : {}),
    ...(branch?.code ? { branchId: branch.code } : {}),
    ...(branch?.name ? { branchName: branch.name } : {}),
  };
  try {
    const { data } = await api.get("/visits/init", { params });
    await cacheVisitInit({ delegateId, date, branch, data: data.data });
    return data.data;
  } catch (error) {
    if (!isNetworkRequestError(error)) throw error;
    const cached = await getCachedVisitInit({ delegateId, date, branch });
    if (!cached?.data) throw error;
    return { ...cached.data, offlineCache: { savedAt: cached.savedAt } };
  }
}
