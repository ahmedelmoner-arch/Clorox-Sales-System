import api from "../api/axios";

export async function login(delegateCode, secretCode) {
  try {
    const { data } = await api.post("/auth/login", {
      delegateCode,
      secretCode,
    });

    return data;
  } catch (error) {
    return {
      success: false,
      message:
        error.response?.data?.message ||
        "حدث خطأ أثناء تسجيل الدخول",
    };
  }
}