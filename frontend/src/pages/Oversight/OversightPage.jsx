import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Card, CardContent, CircularProgress, Dialog, DialogContent, DialogTitle, Divider, IconButton, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";
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
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import AppShell from "../../components/layout/AppShell";
import { useSession } from "../../context/SessionContext";
import { getDelegateDrilldown, getOversight } from "../../services/oversight.service";
import { normalizeRole, roleLabel } from "../../utils/roles";
import { getCairoDate } from "../../utils/date";

const number = (value) => Number(value || 0).toLocaleString("ar-EG");
const money = (value) => `${number(value)} ج.م`;
const percent = (actual, target) => target ? `${number(Math.round((actual / target) * 100))}٪` : "—";
const ACTUAL = "#16825a";
const TARGET = "#8aa0b5";
const VALUE = "#0f766e";

function formatMonth(value) {
  const date = new Date(`${value}-01T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("ar-EG", { month: "long", year: "numeric" }).format(date);
}

function formatDay(value) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("ar-EG", { weekday: "long", day: "numeric", month: "long" }).format(date);
}

function MetricCard({ title, value, hint, color, icon }) {
  return <Card elevation={0} sx={{ position: "relative", overflow: "hidden", border: "1px solid #dfe7f1", borderRadius: 3, bgcolor: "#fff", boxShadow: "0 7px 18px rgba(25,43,76,.05)", "&::after": { content: '""', position: "absolute", insetBlock: 0, right: 0, width: 4, bgcolor: color } }}><CardContent sx={{ p: 1.6, "&:last-child": { pb: 1.6 } }}><Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}><Box minWidth={0}><Typography variant="caption" color="text.secondary" fontWeight={700}>{title}</Typography><Typography fontWeight={900} noWrap sx={{ fontSize: { xs: 19, sm: 23 }, color: "#132f58", mt: .25 }}>{value}</Typography><Typography variant="caption" color={color} fontWeight={800} noWrap>{hint}</Typography></Box><Box sx={{ width: 38, height: 38, flex: "0 0 auto", display: "grid", placeItems: "center", borderRadius: "50%", bgcolor: `${color}14`, color }}>{icon}</Box></Stack></CardContent></Card>;
}

function ChartCard({ title, subtitle, icon, children }) {
  return <Card elevation={0} sx={{ border: "1px solid #e0e8f2", borderRadius: 3, bgcolor: "#fff" }}><CardContent sx={{ p: { xs: 1.7, sm: 2.1 } }}><Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}><Box sx={{ width: 38, height: 38, display: "grid", placeItems: "center", borderRadius: 2, color: "#1f63bc", bgcolor: "#edf4ff" }}>{icon}</Box><Box minWidth={0}><Typography fontWeight={900}>{title}</Typography>{subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}</Box></Stack>{children}</CardContent></Card>;
}

function EmptyChart({ children }) {
  return <Box sx={{ minHeight: 230, display: "grid", placeItems: "center", textAlign: "center", px: 2 }}><Typography variant="body2" color="text.secondary">{children}</Typography></Box>;
}

function SalesValueChart({ rows, nameKey, title }) {
  const data = [...rows].filter((row) => Number(row.salesValue) > 0).sort((left, right) => Number(right.salesValue) - Number(left.salesValue)).slice(0, 12);
  if (!data.length) return <EmptyChart>لا توجد قيمة مبيعات مسجلة خلال الشهر المختار.</EmptyChart>;
  return <Box sx={{ height: Math.max(260, data.length * 38) }}><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }}><CartesianGrid horizontal={false} stroke="#e6edf3" strokeDasharray="3 3" /><XAxis type="number" tickFormatter={number} tickLine={false} axisLine={false} /><YAxis dataKey={nameKey} type="category" width={142} tickLine={false} axisLine={false} tick={{ fontSize: 12, fontWeight: 700 }} /><Tooltip formatter={(value) => money(value)} cursor={{ fill: "#f3faf8" }} /><Bar dataKey="salesValue" name="قيمة المبيعات" fill={VALUE} radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></Box>;
}

function TeamVolumeChart({ rows }) {
  const data = [...rows].filter((row) => Number(row.actualPieces) || Number(row.targetPieces)).sort((left, right) => Number(right.actualPieces) - Number(left.actualPieces)).slice(0, 12);
  if (!data.length) return <EmptyChart>لا توجد قطع أو أهداف مسجلة خلال الشهر المختار.</EmptyChart>;
  return <Box sx={{ height: Math.max(260, data.length * 38) }}><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }} barGap={5}><CartesianGrid horizontal={false} stroke="#e6edf3" strokeDasharray="3 3" /><XAxis type="number" tickFormatter={number} tickLine={false} axisLine={false} /><YAxis dataKey="delegateName" type="category" width={142} tickLine={false} axisLine={false} tick={{ fontSize: 12, fontWeight: 700 }} /><Tooltip formatter={(value) => number(value)} cursor={{ fill: "#f5f8fc" }} /><Legend iconType="circle" /><Bar dataKey="actualPieces" name="المحقق" fill={ACTUAL} radius={[0, 6, 6, 0]} /><Bar dataKey="targetPieces" name="الهدف" fill={TARGET} radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></Box>;
}

function DailySalesChart({ days }) {
  const data = days.map((day) => ({ ...day, label: String(day.date || "").slice(-2) }));
  if (!data.length) return <EmptyChart>لا توجد أيام تسجيل خلال الشهر المختار.</EmptyChart>;
  const width = Math.max(520, data.length * 72);
  return <Box sx={{ overflowX: "auto", pb: .5 }}><Box sx={{ width, height: 280 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 16, right: 12, left: -12, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e6edf3" strokeDasharray="3 3" /><XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "#cbd5df" }} /><YAxis tickFormatter={number} tickLine={false} axisLine={false} width={44} /><Tooltip labelFormatter={(label) => `يوم ${label}`} formatter={(value) => money(value)} cursor={{ fill: "#f3faf8" }} /><Bar dataKey="salesValue" name="قيمة المبيعات" fill={VALUE} radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></Box></Box>;
}

function PerformanceTable({ rows, type, onSelect }) {
  const columns = "minmax(150px, 1.35fr) 98px 98px 118px 74px 64px";
  return <Box sx={{ overflowX: "auto", border: "1px solid #e0e8f2", borderRadius: 2.5 }}><Box sx={{ minWidth: 650 }}><Box sx={{ display: "grid", gridTemplateColumns: columns, px: 1.3, py: 1, bgcolor: "#f5f8fc", gap: 1 }}><Typography variant="caption" fontWeight={800}>الاسم</Typography><Typography variant="caption" textAlign="center" fontWeight={800}>القطع</Typography><Typography variant="caption" textAlign="center" fontWeight={800}>العملاء</Typography><Typography variant="caption" textAlign="center" fontWeight={800}>قيمة المبيعات</Typography><Typography variant="caption" textAlign="center" fontWeight={800}>الإنجاز</Typography><Typography variant="caption" textAlign="center" fontWeight={800}>التقارير</Typography></Box>{rows.length ? rows.map((row) => { const name = type === "supervisor" ? row.supervisorName : row.delegateName; const teamCount = type === "supervisor" ? ` (${number(row.delegates)})` : ""; const clickable = Boolean(onSelect && type === "delegate"); return <Box key={row.supervisorId || row.delegateId} role={clickable ? "button" : undefined} tabIndex={clickable ? 0 : undefined} onClick={clickable ? () => onSelect(row) : undefined} onKeyDown={clickable ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(row); } } : undefined} sx={{ display: "grid", gridTemplateColumns: columns, px: 1.3, py: 1.15, gap: 1, borderTop: "1px solid #edf1f6", alignItems: "center", cursor: clickable ? "pointer" : "default", transition: "background-color .18s ease", "&:hover": clickable ? { bgcolor: "#f7fbff" } : undefined, "&:focus-visible": clickable ? { outline: "3px solid #2563eb55", outlineOffset: -3 } : undefined }}><Stack direction="row" alignItems="center" spacing={.35} minWidth={0}><Typography fontWeight={800} noWrap>{name || "غير محدد"}{teamCount}</Typography>{clickable && <ChevronLeftRoundedIcon sx={{ color: "#2563eb", fontSize: 19 }} />}</Stack><Typography textAlign="center" fontWeight={700}>{number(row.actualPieces)} / {number(row.targetPieces)}</Typography><Typography textAlign="center" fontWeight={700}>{number(row.totalConsumers)} / {number(row.targetConsumers)}</Typography><Typography textAlign="center" color={VALUE} fontWeight={900}>{money(row.salesValue)}</Typography><Typography textAlign="center" color="#0f766e" fontWeight={900}>{percent(row.actualPieces, row.targetPieces)}</Typography><Typography textAlign="center" color="text.secondary">{number(row.reports)}</Typography></Box>; }) : <Typography sx={{ p: 3, textAlign: "center" }} color="text.secondary">لا توجد بيانات لهذا الشهر.</Typography>}</Box></Box>;
}

function CategoryTable({ categories, detailed = false }) {
  const columns = "minmax(150px, 1fr) 92px 92px 112px 78px";
  return <Box sx={{ overflowX: "auto", border: "1px solid #e0e8f2", borderRadius: 2.5 }}><Box sx={{ minWidth: 580 }}><Box sx={{ display: "grid", gridTemplateColumns: columns, px: 1.3, py: 1, bgcolor: "#f5f8fc" }}><Typography variant="caption" fontWeight={800}>الكاتيجوري / المنتج</Typography><Typography variant="caption" textAlign="center" fontWeight={800}>المحقق</Typography><Typography variant="caption" textAlign="center" fontWeight={800}>الهدف</Typography><Typography variant="caption" textAlign="center" fontWeight={800}>قيمة المبيعات</Typography><Typography variant="caption" textAlign="center" fontWeight={800}>الإنجاز</Typography></Box>{categories.length ? categories.map((category) => <Box key={category.category}><Box sx={{ display: "grid", gridTemplateColumns: columns, px: 1.3, py: 1.1, borderTop: "1px solid #d7ebe7", bgcolor: "#eff9f7" }}><Typography fontWeight={900} color="#0f766e">{category.category}</Typography><Typography textAlign="center" color="#16825a" fontWeight={800}>{number(category.actualPieces)}</Typography><Typography textAlign="center">{number(category.targetPieces)}</Typography><Typography textAlign="center" color={VALUE} fontWeight={900}>{money(category.salesValue)}</Typography><Typography textAlign="center" color="#0f766e" fontWeight={900}>{percent(category.actualPieces, category.targetPieces)}</Typography></Box>{detailed && (category.products || []).map((product) => <Box key={product.productId} sx={{ display: "grid", gridTemplateColumns: columns, px: 1.3, py: 1.05, borderTop: "1px solid #edf1f6" }}><Typography fontWeight={700} sx={{ pr: 1.5, position: "relative", "&::before": { content: '""', position: "absolute", right: 0, top: "50%", width: 6, height: 6, borderRadius: "50%", bgcolor: "#94a3b8", transform: "translateY(-50%)" } }}>{product.productName}</Typography><Typography textAlign="center" color="#16825a" fontWeight={700}>{number(product.actualPieces)}</Typography><Typography textAlign="center">{number(product.targetPieces)}</Typography><Typography textAlign="center" color={VALUE} fontWeight={900}>{money(product.salesValue)}</Typography><Typography textAlign="center" color="#2563eb" fontWeight={900}>{percent(product.actualPieces, product.targetPieces)}</Typography></Box>)}</Box>) : <Typography sx={{ p: 3, textAlign: "center" }} color="text.secondary">لا توجد أهداف أو منتجات لهذا الشهر.</Typography>}</Box></Box>;
}

function SummaryStrip({ summary }) {
  const item = (label, value, accent) => <Box key={label} sx={{ minWidth: 0, px: 1.15, py: .65, borderInlineStart: "1px solid #e4ebf3", "&:first-of-type": { borderInlineStart: "none" } }}><Typography variant="caption" color="text.secondary" display="block">{label}</Typography><Typography fontWeight={900} color={accent} noWrap>{value}</Typography></Box>;
  return <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(4, minmax(0, 1fr))" }, border: "1px solid #e0e9f0", borderRadius: 2.5, overflow: "hidden", bgcolor: "#fbfefe" }}>{item("القطع", `${number(summary.actualPieces)} / ${number(summary.targetPieces)}`, "#0f766e")}{item("إنجاز القطع", percent(summary.actualPieces, summary.targetPieces), "#0f766e")}{item("العملاء", `${number(summary.totalConsumers)} / ${number(summary.targetConsumers)}`, "#7c3aed")}{item("قيمة المبيعات", money(summary.salesValue), VALUE)}{item("الفواتشر", number(summary.vouchers), "#d97706")}{item("التقارير", number(summary.reports), "#2563eb")}</Box>;
}

function DayCard({ day, onOpen }) {
  return <Card role="button" tabIndex={0} elevation={0} onClick={() => onOpen(day)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen(day); } }} sx={{ cursor: "pointer", overflow: "hidden", border: "1px solid #dce8f0", borderRadius: 3, bgcolor: "#fff", transition: "transform .18s ease, box-shadow .18s ease", "&:hover": { transform: "translateY(-2px)", boxShadow: "0 11px 22px rgba(32,84,116,.12)" }, "&:focus-visible": { outline: "3px solid #2563eb55", outlineOffset: 2 } }}><CardContent sx={{ p: 1.45, "&:last-child": { pb: 1.45 } }}><Stack direction="row" alignItems="center" spacing={.8} sx={{ mb: 1 }}><Box sx={{ width: 32, height: 32, display: "grid", placeItems: "center", borderRadius: "50%", bgcolor: "#eef5ff", color: "#2563eb" }}><CalendarMonthRoundedIcon fontSize="small" /></Box><Typography fontWeight={900} fontSize={14} noWrap>{formatDay(day.date)}</Typography></Stack><Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", rowGap: .75, textAlign: "center" }}><Box><Typography variant="caption" color="text.secondary">قطع</Typography><Typography fontWeight={900}>{number(day.actualPieces)}</Typography></Box><Box sx={{ borderInlineStart: "1px solid #e5edf4" }}><Typography variant="caption" color="text.secondary">عملاء</Typography><Typography fontWeight={900}>{number(day.totalConsumers)}</Typography></Box><Box sx={{ borderTop: "1px solid #e5edf4", pt: .55 }}><Typography variant="caption" color="text.secondary">قيمة البيع</Typography><Typography fontWeight={900} color={VALUE}>{money(day.salesValue)}</Typography></Box><Box sx={{ borderInlineStart: "1px solid #e5edf4", borderTop: "1px solid #e5edf4", pt: .55 }}><Typography variant="caption" color="text.secondary">الإنجاز</Typography><Typography fontWeight={900} color="#0f766e">{percent(day.actualPieces, day.targetPieces)}</Typography></Box></Box></CardContent></Card>;
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

function TeamAnalysisDashboard({ data, month, onSelectDelegate }) {
  const summary = data.summary || {};
  const delegates = data.delegates || [];
  const supervisors = data.supervisors || [];
  const activeDelegates = delegates.filter((delegate) => Number(delegate.reports) > 0);
  const topDelegate = [...delegates].sort((left, right) => Number(right.salesValue) - Number(left.salesValue))[0];
  const topSupervisor = [...supervisors].sort((left, right) => Number(right.salesValue) - Number(left.salesValue))[0];
  const averagePerReport = Number(summary.reports) ? Number(summary.salesValue) / Number(summary.reports) : 0;

  return <Stack spacing={2}><Card elevation={0} sx={{ overflow: "hidden", borderRadius: 3.5, color: "#fff", background: "linear-gradient(120deg, #0f766e 0%, #0b9488 56%, #1574c4 100%)", boxShadow: "0 12px 28px rgba(13,116,111,.2)" }}><CardContent sx={{ p: { xs: 2, sm: 2.5 } }}><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1.25}><Box><Typography variant="h6" fontWeight={900}>تحليل الفريق</Typography><Typography variant="body2" sx={{ opacity: .86 }}>تحليل شامل للمندوبات والمشرفين لشهر {formatMonth(month)}</Typography></Box><Box sx={{ px: 1.4, py: .85, borderRadius: 2, bgcolor: "rgba(255,255,255,.14)" }}><Typography variant="caption" sx={{ opacity: .8 }}>المصدر</Typography><Typography fontWeight={800}>Reports × UnitPrice</Typography></Box></Stack></CardContent></Card>
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" }, gap: 1.2 }}><MetricCard title="قيمة مبيعات الفريق" value={money(summary.salesValue)} hint="إجمالي الشهر" color={VALUE} icon={<PaidRoundedIcon />} /><MetricCard title="مندوبات نشطات" value={number(activeDelegates.length)} hint={`من ${number(delegates.length)} مندوبة`} color="#2563eb" icon={<GroupsOutlinedIcon />} /><MetricCard title="متوسط التقرير" value={money(averagePerReport)} hint="قيمة مبيعات لكل تقرير" color="#7c3aed" icon={<DescriptionOutlinedIcon />} /><MetricCard title="أفضل مندوبة" value={topDelegate?.delegateName || "—"} hint={topDelegate ? money(topDelegate.salesValue) : "لا توجد مبيعات"} color="#d97706" icon={<WorkspacePremiumRoundedIcon />} /></Box>
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) minmax(0, 1fr)" }, gap: 1.5 }}><ChartCard title="قيمة المبيعات حسب المشرف" subtitle={topSupervisor ? `الأعلى: ${topSupervisor.supervisorName || "غير محدد"}` : ""} icon={<SupervisorAccountRoundedIcon />}><SalesValueChart rows={supervisors} nameKey="supervisorName" /></ChartCard><ChartCard title="اتجاه قيمة المبيعات اليومي" subtitle="يتغير حسب أيام تسجيل الفريق" icon={<TrendingUpRoundedIcon />}><DailySalesChart days={data.teamDays || []} /></ChartCard></Box>
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) minmax(0, 1fr)" }, gap: 1.5 }}><ChartCard title="أفضل المندوبات بالقيمة" subtitle="أعلى 12 مندوبة حسب قيمة المبيعات" icon={<PaidRoundedIcon />}><SalesValueChart rows={delegates} nameKey="delegateName" /></ChartCard><ChartCard title="القطع المحققة مقابل الهدف" subtitle="أفضل 12 مندوبة حسب المحقق" icon={<Inventory2OutlinedIcon />}><TeamVolumeChart rows={delegates} /></ChartCard></Box>
    <Box><Typography fontWeight={900} sx={{ mb: 1.1 }}>تفاصيل المشرفين</Typography><PerformanceTable rows={supervisors} type="supervisor" /></Box>
    <Box><Typography fontWeight={900} sx={{ mb: 1.1 }}>ترتيب المندوبات وتفاصيل الأداء</Typography><PerformanceTable rows={delegates} type="delegate" onSelect={onSelectDelegate} /></Box>
    <Box><Typography fontWeight={900} sx={{ mb: 1.1 }}>تحليل الكاتيجوري والمنتجات</Typography><CategoryTable categories={data.categories || []} detailed /></Box>
  </Stack>;
}

export default function OversightPage() {
  const { user } = useSession();
  const [month, setMonth] = useState(getCairoDate().slice(0, 7));
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [view, setView] = useState("overview");
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
    { title: "قيمة المبيعات", value: money(summary.salesValue), hint: "إجمالي الشهر", color: VALUE, icon: <PaidRoundedIcon /> },
    { title: "القطع المحققة", value: number(summary.actualPieces), hint: `الهدف ${number(summary.targetPieces)}`, color: "#0f766e", icon: <Inventory2OutlinedIcon /> },
    { title: "إنجاز القطع", value: percent(summary.actualPieces, summary.targetPieces), hint: "حسب هدف الشهر", color: "#2563eb", icon: <Inventory2OutlinedIcon /> },
    { title: "العملاء المحققون", value: number(summary.totalConsumers), hint: `الهدف ${number(summary.targetConsumers)}`, color: "#7c3aed", icon: <GroupsOutlinedIcon /> },
    { title: "إنجاز العملاء", value: percent(summary.totalConsumers, summary.targetConsumers), hint: "حسب هدف الشهر", color: "#d97706", icon: <GroupsOutlinedIcon /> },
    { title: "الفواتشر", value: number(summary.vouchers), hint: "إجمالي الشهر", color: "#a855f7", icon: <ReceiptLongOutlinedIcon /> },
    { title: "التقارير", value: number(summary.reports), hint: `${number(data?.scope?.delegates)} مندوبة`, color: "#334155", icon: <DescriptionOutlinedIcon /> },
  ], [data?.scope?.delegates, summary]);

  const overview = data && <><Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" }, gap: 1.2 }}>{cards.map((card) => <MetricCard key={card.title} {...card} />)}</Box>{role === "Management" && <Box sx={{ mt: 3 }}><Typography fontWeight={900} sx={{ mb: 1.1 }}>أداء فرق المشرفين</Typography><PerformanceTable rows={data.supervisors || []} type="supervisor" /></Box>}<Box sx={{ mt: 3 }}><Typography fontWeight={900} sx={{ mb: 1.1 }}>{role === "Management" ? "أداء جميع المندوبات" : "أداء فريق المندوبات"}</Typography><PerformanceTable rows={data.delegates || []} type="delegate" onSelect={openDelegate} /></Box><Box sx={{ mt: 3, mb: 2 }}><Stack direction="row" alignItems="center" spacing={.8} sx={{ mb: 1.1 }}><Divider flexItem sx={{ flex: 1 }} /><Typography fontWeight={900}>أداء الكاتيجوري</Typography><Divider flexItem sx={{ flex: 1 }} /></Stack><CategoryTable categories={data.categories || []} /></Box></>;

  return <AppShell hideNavigation><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1.5} sx={{ mb: 2.25 }}><Stack direction="row" alignItems="center" spacing={1.15}><Box sx={{ width: 46, height: 46, display: "grid", placeItems: "center", borderRadius: 2.5, bgcolor: role === "Management" ? "#eef5ff" : "#e9f8f4", color: role === "Management" ? "#2563eb" : "#0f766e" }}>{role === "Management" ? <ManageAccountsRoundedIcon /> : <SupervisorAccountRoundedIcon />}</Box><Box><Typography variant="h5" fontWeight={900}>{heading}</Typography><Typography variant="body2" color="text.secondary">{user?.name || roleLabel(role)} · {teamLabel}</Typography></Box></Stack><TextField type="month" size="small" label="الشهر" value={month} onChange={(event) => setMonth(event.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: { xs: "100%", sm: 178 } }} /></Stack>{role === "Management" && <Box sx={{ borderBottom: "1px solid #dfe7f1", mb: 2.25 }}><Tabs value={view} onChange={(_, nextView) => setView(nextView)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile sx={{ minHeight: 46, "& .MuiTab-root": { minHeight: 46, fontWeight: 900, px: 2 } }}><Tab value="overview" label="نظرة الإدارة" icon={<ManageAccountsRoundedIcon fontSize="small" />} iconPosition="start" /><Tab value="team-analysis" label="تحليل الفريق" icon={<InsightsRoundedIcon fontSize="small" />} iconPosition="start" /></Tabs></Box>}{error && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}{!data && !error && <Box sx={{ minHeight: 300, display: "grid", placeItems: "center" }}><CircularProgress /></Box>}{data && (role === "Management" && view === "team-analysis" ? <TeamAnalysisDashboard data={data} month={month} onSelectDelegate={openDelegate} /> : overview)}<DelegateDetailDialog delegate={selectedDelegate} data={delegateDetail} loading={delegateLoading} error={delegateError} onClose={closeDelegate} onOpenDay={setSelectedDay} /><DayDetailDialog day={selectedDay} onClose={() => setSelectedDay(null)} /></AppShell>;
}
