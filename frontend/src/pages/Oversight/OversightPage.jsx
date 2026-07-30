import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Card, CardContent, CircularProgress, Dialog, DialogContent, DialogTitle, Divider, IconButton, Stack, TextField, Typography } from "@mui/material";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import SupervisorAccountRoundedIcon from "@mui/icons-material/SupervisorAccountRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import AppShell from "../../components/layout/AppShell";
import { useSession } from "../../context/SessionContext";
import { getDelegateDrilldown, getOversight } from "../../services/oversight.service";
import { normalizeRole, roleLabel } from "../../utils/roles";
import { getCairoDate } from "../../utils/date";

const number = (value) => Number(value || 0).toLocaleString("ar-EG");
const percent = (actual, target) => target ? `${number(Math.round((actual / target) * 100))}٪` : "-";

function formatMonth(value) {
  const date = new Date(`${value}-01T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("ar-EG", { month: "long", year: "numeric" }).format(date);
}

function formatDay(value) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("ar-EG", { weekday: "long", day: "numeric", month: "long" }).format(date);
}

function MetricCard({ title, value, hint, color, icon }) {
  return <Card elevation={0} sx={{ position: "relative", overflow: "hidden", border: "1px solid #dfe7f1", borderRadius: 3, bgcolor: "#fff", boxShadow: "0 7px 18px rgba(25,43,76,.05)", "&::after": { content: '\"\"', position: "absolute", insetBlock: 0, right: 0, width: 4, bgcolor: color } }}><CardContent sx={{ p: 1.6, "&:last-child": { pb: 1.6 } }}><Stack direction="row" justifyContent="space-between" alignItems="center"><Box><Typography variant="caption" color="text.secondary" fontWeight={700}>{title}</Typography><Typography fontWeight={900} sx={{ fontSize: 23, color: "#132f58", mt: .25 }}>{value}</Typography><Typography variant="caption" color={color} fontWeight={800}>{hint}</Typography></Box><Box sx={{ width: 38, height: 38, display: "grid", placeItems: "center", borderRadius: "50%", bgcolor: `${color}14`, color }}>{icon}</Box></Stack></CardContent></Card>;
}

function PerformanceTable({ rows, type, onSelect }) {
  const columns = "minmax(150px, 1.4fr) 104px 104px 74px 66px";
  return <Box sx={{ overflowX: "auto", border: "1px solid #e0e8f2", borderRadius: 2.5 }}><Box sx={{ minWidth: 540 }}><Box sx={{ display: "grid", gridTemplateColumns: columns, px: 1.3, py: 1, bgcolor: "#f5f8fc", gap: 1 }}><Typography variant="caption" fontWeight={800}>الاسم</Typography><Typography variant="caption" textAlign="center" fontWeight={800}>القطع</Typography><Typography variant="caption" textAlign="center" fontWeight={800}>العملاء</Typography><Typography variant="caption" textAlign="center" fontWeight={800}>الإنجاز</Typography><Typography variant="caption" textAlign="center" fontWeight={800}>التقارير</Typography></Box>{rows.length ? rows.map((row) => { const name = type === "supervisor" ? row.supervisorName : row.delegateName; const teamCount = type === "supervisor" ? ` (${number(row.delegates)})` : ""; const clickable = Boolean(onSelect && type === "delegate"); return <Box key={row.supervisorId || row.delegateId} role={clickable ? "button" : undefined} tabIndex={clickable ? 0 : undefined} onClick={clickable ? () => onSelect(row) : undefined} onKeyDown={clickable ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(row); } } : undefined} sx={{ display: "grid", gridTemplateColumns: columns, px: 1.3, py: 1.15, gap: 1, borderTop: "1px solid #edf1f6", alignItems: "center", cursor: clickable ? "pointer" : "default", transition: "background-color .18s ease", "&:hover": clickable ? { bgcolor: "#f7fbff" } : undefined, "&:focus-visible": clickable ? { outline: "3px solid #2563eb55", outlineOffset: -3 } : undefined }}><Stack direction="row" alignItems="center" spacing={.35} minWidth={0}><Typography fontWeight={800} noWrap>{name}{teamCount}</Typography>{clickable && <ChevronLeftRoundedIcon sx={{ color: "#2563eb", fontSize: 19 }} />}</Stack><Typography textAlign="center" fontWeight={700}>{number(row.actualPieces)} / {number(row.targetPieces)}</Typography><Typography textAlign="center" fontWeight={700}>{number(row.totalConsumers)} / {number(row.targetConsumers)}</Typography><Typography textAlign="center" color="#0f766e" fontWeight={900}>{percent(row.actualPieces, row.targetPieces)}</Typography><Typography textAlign="center" color="text.secondary">{number(row.reports)}</Typography></Box>; }) : <Typography sx={{ p: 3, textAlign: "center" }} color="text.secondary">لا توجد بيانات لهذا الشهر.</Typography>}</Box></Box>;
}

function CategoryTable({ categories, detailed = false }) {
  const columns = "minmax(150px, 1fr) 92px 92px 78px";
  return <Box sx={{ overflowX: "auto", border: "1px solid #e0e8f2", borderRadius: 2.5 }}><Box sx={{ minWidth: 460 }}><Box sx={{ display: "grid", gridTemplateColumns: columns, px: 1.3, py: 1, bgcolor: "#f5f8fc" }}><Typography variant="caption" fontWeight={800}>الكاتيجوري / المنتج</Typography><Typography variant="caption" textAlign="center" fontWeight={800}>المحقق</Typography><Typography variant="caption" textAlign="center" fontWeight={800}>الهدف</Typography><Typography variant="caption" textAlign="center" fontWeight={800}>الإنجاز</Typography></Box>{categories.length ? categories.map((category) => <Box key={category.category}><Box sx={{ display: "grid", gridTemplateColumns: columns, px: 1.3, py: 1.1, borderTop: "1px solid #d7ebe7", bgcolor: "#eff9f7" }}><Typography fontWeight={900} color="#0f766e">{category.category}</Typography><Typography textAlign="center" color="#16825a" fontWeight={800}>{number(category.actualPieces)}</Typography><Typography textAlign="center">{number(category.targetPieces)}</Typography><Typography textAlign="center" color="#0f766e" fontWeight={900}>{percent(category.actualPieces, category.targetPieces)}</Typography></Box>{detailed && (category.products || []).map((product) => <Box key={product.productId} sx={{ display: "grid", gridTemplateColumns: columns, px: 1.3, py: 1.05, borderTop: "1px solid #edf1f6" }}><Typography fontWeight={700} sx={{ pr: 1.5, position: "relative", "&::before": { content: '\"\"', position: "absolute", right: 0, top: "50%", width: 6, height: 6, borderRadius: "50%", bgcolor: "#94a3b8", transform: "translateY(-50%)" } }}>{product.productName}</Typography><Typography textAlign="center" color="#16825a" fontWeight={700}>{number(product.actualPieces)}</Typography><Typography textAlign="center">{number(product.targetPieces)}</Typography><Typography textAlign="center" color="#2563eb" fontWeight={900}>{percent(product.actualPieces, product.targetPieces)}</Typography></Box>)}</Box>) : <Typography sx={{ p: 3, textAlign: "center" }} color="text.secondary">لا توجد أهداف أو منتجات لهذا الشهر.</Typography>}</Box></Box>;
}

function SummaryStrip({ summary }) {
  const item = (label, value, accent) => <Box key={label} sx={{ minWidth: 0, px: 1.15, py: .55, borderInlineStart: "1px solid #e4ebf3", "&:first-of-type": { borderInlineStart: "none" } }}><Typography variant="caption" color="text.secondary" display="block">{label}</Typography><Typography fontWeight={900} color={accent} noWrap>{value}</Typography></Box>;
  return <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))" }, border: "1px solid #e0e9f0", borderRadius: 2.5, overflow: "hidden", bgcolor: "#fbfefe" }}>{item("القطع", `${number(summary.actualPieces)} / ${number(summary.targetPieces)}`, "#0f766e")}{item("إنجاز القطع", percent(summary.actualPieces, summary.targetPieces), "#0f766e")}{item("العملاء", `${number(summary.totalConsumers)} / ${number(summary.targetConsumers)}`, "#7c3aed")}{item("إنجاز العملاء", percent(summary.totalConsumers, summary.targetConsumers), "#7c3aed")}{item("الفواتشر", number(summary.vouchers), "#d97706")}{item("التقارير", number(summary.reports), "#2563eb")}</Box>;
}

function DayCard({ day, onOpen }) {
  return <Card role="button" tabIndex={0} elevation={0} onClick={() => onOpen(day)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen(day); } }} sx={{ cursor: "pointer", overflow: "hidden", border: "1px solid #dce8f0", borderRadius: 3, bgcolor: "#fff", transition: "transform .18s ease, box-shadow .18s ease", "&:hover": { transform: "translateY(-2px)", boxShadow: "0 11px 22px rgba(32,84,116,.12)" }, "&:focus-visible": { outline: "3px solid #2563eb55", outlineOffset: 2 } }}><CardContent sx={{ p: 1.45, "&:last-child": { pb: 1.45 } }}><Stack direction="row" alignItems="center" spacing={.8} sx={{ mb: 1 }}><Box sx={{ width: 32, height: 32, display: "grid", placeItems: "center", borderRadius: "50%", bgcolor: "#eef5ff", color: "#2563eb" }}><CalendarMonthRoundedIcon fontSize="small" /></Box><Typography fontWeight={900} fontSize={14} noWrap>{formatDay(day.date)}</Typography></Stack><Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", textAlign: "center" }}><Box><Typography variant="caption" color="text.secondary">قطع</Typography><Typography fontWeight={900}>{number(day.actualPieces)}</Typography></Box><Box sx={{ borderInlineStart: "1px solid #e5edf4" }}><Typography variant="caption" color="text.secondary">عملاء</Typography><Typography fontWeight={900}>{number(day.totalConsumers)}</Typography></Box><Box sx={{ borderInlineStart: "1px solid #e5edf4" }}><Typography variant="caption" color="text.secondary">إنجاز</Typography><Typography fontWeight={900} color="#0f766e">{percent(day.actualPieces, day.targetPieces)}</Typography></Box></Box></CardContent></Card>;
}

function DelegateDetailDialog({ delegate, data, loading, error, onClose, onOpenDay }) {
  if (!delegate) return null;
  const summary = data?.summary || {};
  return <Dialog open onClose={onClose} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}><DialogTitle sx={{ pb: 1.5 }}><Stack direction="row" alignItems="center" justifyContent="space-between"><Stack direction="row" spacing={1} alignItems="center"><Box sx={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 2.5, color: "#2563eb", bgcolor: "#eef5ff" }}><TrendingUpRoundedIcon /></Box><Box><Typography fontWeight={900}>{delegate.delegateName || "مندوبة"}</Typography><Typography variant="caption" color="text.secondary">{data ? formatMonth(data.month) : "جارٍ التحميل"}</Typography></Box></Stack><IconButton aria-label="إغلاق" onClick={onClose}><CloseRoundedIcon /></IconButton></Stack></DialogTitle><DialogContent dividers>{loading && <Box sx={{ minHeight: 280, display: "grid", placeItems: "center" }}><CircularProgress /></Box>}{!loading && error && <Alert severity="warning">{error}</Alert>}{!loading && data && <><Typography fontWeight={900} sx={{ mb: 1 }}>التراكمي الشهري</Typography><SummaryStrip summary={summary} /><Stack direction="row" alignItems="center" spacing={.8} sx={{ mt: 2.5, mb: 1 }}><CalendarMonthRoundedIcon sx={{ color: "#2563eb" }} /><Typography fontWeight={900}>أيام التسجيل</Typography><Typography variant="caption" color="text.secondary">{number(data.days.length)} أيام</Typography></Stack>{data.days.length ? <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 1.1 }}>{data.days.map((day) => <DayCard key={day.date} day={day} onOpen={onOpenDay} />)}</Box> : <Box sx={{ py: 3, textAlign: "center", border: "1px dashed #ced9e8", borderRadius: 2.5 }}><Typography color="text.secondary">لا توجد أيام تسجيل في هذا الشهر.</Typography></Box>}<Box sx={{ mt: 2.5 }}><Typography fontWeight={900} sx={{ mb: 1 }}>المنتجات والكاتيجوري - التراكمي الشهري</Typography><CategoryTable categories={summary.categories || []} detailed /></Box></>}</DialogContent></Dialog>;
}

function DayDetailDialog({ day, onClose }) {
  if (!day) return null;
  return <Dialog open onClose={onClose} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}><DialogTitle sx={{ pb: 1.5 }}><Stack direction="row" alignItems="center" justifyContent="space-between"><Stack direction="row" spacing={1} alignItems="center"><Box sx={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 2.5, color: "#0f766e", bgcolor: "#eaf8f4" }}><CalendarMonthRoundedIcon /></Box><Box><Typography fontWeight={900}>تفاصيل اليوم</Typography><Typography variant="caption" color="text.secondary">{formatDay(day.date)}</Typography></Box></Stack><IconButton aria-label="رجوع" onClick={onClose}><CloseRoundedIcon /></IconButton></Stack></DialogTitle><DialogContent dividers><SummaryStrip summary={day} /><Box sx={{ mt: 2.5 }}><Typography fontWeight={900} sx={{ mb: 1 }}>الكاتيجوري والمنتجات المسجلة</Typography><CategoryTable categories={day.categories || []} detailed /></Box></DialogContent></Dialog>;
}

export default function OversightPage() {
  const { user } = useSession();
  const [month, setMonth] = useState(getCairoDate().slice(0, 7));
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [selectedDelegate, setSelectedDelegate] = useState(null);
  const [delegateDetail, setDelegateDetail] = useState(null);
  const [delegateLoading, setDelegateLoading] = useState(false);
  const [delegateError, setDelegateError] = useState("");
  const [selectedDay, setSelectedDay] = useState(null);
  const role = normalizeRole(user?.role);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError("");
    getOversight(month).then((result) => { if (!cancelled) setData(result); }).catch((requestError) => { if (!cancelled) setError(requestError.response?.data?.message || "تعذر تحميل بيانات المتابعة."); });
    return () => { cancelled = true; };
  }, [month]);

  function openDelegate(delegate) {
    setSelectedDelegate(delegate);
    setSelectedDay(null);
    setDelegateDetail(null);
    setDelegateError("");
    setDelegateLoading(true);
    getDelegateDrilldown(delegate.delegateId, month).then(setDelegateDetail).catch((requestError) => setDelegateError(requestError.response?.data?.message || "تعذر تحميل تفاصيل المندوبة.")).finally(() => setDelegateLoading(false));
  }

  function closeDelegate() {
    setSelectedDay(null);
    setSelectedDelegate(null);
    setDelegateDetail(null);
    setDelegateError("");
  }

  const summary = data?.summary || {};
  const heading = role === "Management" ? "لوحة الإدارة" : "لوحة المشرف";
  const teamLabel = role === "Management" ? "إجمالي فرق المبيعات" : "فريق المندوبات";
  const cards = useMemo(() => [
    { title: "القطع المحققة", value: number(summary.actualPieces), hint: `الهدف ${number(summary.targetPieces)}`, color: "#0f766e", icon: <Inventory2OutlinedIcon /> },
    { title: "إنجاز القطع", value: percent(summary.actualPieces, summary.targetPieces), hint: "حسب هدف الشهر", color: "#2563eb", icon: <Inventory2OutlinedIcon /> },
    { title: "العملاء المحققون", value: number(summary.totalConsumers), hint: `الهدف ${number(summary.targetConsumers)}`, color: "#7c3aed", icon: <GroupsOutlinedIcon /> },
    { title: "إنجاز العملاء", value: percent(summary.totalConsumers, summary.targetConsumers), hint: "حسب هدف الشهر", color: "#d97706", icon: <GroupsOutlinedIcon /> },
    { title: "الفواتشر", value: number(summary.vouchers), hint: "إجمالي الشهر", color: "#a855f7", icon: <ReceiptLongOutlinedIcon /> },
    { title: "التقارير", value: number(summary.reports), hint: `${number(data?.scope?.delegates)} مندوبة`, color: "#334155", icon: <DescriptionOutlinedIcon /> },
  ], [data?.scope?.delegates, summary]);

  return <AppShell hideNavigation><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1.5} sx={{ mb: 2.25 }}><Stack direction="row" alignItems="center" spacing={1.15}><Box sx={{ width: 46, height: 46, display: "grid", placeItems: "center", borderRadius: 2.5, bgcolor: role === "Management" ? "#eef5ff" : "#e9f8f4", color: role === "Management" ? "#2563eb" : "#0f766e" }}>{role === "Management" ? <ManageAccountsRoundedIcon /> : <SupervisorAccountRoundedIcon />}</Box><Box><Typography variant="h5" fontWeight={900}>{heading}</Typography><Typography variant="body2" color="text.secondary">{user?.name || roleLabel(role)} · {teamLabel}</Typography></Box></Stack><TextField type="month" size="small" label="الشهر" value={month} onChange={(event) => setMonth(event.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: { xs: "100%", sm: 178 } }} /></Stack>{error && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}{!data && !error && <Box sx={{ minHeight: 300, display: "grid", placeItems: "center" }}><CircularProgress /></Box>}{data && <><Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))" }, gap: 1.2 }}>{cards.map((card) => <MetricCard key={card.title} {...card} />)}</Box>{role === "Management" && <Box sx={{ mt: 3 }}><Typography fontWeight={900} sx={{ mb: 1.1 }}>أداء فرق المشرفين</Typography><PerformanceTable rows={data.supervisors || []} type="supervisor" /></Box>}<Box sx={{ mt: 3 }}><Typography fontWeight={900} sx={{ mb: 1.1 }}>{role === "Management" ? "أداء جميع المندوبات" : "أداء فريق المندوبات"}</Typography><PerformanceTable rows={data.delegates || []} type="delegate" onSelect={openDelegate} /></Box><Box sx={{ mt: 3, mb: 2 }}><Stack direction="row" alignItems="center" spacing={.8} sx={{ mb: 1.1 }}><Divider flexItem sx={{ flex: 1 }} /><Typography fontWeight={900}>أداء الكاتيجوري</Typography><Divider flexItem sx={{ flex: 1 }} /></Stack><CategoryTable categories={data.categories || []} /></Box></>}<DelegateDetailDialog delegate={selectedDelegate} data={delegateDetail} loading={delegateLoading} error={delegateError} onClose={closeDelegate} onOpenDay={setSelectedDay} /><DayDetailDialog day={selectedDay} onClose={() => setSelectedDay(null)} /></AppShell>;
}
