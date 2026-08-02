import api from "../api/axios";

function rangeParams(month, date) {
  return {
    ...(month ? { month } : {}),
    ...(date ? { date } : {}),
  };
}

export async function getOversight(month, date) {
  const { data } = await api.get("/oversight", { params: rangeParams(month, date) });
  return data.data;
}

export async function getDelegateDrilldown(delegateId, month, date) {
  const { data } = await api.get(`/oversight/delegates/${encodeURIComponent(delegateId)}`, { params: rangeParams(month, date) });
  return data.data;
}

export async function getSupervisorDrilldown(supervisorId, month, date) {
  const { data } = await api.get(`/oversight/supervisors/${encodeURIComponent(supervisorId)}`, { params: rangeParams(month, date) });
  return data.data;
}

export async function getInvoices(month) {
  const { data } = await api.get("/oversight/invoices", { params: month ? { month } : undefined });
  return data.data;
}
