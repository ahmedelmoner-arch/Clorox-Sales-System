import api from "../api/axios";
import { loadCachedRequest } from "../utils/request-cache";

function rangeParams(month, date) {
  return {
    ...(month ? { month } : {}),
    ...(date ? { date } : {}),
  };
}

export async function getOversight(month, date) {
  const params = rangeParams(month, date);
  return loadCachedRequest(`oversight:${JSON.stringify(params)}`, 45 * 1000, async () => {
    const { data } = await api.get("/oversight", { params });
    return data.data;
  });
}

export async function getDelegateDrilldown(delegateId, month, date) {
  const params = rangeParams(month, date);
  return loadCachedRequest(`oversight-delegate:${delegateId}:${JSON.stringify(params)}`, 45 * 1000, async () => {
    const { data } = await api.get(`/oversight/delegates/${encodeURIComponent(delegateId)}`, { params });
    return data.data;
  });
}

export async function getSupervisorDrilldown(supervisorId, month, date) {
  const params = rangeParams(month, date);
  return loadCachedRequest(`oversight-supervisor:${supervisorId}:${JSON.stringify(params)}`, 45 * 1000, async () => {
    const { data } = await api.get(`/oversight/supervisors/${encodeURIComponent(supervisorId)}`, { params });
    return data.data;
  });
}

export async function getInvoices(month, date) {
  const params = rangeParams(month, date);
  return loadCachedRequest(`invoices:${JSON.stringify(params)}`, 2 * 60 * 1000, async () => {
    const { data } = await api.get("/oversight/invoices", { params });
    return data.data;
  });
}
