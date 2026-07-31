import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Card, CardContent, Chip, CircularProgress, LinearProgress, MenuItem, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import TodayRoundedIcon from "@mui/icons-material/TodayRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import AppShell from "../../components/layout/AppShell";
import { getDashboard } from "../../services/dashboard.service";
import { getCairoDate } from "../../utils/date";

const ACTUAL = "#c9252d";
const TARGET = "#97a3b2";
const CATEGORY_COLORS = ["#1f7ae0", "#1c9c6b", "#dd7a24", "#8b5cf6", "#cf4c74", "#138b9b"];
const number = (value) => Number(value || 0).toLocaleString("ar-EG");
const percentage = (actual, target) => target ? Math.round((actual / target) * 100) : null;

function formatMonth(value) {
  const date = new Date(`${value}-01T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("ar-EG", { month: "long", year: "numeric" }).format(date);
}

function ChartCard({ title, subtitle, icon, children }) {
  return <Card elevation={0} sx={{ border: "1px solid #e2e8f2", borderRadius: 2.5, bgcolor: "#fff", overflow: "hidden" }}><CardContent sx={{ p: { xs: 2, sm: 2.5 } }}><Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}><Box sx={{ width: 38, height: 38, display: "grid", placeItems: "center", borderRadius: 2, color: "#1f63bc", bgcolor: "#edf4ff" }}>{icon}</Box><Box><Typography fontWeight={900}>{title}</Typography>{subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}</Box></Stack>{children}</CardContent></Card>;
}

function MetricCard({ title, value, actual, target, color, icon }) {
  const progress = percentage(actual, target);
  const hasTarget = Number(target) > 0;
  return <Card elevation={0} sx={{ border: "1px solid #e2e8f2", borderRadius: 2.5, bgcolor: "#fff" }}><CardContent sx={{ p: 1.8, "&:last-child": { pb: 1.8 } }}><Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="caption" color="text.secondary" fontWeight={800}>{title}</Typography><Box sx={{ color, display: "grid", placeItems: "center" }}>{icon}</Box></Stack><Typography fontSize={25} lineHeight={1.25} fontWeight={900} color={color} sx={{ mt: 1 }}>{value}</Typography>{target !== undefined && <><Stack direction="row" justifyContent="space-between" sx={{ mt: 1.1 }}><Typography variant="caption" color="text.secondary">المحقق {number(actual)}</Typography><Typography variant="caption" color="text.secondary">الهدف {hasTarget ? number(target) : "—"}</Typography></Stack>{hasTarget ? <><LinearProgress variant="determinate" value={Math.min(progress, 100)} sx={{ mt: .75, height: 5, borderRadius: 8, bgcolor: "#eaf0f6", "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 8 } }} /><Typography variant="caption" color={color} fontWeight={900} sx={{ display: "block", mt: .45 }}>{number(progress)}٪ إنجاز</Typography></> : <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: .8 }}>لا يوجد هدف مسجل للشهر</Typography>}</>}</CardContent></Card>;
}

function EmptyState({ children }) {
  return <Box sx={{ minHeight: 260, display: "grid", placeItems: "center", textAlign: "center", color: "text.secondary", px: 2 }}><Typography variant="body2">{children}</Typography></Box>;
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const first = payload[0]?.payload;
  return <Box sx={{ minWidth: 150, bgcolor: "#fff", border: "1px solid #dce5ef", boxShadow: "0 10px 24px rgba(31,48,78,.14)", borderRadius: 2, px: 1.4, py: 1.1 }}><Typography variant="caption" fontWeight={900}>{label || first?.productName || first?.category}</Typography>{payload.map((entry) => <Typography key={entry.dataKey} variant="caption" display="block" sx={{ color: entry.color, fontWeight: 800, mt: .35 }}>{entry.name}: {number(entry.value)}</Typography>)}{first?.target > 0 && <Typography variant="caption" display="block" sx={{ color: "#7c2a2e", fontWeight: 900, mt: .55 }}>الإنجاز: {number(percentage(first.actual, first.target))}٪</Typography>}</Box>;
}

function DailyComparisonChart({ data, labelKey = "label" }) {
  if (!data.length) return <EmptyState>لا توجد بيانات مسجلة للفترة المختارة.</EmptyState>;
  const width = Math.max(560, data.length * 88);
  return <Box sx={{ overflowX: "auto", pb: .5 }}><Box sx={{ width, height: 318 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 18, right: 12, left: -14, bottom: 2 }} barGap={8} barCategoryGap="28%"><CartesianGrid vertical={false} stroke="#e5ebf2" strokeDasharray="3 3" /><XAxis dataKey={labelKey} tickFormatter={number} tickLine={false} axisLine={{ stroke: "#cbd5df" }} /><YAxis tickFormatter={number} tickLine={false} axisLine={false} width={44} allowDecimals={false} /><Tooltip content={<ChartTooltip />} cursor={{ fill: "#f5f8fc" }} /><Legend iconType="circle" wrapperStyle={{ paddingTop: 10 }} /><Bar dataKey="actual" name="المحقق" fill={ACTUAL} radius={[5, 5, 0, 0]} barSize={26} /><Bar dataKey="target" name="الهدف" fill={TARGET} radius={[5, 5, 0, 0]} barSize={26} /></BarChart></ResponsiveContainer></Box></Box>;
}

function CategoryMixChart({ data }) {
  const visibleData = data.filter((item) => item.actual > 0);
  if (!visibleData.length) return <EmptyState>لا توجد بيانات كاتيجوري للفترة المختارة.</EmptyState>;
  return <Box sx={{ height: 300 }}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={visibleData} dataKey="actual" nameKey="category" innerRadius={62} outerRadius={98} paddingAngle={3}>{visibleData.map((item, index) => <Cell key={item.category} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />)}</Pie><Tooltip formatter={(value) => number(value)} /><Legend verticalAlign="bottom" iconType="circle" formatter={(value) => <span style={{ color: "#42526a", fontSize: 12 }}>{value}</span>} /></PieChart></ResponsiveContainer></Box>;
}

function ProductRankingChart({ products }) {
  const rows = [...products].sort((left, right) => right.actual - left.actual).slice(0, 7);
  if (!rows.length) return <EmptyState>لا توجد منتجات مسجلة للفترة المختارة.</EmptyState>;
  return <Box sx={{ height: Math.max(270, rows.length * 52) }}><ResponsiveContainer width="100%" height="100%"><BarChart data={rows} layout="vertical" margin={{ top: 4, right: 14, left: 10, bottom: 4 }} barGap={6}><CartesianGrid horizontal={false} stroke="#e5ebf2" strokeDasharray="3 3" /><XAxis type="number" tickFormatter={number} tickLine={false} axisLine={false} /><YAxis dataKey="productName" type="category" width={142} tickLine={false} axisLine={false} tick={{ fontSize: 12, fontWeight: 700 }} /><Tooltip content={<ChartTooltip />} /><Legend iconType="circle" /><Bar dataKey="actual" name="المحقق" fill={ACTUAL} radius={[0, 5, 5, 0]} /><Bar dataKey="target" name="الهدف" fill={TARGET} radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer></Box>;
}

function CategoryComparisonChart({ categories }) {
  if (!categories.length) return <EmptyState>لا توجد كاتيجوري مسجلة للفترة المختارة.</EmptyState>;
  const width = Math.max(540, categories.length * 100);
  return <Box sx={{ overflowX: "auto", pb: .5 }}><Box sx={{ width, height: 310 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={categories} margin={{ top: 20, right: 12, left: -14, bottom: 2 }} barGap={8} barCategoryGap="24%"><CartesianGrid vertical={false} stroke="#e5ebf2" strokeDasharray="3 3" /><XAxis dataKey="category" tickLine={false} axisLine={{ stroke: "#cbd5df" }} tick={{ fontSize: 12, fontWeight: 700 }} /><YAxis tickFormatter={number} tickLine={false} axisLine={false} width={44} allowDecimals={false} /><Tooltip content={<ChartTooltip />} cursor={{ fill: "#f5f8fc" }} /><Legend iconType="circle" wrapperStyle={{ paddingTop: 10 }} /><Bar dataKey="actual" name="المحقق" fill={ACTUAL} radius={[5, 5, 0, 0]} /><Bar dataKey="target" name="الهدف" fill={TARGET} radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></Box></Box>;
}

function PerformanceTable({ products }) {
  if (!products.length) return <EmptyState>لا توجد منتجات مطابقة للاختيار.</EmptyState>;
  return <Box sx={{ overflowX: "auto", borderTop: "1px solid #e5ebf2", borderBottom: "1px solid #e5ebf2" }}><Box sx={{ minWidth: 560 }}><Box sx={{ display: "grid", gridTemplateColumns: "minmax(200px, 1fr) 112px 92px 92px 78px", px: 1.25, py: 1, bgcolor: "#f6f8fc" }}><Typography variant="caption" fontWeight={900}>المنتج</Typography><Typography variant="caption" fontWeight={900}>الكاتيجوري</Typography><Typography variant="caption" textAlign="center" fontWeight={900}>المحقق</Typography><Typography variant="caption" textAlign="center" fontWeight={900}>الهدف</Typography><Typography variant="caption" textAlign="center" fontWeight={900}>الإنجاز</Typography></Box>{products.map((product) => { const achievement = percentage(product.actual, product.target); return <Box key={product.productId} sx={{ display: "grid", gridTemplateColumns: "minmax(200px, 1fr) 112px 92px 92px 78px", px: 1.25, py: 1.15, alignItems: "center", borderTop: "1px solid #edf1f6" }}><Typography fontWeight={800} noWrap>{product.productName}</Typography><Typography variant="body2" color="text.secondary" noWrap>{product.category}</Typography><Typography textAlign="center" color={ACTUAL} fontWeight={800}>{number(product.actual)}</Typography><Typography textAlign="center" color="text.secondary">{product.target ? number(product.target) : "—"}</Typography><Typography textAlign="center" color="#1c7b59" fontWeight={900}>{achievement === null ? "—" : `${number(achievement)}٪`}</Typography></Box>; })}</Box></Box>;
}

function ShortageRankingChart({ products }) {
  const rows = [...products].sort((left, right) => right.total - left.total).slice(0, 7);
  if (!rows.length) return <EmptyState>لا توجد نواقص منتجات مسجلة للفترة المختارة.</EmptyState>;
  return <Box sx={{ height: Math.max(270, rows.length * 52) }}><ResponsiveContainer width="100%" height="100%"><BarChart data={rows} layout="vertical" margin={{ top: 4, right: 14, left: 10, bottom: 4 }}><CartesianGrid horizontal={false} stroke="#e5ebf2" strokeDasharray="3 3" /><XAxis type="number" tickFormatter={number} tickLine={false} axisLine={false} allowDecimals={false} /><YAxis dataKey="productName" type="category" width={142} tickLine={false} axisLine={false} tick={{ fontSize: 12, fontWeight: 700 }} /><Tooltip content={<ChartTooltip />} /><Legend iconType="circle" /><Bar dataKey="total" name="حالات النقص" fill="#d97706" radius={[0, 5, 5, 0]} /><Bar dataKey="open" name="مفتوح" fill="#ef4444" radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer></Box>;
}

function ShortageTrendChart({ days }) {
  if (!days.length) return <EmptyState>لا توجد نواقص مسجلة للفترة المختارة.</EmptyState>;
  const width = Math.max(560, days.length * 78);
  return <Box sx={{ overflowX: "auto", pb: .5 }}><Box sx={{ width, height: 318 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={days} margin={{ top: 18, right: 12, left: -14, bottom: 2 }} barGap={8} barCategoryGap="28%"><CartesianGrid vertical={false} stroke="#e5ebf2" strokeDasharray="3 3" /><XAxis dataKey="label" tickFormatter={number} tickLine={false} axisLine={{ stroke: "#cbd5df" }} /><YAxis tickFormatter={number} tickLine={false} axisLine={false} width={44} allowDecimals={false} /><Tooltip content={<ChartTooltip />} cursor={{ fill: "#f5f8fc" }} /><Legend iconType="circle" wrapperStyle={{ paddingTop: 10 }} /><Bar dataKey="total" name="النواقص" fill="#d97706" radius={[5, 5, 0, 0]} barSize={26} /><Bar dataKey="resolved" name="تم الحل" fill="#16825a" radius={[5, 5, 0, 0]} barSize={26} /></BarChart></ResponsiveContainer></Box></Box>;
}

function ShortageDetailsTable({ details }) {
  const typeLabels = { OutOfStock: "غير موجود", LowStock: "كمية غير كافية", NotDisplayed: "غير معروض" };
  if (!details.length) return <EmptyState>لم تُسجل نواقص في هذا الشهر بعد.</EmptyState>;
  return <Box sx={{ overflowX: "auto", borderTop: "1px solid #e5ebf2", borderBottom: "1px solid #e5ebf2" }}><Box sx={{ minWidth: 720 }}><Box sx={{ display: "grid", gridTemplateColumns: "110px minmax(180px, 1fr) minmax(150px, 1fr) 135px 105px 90px", px: 1.25, py: 1, bgcolor: "#f6f8fc" }}><Typography variant="caption" fontWeight={900}>التاريخ</Typography><Typography variant="caption" fontWeight={900}>المنتج</Typography><Typography variant="caption" fontWeight={900}>الفرع</Typography><Typography variant="caption" fontWeight={900}>الحالة</Typography><Typography variant="caption" textAlign="center" fontWeight={900}>طلب متوقع</Typography><Typography variant="caption" textAlign="center" fontWeight={900}>المتابعة</Typography></Box>{details.map((row) => <Box key={row.ShortageID} sx={{ display: "grid", gridTemplateColumns: "110px minmax(180px, 1fr) minmax(150px, 1fr) 135px 105px 90px", px: 1.25, py: 1.15, alignItems: "center", borderTop: "1px solid #edf1f6" }}><Typography variant="body2">{row.Date || "—"}</Typography><Box><Typography fontWeight={800} noWrap>{row.ProductName || row.ProductID}</Typography>{row.Category && <Typography variant="caption" color="text.secondary" noWrap>{row.Category}</Typography>}</Box><Typography variant="body2" noWrap>{row.BranchName || row.BranchID || "—"}</Typography><Typography variant="body2">{typeLabels[row.ShortageType] || row.ShortageType}</Typography><Typography textAlign="center">{row.EstimatedDemand ? number(row.EstimatedDemand) : "—"}</Typography><Chip size="small" label={row.Status === "Resolved" ? "تم الحل" : "مفتوح"} color={row.Status === "Resolved" ? "success" : "warning"} variant="outlined" sx={{ justifySelf: "center" }} /></Box>)}</Box></Box>;
}

export default function ChartsPage() {
  const [month, setMonth] = useState(getCairoDate().slice(0, 7));
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");
  const [category, setCategory] = useState("all");
  const [product, setProduct] = useState("all");

  useEffect(() => {
    let cancelled = false;
    setDashboard(null);
    setError("");
    getDashboard(month).then((data) => { if (!cancelled) setDashboard(data); }).catch((requestError) => { if (!cancelled) setError(requestError.response?.data?.message || "تعذر تحميل بيانات الداشبورد."); });
    return () => { cancelled = true; };
  }, [month]);

  const charts = dashboard?.charts || {};
  const overview = charts.overview || {};
  const customerDays = charts.customerDays || [];
  const products = charts.products || [];
  const productDays = charts.productDays || [];
  const shortages = charts.shortages || {};
  const categories = useMemo(() => [...new Set(products.map((item) => item.category))], [products]);
  const selectedProducts = useMemo(() => products.filter((item) => category === "all" || item.category === category), [category, products]);
  const productOptions = useMemo(() => selectedProducts, [selectedProducts]);
  const dailyProductData = useMemo(() => Object.values(productDays.filter((item) => {
    if (category !== "all" && item.category !== category) return false;
    return product === "all" || item.productId === product;
  }).reduce((days, item) => {
    const current = days[item.date] || { date: item.date, label: item.label, actual: 0, target: 0 };
    current.actual += item.actual;
    current.target += item.target;
    days[item.date] = current;
    return days;
  }, {})).sort((left, right) => left.date.localeCompare(right.date)), [category, product, productDays]);
  const sentiment = useMemo(() => [
    { category: "إيجابيون", actual: overview.positiveConsumers || 0, target: 0 },
    { category: "سلبيون", actual: overview.negativeConsumers || 0, target: 0 },
  ], [overview.negativeConsumers, overview.positiveConsumers]);

  return <AppShell hideHeader><Stack spacing={2.2}><Stack direction={{ xs: "column", md: "row" }} alignItems={{ md: "center" }} justifyContent="space-between" spacing={1.4}><Box><Typography variant="h5" fontWeight={900}>تحليل الأداء</Typography><Typography variant="body2" color="text.secondary">ملخص تحليلي لشهر {formatMonth(month)}</Typography></Box><TextField size="small" type="month" label="الشهر" value={month} onChange={(event) => setMonth(event.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: { xs: "100%", sm: 185 } }} /></Stack>
    {error && <Alert severity="warning">{error}</Alert>}
    {!dashboard && !error && <Box sx={{ minHeight: 420, display: "grid", placeItems: "center" }}><CircularProgress /></Box>}
    {dashboard && <><Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))", lg: "repeat(5, minmax(0, 1fr))" }, gap: 1.25 }}><MetricCard title="إنجاز القطع" value={overview.targetPieces ? `${number(percentage(overview.actualPieces, overview.targetPieces))}٪` : "—"} actual={overview.actualPieces} target={overview.targetPieces} color="#1d66c9" icon={<Inventory2OutlinedIcon fontSize="small" />} /><MetricCard title="إنجاز العملاء" value={overview.targetConsumers ? `${number(percentage(overview.totalConsumers, overview.targetConsumers))}٪` : "—"} actual={overview.totalConsumers} target={overview.targetConsumers} color="#16825a" icon={<GroupsOutlinedIcon fontSize="small" />} /><MetricCard title="التقارير" value={number(overview.reports)} color="#7646c9" icon={<AssessmentRoundedIcon fontSize="small" />} /><MetricCard title="أيام النشاط" value={number(overview.activeDays)} color="#d27a24" icon={<TodayRoundedIcon fontSize="small" />} /><MetricCard title="الفواتشر" value={number(overview.vouchers)} color="#bf394c" icon={<ReceiptLongOutlinedIcon fontSize="small" />} /></Box>
      <Box sx={{ borderBottom: "1px solid #dfe7f1" }}><Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile sx={{ minHeight: 46, "& .MuiTab-root": { minHeight: 46, fontWeight: 800, px: 2 } }}><Tab value="overview" label="نظرة عامة" /><Tab value="customers" label="العملاء" /><Tab value="products" label="المنتجات والكاتيجوري" /><Tab value="shortages" label="نواقص المنتجات" /></Tabs></Box>
      {tab === "overview" && <Stack spacing={1.5}><Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.5fr) minmax(300px, .9fr)" }, gap: 1.5 }}><ChartCard title="اتجاه العملاء اليومي" subtitle="المحقق والهدف يومًا بيوم" icon={<TrendingUpRoundedIcon />}><DailyComparisonChart data={customerDays} /></ChartCard><ChartCard title="توزيع القطع حسب الكاتيجوري" subtitle="حصة المحقق خلال الشهر" icon={<CategoryRoundedIcon />}><CategoryMixChart data={overview.categories || []} /></ChartCard></Box><Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.05fr) minmax(0, 1.35fr)" }, gap: 1.5 }}><ChartCard title="أفضل المنتجات" subtitle="أعلى المنتجات حسب المحقق" icon={<Inventory2OutlinedIcon />}><ProductRankingChart products={products} /></ChartCard><ChartCard title="مقارنة أداء الكاتيجوري" subtitle="الهدف مقابل المحقق" icon={<CategoryRoundedIcon />}><CategoryComparisonChart categories={overview.categories || []} /></ChartCard></Box></Stack>}
      {tab === "customers" && <Stack spacing={1.5}><Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" }, gap: 1.25 }}><MetricCard title="إجمالي العملاء" value={number(overview.totalConsumers)} color="#16825a" icon={<GroupsOutlinedIcon fontSize="small" />} /><MetricCard title="الهدف الشهري" value={number(overview.targetConsumers)} color="#697789" icon={<TrendingUpRoundedIcon fontSize="small" />} /><MetricCard title="إيجابيون" value={number(overview.positiveConsumers)} color="#16825a" icon={<TrendingUpRoundedIcon fontSize="small" />} /><MetricCard title="سلبيون" value={number(overview.negativeConsumers)} color="#bf394c" icon={<GroupsOutlinedIcon fontSize="small" />} /></Box><Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.55fr) minmax(300px, .8fr)" }, gap: 1.5 }}><ChartCard title="مقارنة العملاء حسب الأيام" subtitle="المحقق والهدف" icon={<GroupsOutlinedIcon />}><DailyComparisonChart data={customerDays} /></ChartCard><ChartCard title="نوعية العملاء" subtitle="إيجابيون مقابل سلبيون" icon={<GroupsOutlinedIcon />}><CategoryMixChart data={sentiment} /></ChartCard></Box></Stack>}
      {tab === "products" && <Stack spacing={1.5}><Card elevation={0} sx={{ border: "1px solid #e2e8f2", borderRadius: 2.5 }}><CardContent sx={{ p: { xs: 1.5, sm: 2 } }}><Stack direction={{ xs: "column", md: "row" }} spacing={1.25}><TextField select size="small" label="الكاتيجوري" value={category} onChange={(event) => { setCategory(event.target.value); setProduct("all"); }} sx={{ minWidth: { md: 200 } }}><MenuItem value="all">كل الكاتيجوري</MenuItem>{categories.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField><TextField select size="small" label="المنتج" value={product} onChange={(event) => setProduct(event.target.value)} sx={{ minWidth: { md: 260 } }}><MenuItem value="all">كل المنتجات</MenuItem>{productOptions.map((item) => <MenuItem key={item.productId} value={item.productId}>{item.productName}</MenuItem>)}</TextField>{category !== "all" && <Chip label={category} color="primary" variant="outlined" onDelete={() => { setCategory("all"); setProduct("all"); }} sx={{ alignSelf: { md: "center" } }} />}</Stack></CardContent></Card><Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.35fr) minmax(340px, .9fr)" }, gap: 1.5 }}><ChartCard title="اتجاه أداء المنتجات" subtitle={product === "all" ? "إجمالي المنتجات المختارة يومًا بيوم" : "أداء المنتج المختار يومًا بيوم"} icon={<TrendingUpRoundedIcon />}><DailyComparisonChart data={dailyProductData} /></ChartCard><ChartCard title="أداء الكاتيجوري" subtitle="الهدف مقابل المحقق" icon={<CategoryRoundedIcon />}><CategoryComparisonChart categories={category === "all" ? (overview.categories || []) : (overview.categories || []).filter((item) => item.category === category)} /></ChartCard></Box><ChartCard title="تفاصيل المنتجات" subtitle="المحقق والهدف ونسبة الإنجاز" icon={<Inventory2OutlinedIcon />}><PerformanceTable products={selectedProducts} /></ChartCard></Stack>}</>}
    {dashboard && tab === "shortages" && <Stack spacing={1.5}><Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" }, gap: 1.25 }}><MetricCard title="إجمالي النواقص" value={number(shortages.total)} color="#d97706" icon={<ReportProblemOutlinedIcon fontSize="small" />} /><MetricCard title="مفتوحة" value={number(shortages.open)} color="#ef4444" icon={<ReportProblemOutlinedIcon fontSize="small" />} /><MetricCard title="تم الحل" value={number(shortages.resolved)} color="#16825a" icon={<ReportProblemOutlinedIcon fontSize="small" />} /><MetricCard title="الطلب المتوقع" value={number(shortages.estimatedDemand)} color="#5b6b7e" icon={<Inventory2OutlinedIcon fontSize="small" />} /></Box><Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.15fr) minmax(320px, .85fr)" }, gap: 1.5 }}><ChartCard title="أكثر المنتجات نقصًا" subtitle="حسب عدد مرات تسجيل النقص" icon={<ReportProblemOutlinedIcon />}><ShortageRankingChart products={shortages.products || []} /></ChartCard><ChartCard title="اتجاه النواقص" subtitle="إجمالي الحالات وما تم حله يوميًا" icon={<TrendingUpRoundedIcon />}><ShortageTrendChart days={shortages.days || []} /></ChartCard></Box><ChartCard title="تفاصيل النواقص" subtitle="سجل المنتجات الناقصة في الشهر المختار" icon={<ReportProblemOutlinedIcon />}><ShortageDetailsTable details={shortages.details || []} /></ChartCard></Stack>}
  </Stack></AppShell>;
}
