import api from "../api/axios";

export async function getOversight(month) {
  const { data } = await api.get("/oversight", { params: month ? { month } : undefined });
  return data.data;
}

export async function getDelegateDrilldown(delegateId, month) {
  const { data } = await api.get(`/oversight/delegates/${encodeURIComponent(delegateId)}`, { params: month ? { month } : undefined });
  return data.data;
}

export async function getInvoices(month) {
  const { data } = await api.get("/oversight/invoices", { params: month ? { month } : undefined });
  return data.data;
}
