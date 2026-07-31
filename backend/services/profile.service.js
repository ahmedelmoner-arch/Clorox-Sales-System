const { currentDate, ensureSheetHeaders, getSheetRows, toDate, updateSheetRow } = require("./sheets.service");

const DELEGATE_SHEET = "Delegates";
const PROFILE_IMAGE_HEADER = "ProfileImage";
const PROFILE_DETAILS_HEADERS = ["MobileNumber", "NationalID", "HireDate"];
const MAX_PROFILE_IMAGE_LENGTH = 42000;

function normalize(value) {
  return String(value ?? "").trim();
}

function profileError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function delegateIdFromUser(user) {
  const delegateId = normalize(user?.delegateId || user?.id);
  if (!delegateId) throw profileError("لم يتم العثور على حساب المندوبة.", 401);
  return delegateId;
}

async function getDelegateRecord(user) {
  const delegateId = delegateIdFromUser(user);
  const delegateSheet = await getSheetRows(DELEGATE_SHEET);
  const rowIndex = delegateSheet.rows.findIndex((row) => normalize(row.DelegateID) === delegateId);
  if (rowIndex === -1) throw profileError("لم يتم العثور على المندوبة في تبويب Delegates.", 404);
  return { delegateSheet, rowIndex, record: delegateSheet.rows[rowIndex] };
}

function validateProfileImage(value) {
  const image = normalize(value);
  if (!image) throw profileError("اختر صورة للملف الشخصي أولًا.");
  if (image.length > MAX_PROFILE_IMAGE_LENGTH) {
    throw profileError("الصورة كبيرة جدًا للحفظ. اختاري صورة أصغر أو أعيدي المحاولة.");
  }
  if (!/^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(image)) {
    throw profileError("صيغة الصورة غير مدعومة. استخدمي JPG أو PNG أو WebP.");
  }
  return image;
}

function validateMobileNumber(value) {
  const mobileNumber = normalize(value);
  if (!mobileNumber) return "";
  const digits = mobileNumber.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) {
    throw profileError("أدخلي رقم موبايل صحيحًا.");
  }
  return mobileNumber;
}

function validateNationalId(value) {
  const nationalId = normalize(value).replace(/\s/g, "");
  if (!nationalId) return "";
  if (!/^\d{14}$/.test(nationalId)) {
    throw profileError("الرقم القومي يجب أن يتكون من 14 رقمًا.");
  }
  return nationalId;
}

function validateHireDate(value) {
  const hireDate = toDate(value);
  if (!hireDate) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(hireDate)) throw profileError("أدخلي تاريخ تعيين صحيحًا.");
  if (hireDate > currentDate()) throw profileError("تاريخ التعيين لا يمكن أن يكون في المستقبل.");
  return hireDate;
}

function yearsOfService(hireDate) {
  const normalizedHireDate = validateHireDate(hireDate);
  if (!normalizedHireDate) return null;
  const today = currentDate();
  const [hireYear, hireMonth, hireDay] = normalizedHireDate.split("-").map(Number);
  const [year, month, day] = today.split("-").map(Number);
  const anniversaryReached = month > hireMonth || (month === hireMonth && day >= hireDay);
  return Math.max(0, year - hireYear - (anniversaryReached ? 0 : 1));
}

function asProfile(record) {
  const hireDate = toDate(record.HireDate);
  return {
    mobileNumber: normalize(record.MobileNumber),
    nationalId: normalize(record.NationalID),
    hireDate,
    yearsOfService: yearsOfService(hireDate),
  };
}

async function getDelegateProfile(user) {
  const { record } = await getDelegateRecord(user);
  return asProfile(record);
}

async function updateDelegateProfile(user, details) {
  const { delegateSheet, rowIndex, record } = await getDelegateRecord(user);
  const profile = {
    mobileNumber: validateMobileNumber(details?.mobileNumber),
    nationalId: validateNationalId(details?.nationalId),
    hireDate: validateHireDate(details?.hireDate),
  };
  const headers = await ensureSheetHeaders(DELEGATE_SHEET, PROFILE_DETAILS_HEADERS);
  const updatedRecord = {
    ...record,
    MobileNumber: profile.mobileNumber,
    NationalID: profile.nationalId,
    HireDate: profile.hireDate,
  };
  const sheetUpdate = await updateSheetRow(DELEGATE_SHEET, headers, delegateSheet.rowNumbers[rowIndex], updatedRecord);
  return { ...profile, yearsOfService: yearsOfService(profile.hireDate), sheetUpdate };
}

async function updateDelegateProfileImage(user, profileImage) {
  const { delegateSheet, rowIndex, record } = await getDelegateRecord(user);
  const image = validateProfileImage(profileImage);
  const headers = await ensureSheetHeaders(DELEGATE_SHEET, [PROFILE_IMAGE_HEADER]);
  const updatedRecord = { ...record, [PROFILE_IMAGE_HEADER]: image };
  const sheetUpdate = await updateSheetRow(DELEGATE_SHEET, headers, delegateSheet.rowNumbers[rowIndex], updatedRecord);
  return { avatarUrl: image, sheetUpdate };
}

module.exports = { getDelegateProfile, updateDelegateProfile, updateDelegateProfileImage, yearsOfService };
