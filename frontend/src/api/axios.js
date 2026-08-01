import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "/api" : "http://localhost:5050/api"),
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  try {
    const session = JSON.parse(localStorage.getItem("clorox.sales.session") || "null");
    if (session?.token) config.headers.Authorization = `Bearer ${session.token}`;
  } catch {
    // A malformed browser cache should never prevent the request itself.
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== "/login") {
      localStorage.removeItem("clorox.sales.session");
      window.location.assign("/login");
    }
    return Promise.reject(error);
  },
);

export default api;
