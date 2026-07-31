const { getDelegateProfile, updateDelegateProfile, updateDelegateProfileImage } = require("../services/profile.service");

async function getProfile(req, res) {
  try {
    const data = await getDelegateProfile(req.user);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(error.statusCode || 400).json({ success: false, message: error.message });
  }
}

async function updateProfile(req, res) {
  try {
    const data = await updateDelegateProfile(req.user, req.body);
    return res.json({ success: true, message: "Profile updated successfully", data });
  } catch (error) {
    return res.status(error.statusCode || 400).json({ success: false, message: error.message });
  }
}

async function updateAvatar(req, res) {
  try {
    const data = await updateDelegateProfileImage(req.user, req.body?.avatarDataUrl);
    return res.json({ success: true, message: "Profile image updated successfully", data });
  } catch (error) {
    return res.status(error.statusCode || 400).json({ success: false, message: error.message });
  }
}

module.exports = { getProfile, updateAvatar, updateProfile };
