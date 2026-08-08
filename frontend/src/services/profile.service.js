import api from "../api/axios";
import { invalidateRequestCache, loadCachedRequest } from "../utils/request-cache";

export async function getProfileDetails() {
  return loadCachedRequest("profile", 5 * 60 * 1000, async () => {
    const { data } = await api.get("/profile");
    return data.data;
  });
}

export async function updateProfileDetails(payload) {
  const { data } = await api.put("/profile", payload);
  invalidateRequestCache("profile");
  return data.data;
}

export async function updateProfileAvatar(avatarDataUrl) {
  const { data } = await api.put("/profile/avatar", { avatarDataUrl });
  invalidateRequestCache("profile");
  return data.data;
}
