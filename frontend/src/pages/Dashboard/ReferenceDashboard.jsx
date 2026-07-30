import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Card, CardContent, CircularProgress, Dialog, DialogContent, DialogTitle, Divider, IconButton, Stack, Typography } from "@mui/material";
import WavingHandRoundedIcon from "@mui/icons-material/WavingHandRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import BeachAccessOutlinedIcon from "@mui/icons-material/BeachAccessOutlined";
import TrackChangesRoundedIcon from "@mui/icons-material/TrackChangesRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import HourglassBottomRoundedIcon from "@mui/icons-material/HourglassBottomRounded";
import AutoGraphRoundedIcon from "@mui/icons-material/AutoGraphRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import AppShell from "../../components/layout/AppShell";
import { getDashboard } from "../../services/dashboard.service";
import { useSession } from "../../context/SessionContext";

const number = (value) => Number(value || 0).toLocaleString("ar-EG");
const percentage = (value) => value === null ? "—" : `${number(value)}٪`;
const percent = (actual, target) => target ? Math.round((actual / target) * 100) : null;

function getCairoTime(now) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Cairo", hour: "2-digit", hourCycle: "h23" }).formatToParts(now);
  return Number(parts.find((part) => part.type === "hour")?.value || 0);
}

function MetricCard({ card, index, onOpen }) {
  return <Card role="button" tabIndex={0} aria-haspopup="dialog" elevation={0} onClick={() => onOpen(card.key)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen(card.key); } }} sx={{ position: "relative", overflow: "hidden", cursor: "pointer", bgcolor: card.tint, border: "1px solid #e0e8f3", borderRadius: 4, boxShadow: "0 8px 20px rgba(25,43,76,.06)", animation: "metricCardEnter .42s ease-out both", animationDelay: `${index * 75}ms`, transition: "transform .2s ease, box-shadow .2s ease", "&:hover": { transform: "translateY(-3px)", boxShadow: "0 14px 28px rgba(25,43,76,.13)" }, "&:focus-visible": { outline: `3px solid ${card.color}55`, outlineOffset: 2 }, "&::after": { content: '\"\"', position: "absolute", insetBlock: 0, right: 0, width: 5, bgcolor: card.color }, "@keyframes metricCardEnter": { from: { opacity: 0, transform: "translateY(9px)" }, to: { opacity: 1, transform: "translateY(0)" } }, "@media (prefers-reduced-motion: reduce)": { animation: "none", transition: "none" } }}><CardContent sx={{ p: { xs: 2, sm: 2.5 }, "&:last-child": { pb: { xs: 2, sm: 2.5 } } }}>
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}><Typography sx={{ color: card.color, fontWeight: 800, fontSize: 19 }}>{card.title}</Typography><Box sx={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 2.5, color: card.color, bgcolor: `${card.color}14` }}>{card.icon}</Box></Stack>
    <Box sx={{ display: "grid", gridTemplateColumns: `repeat(${card.items.length}, minmax(0, 1fr))`, textAlign: "center" }}>{card.items.map((item, itemIndex) => <Box key={item.label} sx={{ minWidth: 0, px: .5, borderInlineStart: itemIndex ? "1px solid #dfe7f1" : "none" }}><Stack direction="row" spacing={.35} justifyContent="center" alignItems="center" sx={{ color: item.color || card.color }}><Typography variant="caption" color="text.primary" fontWeight={700} noWrap>{item.label}</Typography>{item.icon}</Stack><Typography sx={{ mt: .6, color: item.color || "#142b55", fontSize: { xs: 21, sm: 24 }, lineHeight: 1.2, fontWeight: 800 }} noWrap>{item.value}</Typography></Box>)}</Box>
    {card.footer && <Typography variant="caption" textAlign="center" display="block" color="text.secondary" sx={{ mt: 1.35, pt: 1.15, borderTop: "1px dashed #dfe6f0" }}>{card.footer}</Typography>}
  </CardContent></Card>;
}

function CumulativeCard({ card, onOpen }) {
  return <Card role="button" tabIndex={0} aria-haspopup="dialog" elevation={0} onClick={() => onOpen(card.key)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen(card.key); } }} sx={{ cursor: "pointer", overflow: "hidden", borderRadius: 4, color: "#fff", bgcolor: "#225e63", boxShadow: "0 10px 22px rgba(28,95,95,.2)", transition: "transform .2s ease, box-shadow .2s ease", "&:hover": { transform: "translateY(-3px)", boxShadow: "0 16px 30px rgba(28,95,95,.25)" }, "&:focus-visible": { outline: "3px solid #6ad8c2", outlineOffset: 2 } }}><CardContent sx={{ p: { xs: 2, sm: 2.5 }, "&:last-child": { pb: { xs: 2, sm: 2.5 } } }}><Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}><Box><Typography fontWeight={800} fontSize={19}>{card.title}</Typography><Typography variant="caption" sx={{ opacity: .8 }}>{card.subtitle}</Typography></Box><Box sx={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 2.5, bgcolor: "rgba(255,255,255,.14)" }}><AutoGraphRoundedIcon /></Box></Stack><Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", textAlign: "center" }}>{card.items.map((item, index) => <Box key={item.label} sx={{ px: .5, borderInlineStart: index ? "1px solid rgba(255,255,255,.2)" : "none" }}><Typography variant="caption" sx={{ opacity: .82 }} fontWeight={700}>{item.label}</Typography><Typography sx={{ mt: .45, fontSize: { xs: 22, sm: 26 }, lineHeight: 1.2, fontWeight: 800 }} noWrap>{item.value}</Typography></Box>)}</Box></CardContent></Card>;
}

function MetricRows({ items, color }) {
  return <Stack divider={<Divider flexItem />} spacing={0}>{items.map((item) => <Stack key={item.label} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 1.35 }}><Typography color="text.secondary">{item.label}</Typography><Typography fontWeight={800} color={item.color || color}>{item.value}</Typography></Stack>)}</Stack>;
}

function PerformanceGrid({ title, rows, nameKey }) {
  return <Box sx={{ mt: 2.25 }}><Typography fontWeight={800} sx={{ mb: 1.1 }}>{title}</Typography>{rows.length ? <Box sx={{ overflowX: "auto", border: "1px solid #e3e9f2", borderRadius: 2 }}><Box sx={{ minWidth: 420 }}><Box sx={{ display: "grid", gridTemplateColumns: "minmax(150px, 1fr) 82px 82px 72px", bgcolor: "#f6f8fc", px: 1.25, py: 1 }}><Typography variant="caption" fontWeight={800}>{nameKey}</Typography><Typography variant="caption" textAlign="center" fontWeight={800}>الهدف</Typography><Typography variant="caption" textAlign="center" fontWeight={800}>المحقق</Typography><Typography variant="caption" textAlign="center" fontWeight={800}>الإنجاز</Typography></Box>{rows.map((row) => <Box key={row.productId || row.category} sx={{ display: "grid", gridTemplateColumns: "minmax(150px, 1fr) 82px 82px 72px", px: 1.25, py: 1.15, borderTop: "1px solid #edf1f6" }}><Typography fontWeight={700} noWrap>{row.productName || row.category}</Typography><Typography textAlign="center">{number(row.target)}</Typography><Typography textAlign="center" color="#16825a" fontWeight={700}>{number(row.actual)}</Typography><Typography textAlign="center" color="#3b82f6" fontWeight={800}>{percentage(row.achievement)}</Typography></Box>)}</Box></Box> : <Typography color="text.secondary" variant="body2">لا توجد بيانات مسجلة لهذا اليوم.</Typography>}</Box>;
}

function DetailsDialog({ card, open, onClose, dailyDetails }) {
  if (!card) return null;
  const performanceCard = card.key === "pieces" || card.key === "cumulative";
  const performanceDetails = card.performanceDetails || dailyDetails;
  return <Dialog open={open} onClose={onClose} fullWidth maxWidth={performanceCard ? "md" : "xs"} PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}><DialogTitle sx={{ pb: 1.5 }}><Stack direction="row" alignItems="center" justifyContent="space-between"><Stack direction="row" spacing={1} alignItems="center"><Box sx={{ width: 40, height: 40, display: "grid", placeItems: "center", borderRadius: 2.5, color: card.color, bgcolor: `${card.color}14` }}>{card.icon}</Box><Box><Typography fontWeight={800}>{card.title}</Typography>{performanceCard && <Typography variant="caption" color="text.secondary">{card.key === "cumulative" ? "تفصيل البيانات المسجلة في كل الأيام" : "تفصيل البيانات المسجلة اليوم"}</Typography>}</Box></Stack><IconButton aria-label="إغلاق" onClick={onClose}><CloseRoundedIcon /></IconButton></Stack></DialogTitle><DialogContent dividers><MetricRows items={card.details || card.items} color={card.color} />{card.footer && <Typography textAlign="center" variant="body2" color="text.secondary" sx={{ mt: 2 }}>{card.footer}</Typography>}{performanceCard && <><PerformanceGrid title="أداء الكاتيجوري" rows={performanceDetails?.categories || []} nameKey="الفئة" /><PerformanceGrid title="أداء المنتجات" rows={performanceDetails?.products || []} nameKey="المنتج" /></>}</DialogContent></Dialog>;
}

export default function ReferenceDashboard() {
  const { user } = useSession();
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [selectedCard, setSelectedCard] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getDashboard().then((data) => { if (!cancelled) setDashboard(data); }).catch((requestError) => { if (!cancelled) setError(requestError.response?.data?.message || "تعذر تحميل بيانات لوحة التحكم."); });
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  const summary = dashboard?.summary || {};
  const cumulative = dashboard?.cumulative || {};
  const vacation = dashboard?.vacation || {};
  const name = user?.delegateName || user?.name || "مندوبة المبيعات";
  const greeting = getCairoTime(now) >= 17 || getCairoTime(now) < 5 ? "مساء الخير" : "صباح الخير";
  const date = useMemo(() => new Intl.DateTimeFormat("ar-EG", { timeZone: "Africa/Cairo", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(now), [now]);
  const pieces = percent(summary.actualPieces, summary.targetPieces);
  const customers = percent(summary.totalConsumers, summary.targetConsumers);
  const reportsByType = summary.byType || {};
  const cumulativeCard = { key: "cumulative", color: "#225e63", title: "التراكمي", subtitle: "إجمالي الأداء المسجل في كل الأيام", icon: <AutoGraphRoundedIcon />, items: [{ label: "قطع", value: number(cumulative.actualPieces) }, { label: "عملاء", value: number(cumulative.totalConsumers) }, { label: "فاوتشر", value: number(cumulative.vouchers) }], details: [{ label: "إجمالي القطع المحققة", value: number(cumulative.actualPieces) }, { label: "إجمالي هدف القطع", value: number(cumulative.targetPieces) }, { label: "إنجاز القطع", value: percentage(cumulative.piecesAchievement) }, { label: "إجمالي العملاء", value: number(cumulative.totalConsumers) }, { label: "إجمالي هدف العملاء", value: number(cumulative.targetConsumers) }, { label: "إنجاز العملاء", value: percentage(cumulative.consumersAchievement) }, { label: "إجمالي الفواتشر", value: number(cumulative.vouchers) }, { label: "إجمالي التقارير", value: number(cumulative.reports) }], performanceDetails: { categories: cumulative.categories, products: cumulative.products } };
  const cards = [
    { key: "pieces", title: "القطع", color: "#3b82f6", tint: "#f5f9ff", icon: <Inventory2OutlinedIcon />, items: [{ label: "الهدف", value: number(summary.targetPieces), icon: <TrackChangesRoundedIcon fontSize="inherit" /> }, { label: "المحقق", value: number(summary.actualPieces), color: "#16825a", icon: <CheckCircleOutlineRoundedIcon fontSize="inherit" /> }, { label: "الإنجاز", value: percentage(pieces), icon: <TrendingUpRoundedIcon fontSize="inherit" /> }] },
    { key: "customers", title: "العملاء اليوم", color: "#22a06b", tint: "#f3fbf7", icon: <GroupsOutlinedIcon />, items: [{ label: "الهدف اليومي", value: number(summary.targetConsumers), icon: <TrackChangesRoundedIcon fontSize="inherit" /> }, { label: "المحقق اليوم", value: number(summary.totalConsumers), color: "#16825a", icon: <CheckCircleOutlineRoundedIcon fontSize="inherit" /> }, { label: "الإنجاز", value: percentage(customers), icon: <TrendingUpRoundedIcon fontSize="inherit" /> }], footer: `إيجابي: ${number(summary.positiveConsumers)}  |  سلبي: ${number(summary.negativeConsumers)}` },
    { key: "reports", title: "التقارير", color: "#8b5cf6", tint: "#faf8ff", icon: <DescriptionOutlinedIcon />, items: [{ label: "تقارير", value: number(summary.count), icon: <DescriptionOutlinedIcon fontSize="inherit" /> }, { label: "فاوتشر", value: number(reportsByType.Vouchers), icon: <ReceiptLongOutlinedIcon fontSize="inherit" /> }, { label: "إجازات", value: number(reportsByType.Vacation), icon: <BeachAccessOutlinedIcon fontSize="inherit" /> }] },
    { key: "vacation", title: "الإجازات السنوية", color: "#e59a27", tint: "#fffbf4", icon: <BeachAccessOutlinedIcon />, items: [{ label: "الإجمالي", value: number(vacation.total), icon: <EventAvailableRoundedIcon fontSize="inherit" /> }, { label: "المستنفذ", value: number(vacation.consumed), color: "#c26425", icon: <HourglassBottomRoundedIcon fontSize="inherit" /> }, { label: "المتبقي", value: number(vacation.remaining), color: "#16825a", icon: <CheckCircleOutlineRoundedIcon fontSize="inherit" /> }] },
  ];
  const activeCard = [cumulativeCard, ...cards].find((card) => card.key === selectedCard);

  return <AppShell hideHeader>
    <Card elevation={0} sx={{ minHeight: 178, overflow: "hidden", borderRadius: { xs: 3, sm: 4 }, color: "#fff", background: "linear-gradient(115deg, #246ee4 0%, #357eea 100%)", boxShadow: "0 12px 25px rgba(40,102,205,.2)" }}><CardContent sx={{ minHeight: 178, display: "grid", placeItems: "center", textAlign: "center", p: { xs: 2.25, sm: 3 } }}><Stack alignItems="center" spacing={.35}><WavingHandRoundedIcon sx={{ fontSize: 40, color: "#ffd269", transform: "rotate(-10deg)" }} /><Typography sx={{ fontSize: { xs: 16, sm: 18 }, opacity: .9, fontWeight: 600 }}>أهلاً بك</Typography><Typography sx={{ fontSize: { xs: 28, sm: 34 }, lineHeight: 1.25, fontWeight: 800 }}>{name}</Typography><Stack direction="row" spacing={.6} alignItems="center" sx={{ opacity: .88 }}><CalendarMonthRoundedIcon fontSize="small" /><Typography variant="caption" fontWeight={700}>{greeting} · {date}</Typography></Stack></Stack></CardContent></Card>
    {error && <Alert severity="warning" sx={{ mt: 2 }}>{error}</Alert>}
    {!dashboard && !error ? <Box sx={{ minHeight: 320, display: "grid", placeItems: "center" }}><CircularProgress /></Box> : <Stack spacing={1.8} sx={{ mt: 1.8 }}><CumulativeCard card={cumulativeCard} onOpen={setSelectedCard} />{cards.map((card, index) => <MetricCard key={card.key} card={card} index={index} onOpen={setSelectedCard} />)}</Stack>}
    <DetailsDialog card={activeCard} open={Boolean(activeCard)} onClose={() => setSelectedCard(null)} dailyDetails={dashboard?.dailyDetails} />
  </AppShell>;
}
