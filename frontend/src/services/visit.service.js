import api from "../api/axios";

export async function getVisitInit(date, branch) {
  const params = {
    ...(date ? { date } : {}),
    ...(branch?.code ? { branchId: branch.code } : {}),
    ...(branch?.name ? { branchName: branch.name } : {}),
  };
  const { data } = await api.get("/visits/init", { params });
  return data.data;
}
