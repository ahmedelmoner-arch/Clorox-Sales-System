const { updateDelegateProfileImage } = require("../services/profile.service");

async function updateAvatar(req, res) {
  try {
    const data = await updateDelegateProfileImage(req.user, req.body?.avatarDataUrl);
    return res.json({ success: true, message: "Profile image updated successfully", data });
  } catch (error) {
    return res.status(error.statusCode || 400).json({ success: false, message: error.message });
  }
}

module.exports = { updateAvatar };
