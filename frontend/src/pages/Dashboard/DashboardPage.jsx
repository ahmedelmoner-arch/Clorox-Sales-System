import { useEffect, useState } from "react";
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Divider, Stack, Typography } from "@mui/material";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import AddCircleRoundedIcon from "@mui/icons-material/AddCircleRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import EventNoteRoundedIcon from "@mui/icons-material/EventNoteRounded";
import { useNavigate } from "react-router-dom";
import AppShell from "../../components/layout/AppShell";
import ProgressMetricCard from "../../components/common/ProgressMetricCard";
import { getDashboard } from "../../services/dashboard.service";
import { useSession } from "../../context/SessionContext";

const arabicNumber = (value) => Number(value || 0).toLocaleString("ar-EG");
const labels = { Sales: "مبيعات", Vouchers: "فاوتشر", Vacation: "إجازات" };

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getDashboard().then(setDashboard).catch((requestError) => setError(requestError.response?.data?.message || "تعذر تحميل بيانات لوحة التحكم."));
  }, []);

  const summary = dashboard?.summary || {};
  const name = user?.delegateName || user?.name || "مندوبة المبيعات";
  const today = new Intl.DateTimeFormat("ar-EG", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());

  return (
    <AppShell>
      <Card elevation={0} sx={{ mb: 2.5, overflow: "hidden", position: "relative", color: "white", borderRadius: 5, background: "linear-gradient(120deg, #0a4eb5, #1674e8 58%, #54a6ff)" }}>
        <Box sx={{ position: "absolute", width: 260, height: 260, borderRadius: "50%", border: "42px solid rgba(255,255,255,.08)", left: -105, top: -135 }} />
        <CardContent sx={{ position: "relative", p: { xs: 2.5, sm: 3.5 }, "&:last-child": { pb: { xs: 2.5, sm: 3.5 } } }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "end" }} spacing={2}>
            <Box><Typography sx={{ opacity: .84, mb: .4 }}>{today}</Typography><Typography variant="h5" fontWeight={900}>مرحبًا، {name} 👋</Typography><Typography sx={{ mt: .75, opacity: .9 }}>تابعي تقدمك الشهري وسجّلي تقريرك في دقائق.</Typography></Box>
            <Button variant="contained" onClick={() => navigate("/visit")} endIcon={<AddCircleRoundedIcon />} sx={{ bgcolor: "#fff", color: "#0750bc", px: 2, py: 1.2, "&:hover": { bgcolor: "#edf5ff" } }}>إضافة تقرير</Button>
          </Stack>
        </CardContent>
      </Card>
      {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}
      {!dashboard && !error ? <Box sx={{ minHeight: 260, display: "grid", placeItems: "center" }}><CircularProgress /></Box> : <>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(235px, 1fr))", gap: 2 }}>
          <ProgressMetricCard title="إنجاز العملاء" icon={<GroupsOutlinedIcon />} color="#14a06f" target={summary.targetConsumers} actual={summary.totalConsumers} unit="عميل" />
          <ProgressMetricCard title="إنجاز القطع" icon={<Inventory2OutlinedIcon />} color="#1565d8" target={summary.targetPieces} actual={summary.actualPieces} unit="قطعة" />
          <Card elevation={0} sx={{ border: "1px solid #e8edf7", borderRadius: 4 }}><CardContent sx={{ p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography color="text.secondary" fontWeight={700}>تقارير هذا الشهر</Typography><Box sx={{ width: 45, height: 45, display: "grid", placeItems: "center", borderRadius: 3, color: "#8e57e5", bgcolor: "#f2ebff" }}><DescriptionOutlinedIcon /></Box></Stack>
            <Typography variant="h3" fontWeight={900} sx={{ mt: 2 }}>{arabicNumber(summary.count)}</Typography>
            <Stack direction="row" spacing={.75} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>{Object.entries(summary.byType || {}).map(([type, count]) => <Chip key={type} size="small" label={`${labels[type] || type}: ${arabicNumber(count)}`} />)}</Stack>
            <Button size="small" onClick={() => navigate("/reports")} endIcon={<ArrowBackRoundedIcon />} sx={{ mt: 1.4, px: 0 }}>عرض تقاريري</Button>
          </CardContent></Card>
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.25fr .75fr" }, gap: 2, mt: 2 }}>
          <Card elevation={0} sx={{ border: "1px solid #e8edf7", borderRadius: 4 }}><CardContent sx={{ p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}><Box><Typography fontWeight={900}>ملخص اليوم</Typography><Typography variant="body2" color="text.secondary">آخر التحديثات المسجلة اليوم</Typography></Box><EventNoteRoundedIcon color="primary" /></Stack><Divider />
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", textAlign: "center", py: 2.5 }}>
              {[['تقارير', dashboard?.today?.reports], ['عملاء إيجابيون', dashboard?.today?.positiveConsumers], ['فاوتشر', dashboard?.today?.vouchers]].map(([label, value]) => <Box key={label}><Typography variant="h5" fontWeight={900}>{arabicNumber(value)}</Typography><Typography variant="caption" color="text.secondary">{label}</Typography></Box>)}
            </Box>
          </CardContent></Card>
          <Card elevation={0} sx={{ border: "1px solid #e8edf7", borderRadius: 4 }}><CardContent sx={{ p: 2.5 }}>
            <Typography fontWeight={900}>آخر تقرير</Typography>
            {dashboard?.lastReport ? <Stack spacing={.8} sx={{ mt: 1.5 }}><Typography fontWeight={800}>{dashboard.lastReport.BranchName || "تقرير إجازة"}</Typography><Typography variant="body2" color="text.secondary">{labels[dashboard.lastReport.ReportType] || dashboard.lastReport.ReportType} · {dashboard.lastReport.Date}</Typography><Typography variant="body2" color="text.secondary">{dashboard.lastReport.ProductName || dashboard.lastReport.VacationType || "لا توجد تفاصيل إضافية"}</Typography></Stack> : <Typography sx={{ mt: 2 }} color="text.secondary">لم يتم تسجيل أي تقرير هذا الشهر.</Typography>}
          </CardContent></Card>
        </Box>
      </>}
    </AppShell>
  );
}
