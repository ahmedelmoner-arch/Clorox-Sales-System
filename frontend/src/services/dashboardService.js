import api from "../api/axios";

export async function getDashboardData() {
    const response = await api.get("/dashboard");
    return response.data.data;
}
