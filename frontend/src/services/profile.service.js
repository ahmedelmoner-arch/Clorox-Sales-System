import api from "../api/axios";

export async function getProfileDetails() {
  const { data } = await api.get("/profile");
  return data.data;
}

export async function updateProfileDetails(payload) {
  const { data } = await api.put("/profile", payload);
  return data.data;
}

export async function updateProfileAvatar(avatarDataUrl) {
  const { data } = await api.put("/profile/avatar", { avatarDataUrl });
  return data.data;
}
