import api from "../api/axios";
import { loadCachedRequest } from "../utils/request-cache";

export async function getProductGuide() {
  return loadCachedRequest("product-guide", 30 * 60 * 1000, async () => {
    const { data } = await api.get("/product-guide");
    return data.data;
  });
}
