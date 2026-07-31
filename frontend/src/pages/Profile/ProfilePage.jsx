import { useRef, useState } from "react";
import { Alert, Avatar, Box, Button, Card, CardContent, CircularProgress, Divider, IconButton, Snackbar, Stack, Typography } from "@mui/material";
import CameraAltRoundedIcon from "@mui/icons-material/CameraAltRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import AppShell from "../../components/layout/AppShell";
import { useSession } from "../../context/SessionContext";
import { updateProfileAvatar } from "../../services/profile.service";
import { useNavigate } from "react-router-dom";

const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_AVATAR_DATA_URL_LENGTH = 42000;

function readImage(file) {
  return new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(imageUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error("تعذر قراءة الصورة المختارة."));
    };
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
  const [feedback, setFeedback] = useState({ open: false, severity: "success", message: "" });
  const name = user?.delegateName || user?.name || "مندوبة المبيعات";
  const isDelegate = user?.role === "Delegate";

  async function chooseAvatar(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      setUploading(true);
      const avatarDataUrl = await compressAvatar(file);
      const result = await updateProfileAvatar(avatarDataUrl);
      updateUser({ avatarUrl: result.avatarUrl });
      const savedRange = result.sheetUpdate?.updatedRange;
      setFeedback({
        open: true,
        severity: "success",
        message: `تم حفظ صورة البروفايل في تبويب Delegates على Google Sheets (صف واحد)${savedRange ? ` — ${savedRange}` : ""}.`,
      });
    } catch (error) {
      setFeedback({ open: true, severity: "error", message: error.response?.data?.message || error.message || "تعذر حفظ صورة البروفايل." });
    } finally {
      setUploading(false);
    }
  }

  return (
    <AppShell>
      <Typography variant="h5" fontWeight={900} sx={{ mb: 2.5 }}>حسابي</Typography>
      <Card elevation={0} sx={{ maxWidth: 620, mx: "auto", border: "1px solid #e8edf7", borderRadius: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack alignItems="center" spacing={1.25}>
            <Box sx={{ position: "relative" }}>
              <Avatar src={user?.avatarUrl || undefined} sx={{ width: 104, height: 104, fontSize: 36, bgcolor: "#e9f1ff", color: "primary.main", border: "4px solid #f5f8ff", boxShadow: "0 8px 20px rgba(21,91,209,.16)" }}>
                {name.charAt(0)}
              </Avatar>
              {isDelegate && <IconButton aria-label="تغيير صورة البروفايل" disabled={uploading} onClick={() => inputRef.current?.click()} sx={{ position: "absolute", left: -4, bottom: -4, width: 38, height: 38, color: "#fff", bgcolor: "primary.main", border: "3px solid #fff", boxShadow: "0 5px 12px rgba(21,91,209,.28)", "&:hover": { bgcolor: "primary.dark" } }}>
                {uploading ? <CircularProgress size={17} color="inherit" /> : <CameraAltRoundedIcon fontSize="small" />}
              </IconButton>}
              {isDelegate && <input ref={inputRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseAvatar} />}
            </Box>
            <Typography variant="h6" fontWeight={900}>{name}</Typography>
            <Typography color="text.secondary">{isDelegate ? "مندوبة مبيعات" : user?.role || "مستخدم"}</Typography>
            {isDelegate && <Button size="small" disabled={uploading} startIcon={<CameraAltRoundedIcon />} onClick={() => inputRef.current?.click()} sx={{ mt: .25, fontWeight: 800 }}>
              {uploading ? "جارٍ حفظ الصورة..." : "تغيير صورة البروفايل"}
            </Button>}
          </Stack>

          <Divider sx={{ my: 3 }} />
          <Stack spacing={2}>
            {[["كود المندوبة", user?.delegateId || "—"], ["كود المشرف", user?.supervisorCode || "—"], ["الدور", user?.role || "—"]].map(([label, value]) => (
              <Stack key={label} direction="row" justifyContent="space-between">
                <Typography color="text.secondary">{label}</Typography>
                <Typography fontWeight={800}>{value}</Typography>
              </Stack>
            ))}
          </Stack>
          <Button fullWidth color="error" variant="outlined" endIcon={<LogoutRoundedIcon />} sx={{ mt: 4 }} onClick={() => { logout(); navigate("/login"); }}>
            تسجيل الخروج
          </Button>
        </CardContent>
      </Card>
      <Snackbar open={feedback.open} autoHideDuration={5000} onClose={() => setFeedback((current) => ({ ...current, open: false }))}>
        <Alert severity={feedback.severity} variant="filled" onClose={() => setFeedback((current) => ({ ...current, open: false }))}>{feedback.message}</Alert>
      </Snackbar>
    </AppShell>
  );
}
