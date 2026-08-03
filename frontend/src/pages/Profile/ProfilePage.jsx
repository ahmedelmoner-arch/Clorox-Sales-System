import { useEffect, useRef, useState } from "react";
import { Alert, Avatar, Box, Button, Card, CardContent, CircularProgress, Divider, IconButton, Snackbar, Stack, TextField, Typography } from "@mui/material";
import CameraAltRoundedIcon from "@mui/icons-material/CameraAltRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import PhoneIphoneRoundedIcon from "@mui/icons-material/PhoneIphoneRounded";
import WorkHistoryRoundedIcon from "@mui/icons-material/WorkHistoryRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import AppShell from "../../components/layout/AppShell";
import { useSession } from "../../context/SessionContext";
import { getProfileDetails, updateProfileAvatar, updateProfileDetails } from "../../services/profile.service";
import { useNavigate } from "react-router-dom";

const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_AVATAR_DATA_URL_LENGTH = 42000;

function cairoDate() {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date())
    .reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function calculateYearsOfService(hireDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(hireDate || "")) return null;
  const [hireYear, hireMonth, hireDay] = hireDate.split("-").map(Number);
  const [year, month, day] = cairoDate().split("-").map(Number);
  if (hireDate > cairoDate()) return null;
  return Math.max(0, year - hireYear - (month > hireMonth || (month === hireMonth && day >= hireDay) ? 0 : 1));
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(imageUrl); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(imageUrl); reject(new Error("تعذر قراءة الصورة المختارة.")); };
    image.src = imageUrl;
  });
}

async function compressAvatar(file) {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) throw new Error("اختاري صورة بصيغة JPG أو PNG أو WebP.");
  if (file.size > 8 * 1024 * 1024) throw new Error("الصورة كبيرة جدًا. اختاري صورة بحجم أقل من 8 ميجابايت.");

  const image = await readImage(file);
  const cropSize = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = (image.naturalWidth - cropSize) / 2;
  const sourceY = (image.naturalHeight - cropSize) / 2;
  const canvas = document.createElement("canvas");

  for (const size of [260, 220, 180, 150]) {
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    context.drawImage(image, sourceX, sourceY, cropSize, cropSize, 0, 0, size, size);
    for (const quality of [.84, .74, .64]) {
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      if (dataUrl.length <= MAX_AVATAR_DATA_URL_LENGTH) return dataUrl;
    }
  }
  throw new Error("تعذر ضغط الصورة للحجم المناسب. اختاري صورة أوضح وأصغر حجمًا.");
}

export default function ProfilePage() {
  const { user, logout, updateUser } = useSession();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [details, setDetails] = useState({ mobileNumber: "", nationalId: "", hireDate: "" });
  const [feedback, setFeedback] = useState({ open: false, severity: "success", message: "" });
  const name = user?.delegateName || user?.name || "مندوبة المبيعات";
  const isDelegate = user?.role === "Delegate";
  const yearsOfService = calculateYearsOfService(details.hireDate);

  useEffect(() => {
    if (!isDelegate) return undefined;
    let cancelled = false;
    setProfileLoading(true);
    getProfileDetails()
      .then((data) => {
        if (!cancelled) setDetails({ mobileNumber: data.mobileNumber || "", nationalId: data.nationalId || "", hireDate: data.hireDate || "" });
      })
      .catch((error) => {
        if (!cancelled) setFeedback({ open: true, severity: "error", message: error.response?.data?.message || "تعذر تحميل بيانات الحساب." });
      })
      .finally(() => { if (!cancelled) setProfileLoading(false); });
    return () => { cancelled = true; };
  }, [isDelegate]);

  async function chooseAvatar(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setUploading(true);
      const result = await updateProfileAvatar(await compressAvatar(file));
      updateUser({ avatarUrl: result.avatarUrl });
      const savedRange = result.sheetUpdate?.updatedRange;
      setFeedback({ open: true, severity: "success", message: `تم حفظ صورة البروفايل في تبويب Delegates على Google Sheets (صف واحد)${savedRange ? ` — ${savedRange}` : ""}.` });
    } catch (error) {
      setFeedback({ open: true, severity: "error", message: error.response?.data?.message || error.message || "تعذر حفظ صورة البروفايل." });
    } finally { setUploading(false); }
  }

  async function saveDetails(event) {
    event.preventDefault();
    try {
      setSavingDetails(true);
      const result = await updateProfileDetails(details);
      setDetails({ mobileNumber: result.mobileNumber || "", nationalId: result.nationalId || "", hireDate: result.hireDate || "" });
      const savedRange = result.sheetUpdate?.updatedRange;
      setFeedback({ open: true, severity: "success", message: `تم حفظ بياناتك في تبويب Delegates على Google Sheets (صف واحد)${savedRange ? ` — ${savedRange}` : ""}.` });
    } catch (error) {
      setFeedback({ open: true, severity: "error", message: error.response?.data?.message || "تعذر حفظ بيانات الحساب." });
    } finally { setSavingDetails(false); }
  }

  return (
    <AppShell>
      <Box className="delegate-screen-title"><Box><Typography className="delegate-screen-title__eyebrow">إدارة الحساب</Typography><Typography variant="h5" fontWeight={900}>الملف الشخصي</Typography></Box></Box>
      <Card elevation={0} sx={{ maxWidth: 620, mx: "auto", overflow: "hidden", border: "1px solid #dce7f5", borderRadius: 4, boxShadow: "0 12px 28px rgba(27,75,148,.06)" }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack alignItems="center" spacing={1.25}>
            <Box sx={{ position: "relative" }}>
              <Avatar src={user?.avatarUrl || undefined} sx={{ width: 104, height: 104, fontSize: 36, bgcolor: "#e9f1ff", color: "primary.main", border: "4px solid #f5f8ff", boxShadow: "0 8px 20px rgba(21,91,209,.16)" }}>{name.charAt(0)}</Avatar>
              {isDelegate && <IconButton aria-label="تغيير صورة البروفايل" disabled={uploading} onClick={() => inputRef.current?.click()} sx={{ position: "absolute", left: -4, bottom: -4, width: 38, height: 38, color: "#fff", bgcolor: "primary.main", border: "3px solid #fff", boxShadow: "0 5px 12px rgba(21,91,209,.28)", "&:hover": { bgcolor: "primary.dark" } }}>{uploading ? <CircularProgress size={17} color="inherit" /> : <CameraAltRoundedIcon fontSize="small" />}</IconButton>}
              {isDelegate && <input ref={inputRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseAvatar} />}
            </Box>
            <Typography variant="h6" fontWeight={900}>{name}</Typography>
            <Typography color="text.secondary">{isDelegate ? "مندوبة مبيعات" : user?.role || "مستخدم"}</Typography>
            {isDelegate && <Button size="small" disabled={uploading} startIcon={<CameraAltRoundedIcon />} onClick={() => inputRef.current?.click()} sx={{ mt: .25, fontWeight: 800 }}>{uploading ? "جارٍ حفظ الصورة..." : "تغيير صورة البروفايل"}</Button>}
          </Stack>

          <Divider sx={{ my: 3 }} />
          <Stack spacing={2}>{[["كود المندوبة", user?.delegateId || "—"], ["كود المشرف", user?.supervisorCode || "—"], ["الدور", user?.role || "—"]].map(([label, value]) => <Stack key={label} direction="row" justifyContent="space-between"><Typography color="text.secondary">{label}</Typography><Typography fontWeight={800}>{value}</Typography></Stack>)}</Stack>

          {isDelegate && <>
            <Divider sx={{ my: 3 }} />
            <Stack component="form" onSubmit={saveDetails} spacing={2}>
              <Box><Typography fontWeight={900}>البيانات الوظيفية</Typography><Typography variant="caption" color="text.secondary">هذه البيانات خاصة بحسابك وتُحفظ في ملف المندوبات.</Typography></Box>
              {profileLoading ? <Box sx={{ minHeight: 150, display: "grid", placeItems: "center" }}><CircularProgress size={28} /></Box> : <>
                <TextField fullWidth label="رقم الموبايل" value={details.mobileNumber} onChange={(event) => setDetails((current) => ({ ...current, mobileNumber: event.target.value }))} inputProps={{ inputMode: "tel", maxLength: 18 }} InputProps={{ startAdornment: <PhoneIphoneRoundedIcon color="primary" sx={{ ml: 1 }} /> }} />
                <TextField fullWidth label="الرقم القومي" value={details.nationalId} onChange={(event) => setDetails((current) => ({ ...current, nationalId: event.target.value.replace(/\D/g, "").slice(0, 14) }))} inputProps={{ inputMode: "numeric", maxLength: 14 }} InputProps={{ startAdornment: <BadgeRoundedIcon color="primary" sx={{ ml: 1 }} /> }} helperText="14 رقمًا" />
                <TextField fullWidth type="date" label="تاريخ التعيين" value={details.hireDate} onChange={(event) => setDetails((current) => ({ ...current, hireDate: event.target.value }))} InputLabelProps={{ shrink: true }} inputProps={{ max: cairoDate() }} InputProps={{ startAdornment: <CalendarMonthRoundedIcon color="primary" sx={{ ml: 1 }} /> }} />
                <Box sx={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 1.3, alignItems: "center", p: 1.5, borderRadius: 2.5, bgcolor: "#f0f7ff", border: "1px solid #d8e8fb" }}><Box sx={{ width: 42, height: 42, display: "grid", placeItems: "center", color: "#1269df", bgcolor: "#fff", borderRadius: 2 }}><WorkHistoryRoundedIcon /></Box><Box><Typography variant="caption" color="text.secondary">سنوات العمل</Typography><Typography fontWeight={900} color="#1269df">{yearsOfService === null ? "أضيفي تاريخ التعيين" : `${yearsOfService} سنة`}</Typography></Box></Box>
                <Button type="submit" variant="contained" disabled={savingDetails} startIcon={savingDetails ? <CircularProgress size={18} color="inherit" /> : <SaveRoundedIcon />} sx={{ py: 1.2, fontWeight: 900 }}>{savingDetails ? "جارٍ الحفظ..." : "حفظ البيانات"}</Button>
              </>}
            </Stack>
          </>}

          <Button fullWidth color="error" variant="outlined" endIcon={<LogoutRoundedIcon />} sx={{ mt: 4 }} onClick={() => { logout(); navigate("/login"); }}>تسجيل الخروج</Button>
        </CardContent>
      </Card>
      <Snackbar open={feedback.open} autoHideDuration={5000} onClose={() => setFeedback((current) => ({ ...current, open: false }))}><Alert severity={feedback.severity} variant="filled" onClose={() => setFeedback((current) => ({ ...current, open: false }))}>{feedback.message}</Alert></Snackbar>
    </AppShell>
  );
}
