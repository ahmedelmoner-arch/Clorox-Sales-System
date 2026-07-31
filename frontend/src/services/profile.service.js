import api from "../api/axios";

export async function updateProfileAvatar(avatarDataUrl) {
  const { data } = await api.put("/profile/avatar", { avatarDataUrl });
  return data.data;
}
