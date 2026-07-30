import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Card, CardContent, CircularProgress, MenuItem, Stack, TextField, Typography } from "@mui/material";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import AppShell from "../../components/layout/AppShell";
import { getDashboard } from "../../services/dashboard.service";
import { getCairoDate } from "../../utils/date";

const number = (value) => Number(value || 0).toLocaleString("ar-EG");
const achievement = (actual, target) => target ? Math.round((actual / target) * 100) : 0;

function ChartCard({ title, icon, children }) {
  return <Card elevation={0} sx={{ border: "1px solid #e3e8f2", borderRadius: 3, overflow: "hidden", bgcolor: "#fff" }}><CardContent sx={{ p: { xs: 2, sm: 2.5 } }}><Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2.25 }}>{icon}<Typography fontWeight={900} fontSize={19}>{title}</Typography></Stack>{children}</CardContent></Card>;
}

function CylinderBar({ x, y, width, height, fill }) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || height <= 0) return null;
  const cap = Math.min(10, Math.max(5, height / 3));
  const radius = width / 2;
  return <g><rect x={x} y={y + cap / 2} width={width} height={Math.max(1, height - cap / 2)} rx={radius} ry={radius} fill={fill} /><rect x={x + width * .16} y={y + cap / 2} width={Math.max(2, width * .19)} height={Math.max(1, height - cap / 2)} rx={width * .1} fill="rgba(255,255,255,.28)" /><ellipse cx={x + width / 2} cy={y + cap / 2} rx={radius} ry={cap / 2} fill={fill} /><ellipse cx={x + width * .38} cy={y + cap * .38} rx={Math.max(2, width * .12)} ry={Math.max(1.5, cap * .17)} fill="rgba(255,255,255,.38)" /></g>;
}

function ValueLabel({ x, y, width, value, fill }) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return <text x={x + width / 2} y={Math.max(15, y - 8)} textAnchor="middle" fill={fill} fontSize="12" fontWeight="800">{number(value)}</text>;
}

function AchievementLabel({ x, y, width, payload }) {
  if (!payload || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  const value = achievement(payload.actual, payload.target);
  return <text x={x + width + 6} y={Math.max(17, y - 24)} textAnchor="start" fill="#c9252d" fontSize="12" fontWeight="900">{number(value)}٪</text>;
}

function TooltipContent({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  return <Box sx={{ bgcolor: "#fff", border: "1px solid #dfe6f1", boxShadow: "0 8px 20px rgba(29,45,78,.12)", borderRadius: 2, px: 1.5, py: 1 }}><Typography fontWeight={900} variant="body2">{label}</Typography>{payload.map((entry) => <Typography key={entry.dataKey} variant="caption" display="block" color={entry.color} fontWeight={800}>{entry.name}: {number(entry.value)}</Typography>)}<Typography variant="caption" display="block" color="#c9252d" fontWeight={900} sx={{ mt: .3 }}>نسبة الإنجاز: {number(achievement(item?.actual, item?.target))}٪</Typography></Box>;
}

function DayComparisonChart({ data }) {
  const width = Math.max(620, data.length * 112);
  return <Box sx={{ overflowX: "auto", pb: .5 }}><Box sx={{ width, height: 320 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 40, right: 12, left: -16, bottom: 0 }} barGap={12} barCategoryGap="22%"><CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" /><XAxis dataKey="label" tickFormatter={number} tickLine={false} axisLine={{ stroke: "#cbd5e1" }} /><YAxis tickFormatter={number} tickLine={false} axisLine={false} allowDecimals={false} width={42} /><Tooltip content={<TooltipContent />} cursor={{ fill: "#f8fafc" }} /><Legend iconType="circle" wrapperStyle={{ paddingTop: 8 }} /><Bar dataKey="actual" name="المحقق" fill="#d6252d" shape={<CylinderBar />} barSize={30}><LabelList dataKey="actual" content={(props) => <ValueLabel {...props} fill="#c9252d" />} /><LabelList dataKey="actual" content={AchievementLabel} /></Bar><Bar dataKey="target" name="الهدف" fill="#aeb5bf" shape={<CylinderBar />} barSize={30}><LabelList dataKey="target" content={(props) => <ValueLabel {...props} fill="#68707b" />} /></Bar></BarChart></ResponsiveContainer></Box></Box>;
}

export default function ChartsPage() {
  const [month, setMonth] = useState(getCairoDate().slice(0, 7));
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("all");
  const [product, setProduct] = useState("all");

  useEffect(() => {
    let cancelled = false;
    setDashboard(null);
    setError("");
    getDashboard(month).then((data) => { if (!cancelled) setDashboard(data); }).catch((requestError) => { if (!cancelled) setError(requestError.response?.data?.message || "تعذر تحميل الرسوم البيانية."); });
    return () => { cancelled = true; };
  }, [month]);

  const products = dashboard?.charts?.products || [];
  const productDays = dashboard?.charts?.productDays || [];
  const customerData = useMemo(() => (dashboard?.charts?.customerDays || []).map((day) => ({ ...day, achievement: achievement(day.actual, day.target) })), [dashboard]);
  const categories = useMemo(() => [...new Set(products.map((item) => item.category))], [products]);
  const productOptions = useMemo(() => products.filter((item) => category === "all" || item.category === category), [category, products]);
  const productData = useMemo(() => Object.values(productDays.filter((item) => {
    if (category !== "all" && item.category !== category) return false;
    return product === "all" || item.productId === product;
  }).reduce((groups, item) => {
    const current = groups[item.date] || { date: item.date, label: item.label, target: 0, actual: 0 };
    current.target += item.target;
    current.actual += item.actual;
    groups[item.date] = current;
    return groups;
  }, {})).sort((left, right) => left.date.localeCompare(right.date)).map((day) => ({ ...day, achievement: achievement(day.actual, day.target) })), [category, product, productDays]);

  return <AppShell hideHeader><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1.5} sx={{ mb: 2.25 }}><Box><Typography variant="h5" fontWeight={900}>الرسوم البيانية</Typography><Typography variant="body2" color="text.secondary">أداء العملاء والمنتجات خلال الشهر</Typography></Box><TextField size="small" type="month" label="الشهر" value={month} onChange={(event) => setMonth(event.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: { xs: "100%", sm: 172 } }} /></Stack>{error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}{!dashboard && !error ? <Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}><CircularProgress /></Box> : <Stack spacing={2}><ChartCard title="العملاء حسب الأيام" icon={<GroupsOutlinedIcon sx={{ color: "#c9252d" }} />}><DayComparisonChart data={customerData} /></ChartCard><ChartCard title="أداء المنتجات حسب الأيام" icon={<Inventory2OutlinedIcon sx={{ color: "#c9252d" }} />}><Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ mb: 2.25 }}><TextField select size="small" label="الكاتيجوري" value={category} onChange={(event) => { setCategory(event.target.value); setProduct("all"); }} sx={{ minWidth: { sm: 190 } }}><MenuItem value="all">كل الكاتيجوري</MenuItem>{categories.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField><TextField select size="small" label="المنتج" value={product} onChange={(event) => setProduct(event.target.value)} sx={{ minWidth: { sm: 230 } }}><MenuItem value="all">كل المنتجات</MenuItem>{productOptions.map((item) => <MenuItem key={item.productId} value={item.productId}>{item.productName}</MenuItem>)}</TextField></Stack>{productData.length ? <DayComparisonChart data={productData} /> : <Typography color="text.secondary" textAlign="center" sx={{ py: 5 }}>لا توجد بيانات منتجات للأيام المحددة.</Typography>}</ChartCard></Stack>}</AppShell>;
}
