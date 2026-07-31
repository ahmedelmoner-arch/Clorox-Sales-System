const { ensureSheetHeaders, getSheetRows, updateSheetRow } = require("./sheets.service");

const DELEGATE_SHEET = "Delegates";
const PROFILE_IMAGE_HEADER = "ProfileImage";
const MAX_PROFILE_IMAGE_LENGTH = 42000;

function normalize(value) {
  return String(value ?? "").trim();
}

function validateProfileImage(value) {
  const image = normalize(value);
  if (!image) throw new Error("اختر صورة للملف الشخصي أولًا.");
  if (image.length > MAX_PROFILE_IMAGE_LENGTH) {
    throw new Error("الصورة كبيرة جدًا للحفظ. اختاري صورة أصغر أو أعيدي المحاولة.");
  }
  if (!/^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(image)) {
    throw new Error("صيغة الصورة غير مدعومة. استخدمي JPG أو PNG أو WebP.");
  }
  return image;
}

async function updateDelegateProfileImage(user, profileImage) {
  const delegateId = normalize(user?.delegateId || user?.id);
  if (!delegateId) {
    const error = new Error("لم يتم العثور على حساب المندوبة.");
    error.statusCode = 401;
    throw error;
  }

  const image = validateProfileImage(profileImage);
  const delegateSheet = await getSheetRows(DELEGATE_SHEET);
  const rowIndex = delegateSheet.rows.findIndex((row) => normalize(row.DelegateID) === delegateId);
  if (rowIndex === -1) {
    const error = new Error("لم يتم العثور على المندوبة في تبويب Delegates.");
    error.statusCode = 404;
    throw error;
  }

  const headers = await ensureSheetHeaders(DELEGATE_SHEET, [PROFILE_IMAGE_HEADER]);
  const updatedRecord = {
    ...delegateSheet.rows[rowIndex],
    [PROFILE_IMAGE_HEADER]: image,
  };
  const sheetUpdate = await updateSheetRow(
    DELEGATE_SHEET,
    headers,
    delegateSheet.rowNumbers[rowIndex],
    updatedRecord
  );

  return { avatarUrl: image, sheetUpdate };
}

module.exports = { updateDelegateProfileImage };
