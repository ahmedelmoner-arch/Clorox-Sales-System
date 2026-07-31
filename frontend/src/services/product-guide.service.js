import api from "../api/axios";

export async function getProductGuide() {
  const { data } = await api.get("/product-guide");
  return data.data;
}
