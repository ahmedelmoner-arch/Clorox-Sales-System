import api from "../api/axios";
import { loadCachedRequest } from "../utils/request-cache";

export async function getDashboardData() {
    return loadCachedRequest("dashboard:current", 30 * 1000, async () => {
        const response = await api.get("/dashboard");
        return response.data.data;
    });
}
