import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogContent, DialogTitle, Divider, IconButton, Stack, TextField, Typography } from "@mui/material";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import BeachAccessOutlinedIcon from "@mui/icons-material/BeachAccessOutlined";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import Groups2OutlinedIcon from "@mui/icons-material/Groups2Outlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import { useNavigate } from "react-router-dom";
import AppShell from "../../components/layout/AppShell";
import { getReports } from "../../services/report.service";
import { getCairoDate } from "../../utils/date";

const display = (value) => Number(value || 0).toLocaleString("ar-EG");
const money = (value) => `${display(value)} ج.م`;
const percentage = (actual, target) => target ? `${display(Math.round((actual / target) * 100))}٪` : "—";
const reportTypes = {
  Sales: { label: "مبيعات", color: "#2f78df", tint: "#f4f8ff", icon: <StorefrontOutlinedIcon /> },
  Vouchers: { label: "فاوتشر", color: "#8b5cf6", tint: "#faf8ff", icon: <ReceiptLongOutlinedIcon /> },
  Vacation: { label: "إجازة", color: "#dc8b1e", tint: "#fffaf2", icon: <BeachAccessOutlinedIcon /> },
};

function formatReportDay(value) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG", { weekday: "long", day: "numeric", month: "long" }).format(date);
}

function DetailRow({ label, value }) {
  return <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 1.15 }}><Typography color="text.secondary">{label}</Typography><Typography fontWeight={800}>{value}</Typography></Stack>;
}

function ReportDetailsDialog({ reports, onClose }) {
  if (!reports) return null;
  const first = reports[0];
  const type = reportTypes[first.ReportType] || { label: first.ReportType, color: "#64748b", tint: "#f8fafc", icon: <AssessmentOutlinedIcon /> };
  const isVacation = first.ReportType === "Vacation";
  const products = reports.filter((report) => report.ProductID || Number(report.ActualPieces || 0) > 0);
  const targetPieces = products.reduce((total, report) => total + Number(report.TargetPieces || 0), 0);
  const actualPieces = products.reduce((total, report) => total + Number(report.ActualPieces || 0), 0);
  const totalConsumers = reports.reduce((total, report) => total + Number(report.TotalConsumer || 0), 0);
  const targetConsumers = Math.max(0, ...reports.map((report) => Number(report.TargetConsumer || 0)));
  const vouchers = reports.reduce((total, report) => total + Number(report.Vouchers === "" || report.Vouchers === undefined ? report.Amount || 0 : report.Vouchers), 0);
  const salesValue = reports.reduce((total, report) => total + Number(report.SalesValue || 0), 0);
  const notes = reports.find((report) => report.Notes)?.Notes;

  return <Dialog open onClose={onClose} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}><DialogTitle sx={{ pb: 1.5 }}><Stack direction="row" justifyContent="space-between" alignItems="center"><Stack direction="row" spacing={1} alignItems="center"><Box sx={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 2.5, color: type.color, bgcolor: type.tint }}>{type.icon}</Box><Box><Typography fontWeight={800}>{first.BranchName || "إجازة"}</Typography><Typography variant="caption" color="text.secondary">{formatReportDay(first.Date)} · {type.label}</Typography></Box></Stack><IconButton aria-label="إغلاق" onClick={onClose}><CloseRoundedIcon /></IconButton></Stack></DialogTitle><DialogContent dividers><Stack divider={<Divider flexItem />}><DetailRow label="نوع التقرير" value={type.label} /><DetailRow label="المشرف" value={first.SupervisorName || "غير محدد"} /><DetailRow label="التاريخ" value={formatReportDay(first.Date)} />{isVacation ? <DetailRow label="نوع الإجازة" value={first.VacationType || "غير محدد"} /> : <><DetailRow label="إجمالي هدف القطع" value={display(targetPieces)} /><DetailRow label="إجمالي القطع المحققة" value={display(actualPieces)} /><DetailRow label="قيمة المبيعات" value={`${display(salesValue)} ج.م`} /><DetailRow label="إنجاز القطع" value={percentage(actualPieces, targetPieces)} /><DetailRow label="هدف العملاء" value={display(targetConsumers)} /><DetailRow label="العملاء المحققون" value={display(totalConsumers)} /><DetailRow label="إنجاز العملاء" value={percentage(totalConsumers, targetConsumers)} />{first.ReportType === "Vouchers" && <DetailRow label="إجمالي الفواتشر" value={display(vouchers)} />}</>}</Stack>{!isVacation && <Box sx={{ mt: 2.25 }}><Typography fontWeight={800} sx={{ mb: 1 }}>المنتجات المسجلة</Typography>{products.length ? <Box sx={{ overflowX: "auto", border: "1px solid #e2e8f1", borderRadius: 2 }}><Box sx={{ minWidth: 440 }}><Box sx={{ display: "grid", gridTemplateColumns: "minmax(160px, 1fr) 80px 80px 74px", px: 1.25, py: 1, bgcolor: "#f6f8fc" }}><Typography variant="caption" fontWeight={800}>المنتج</Typography><Typography variant="caption" textAlign="center" fontWeight={800}>الهدف</Typography><Typography variant="caption" textAlign="center" fontWeight={800}>المحقق</Typography><Typography variant="caption" textAlign="center" fontWeight={800}>الإنجاز</Typography></Box>{products.map((report) => { const target = Number(report.TargetPieces || 0); const actual = Number(report.ActualPieces || 0); return <Box key={`${report.UUID}-${report.ProductID}`} sx={{ display: "grid", gridTemplateColumns: "minmax(160px, 1fr) 80px 80px 74px", px: 1.25, py: 1.1, borderTop: "1px solid #edf1f6" }}><Typography fontWeight={700} noWrap>{report.ProductName || report.ProductID}</Typography><Typography textAlign="center">{display(target)}</Typography><Typography textAlign="center" color="#16825a" fontWeight={700}>{display(actual)}</Typography><Typography textAlign="center" color="#2f78df" fontWeight={800}>{percentage(actual, target)}</Typography></Box>; })}</Box></Box> : <Typography color="text.secondary" variant="body2">لا توجد منتجات مسجلة.</Typography>}</Box>}{notes && <Box sx={{ mt: 2.25, px: 1.5, py: 1.25, bgcolor: "#f8fafc", borderRadius: 2 }}><Typography variant="caption" color="text.secondary">ملاحظة</Typography><Typography variant="body2" sx={{ mt: .25 }}>{notes}</Typography></Box>}</DialogContent></Dialog>;
}

function formatMonth(value) {
  const date = new Date(`${value}-01T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG", { month: "long", year: "numeric" }).format(date);
}

function MonthlyMetric({ label, value, color }) {
  return <Box sx={{ minWidth: 0, px: { xs: 1, sm: 1.4 }, py: .65, borderInlineStart: { xs: "none", sm: "1px solid #e7edf5" }, "&:first-of-type": { borderInlineStart: "none" } }}><Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: .2 }}>{label}</Typography><Typography fontWeight={800} sx={{ color, fontSize: { xs: "1rem", sm: "1.1rem" }, whiteSpace: "nowrap" }}>{value}</Typography></Box>;
}

function SalesValueCard({ value, month }) {
  return <Card elevation={0} sx={{ mb: 2, overflow: "hidden", borderRadius: 4, color: "#fff", background: "linear-gradient(115deg, #0f766e 0%, #14b8a6 100%)", boxShadow: "0 10px 22px rgba(13,148,136,.18)" }}><CardContent sx={{ p: { xs: 1.8, sm: 2.2 } }}><Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}><Box><Typography variant="body2" sx={{ opacity: .84, fontWeight: 700 }}>قيمة المبيعات المحققة</Typography><Typography sx={{ mt: .3, fontSize: { xs: 27, sm: 32 }, lineHeight: 1.15, fontWeight: 900 }}>{money(value)}</Typography><Typography variant="caption" sx={{ display: "block", mt: .6, opacity: .84 }}>محسوبة بأسعار UnitPrice لشهر وتاريخ كل تقرير في {formatMonth(month)}</Typography></Box><Box sx={{ width: 52, height: 52, display: "grid", placeItems: "center", borderRadius: 3, bgcolor: "rgba(255,255,255,.16)" }}><PaidRoundedIcon sx={{ fontSize: 29 }} /></Box></Stack></CardContent></Card>;
}

function MonthlyAggregateCard({ aggregate, month, onOpen }) {
  return <Card role="button" tabIndex={0} elevation={0} onClick={onOpen} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen(); } }} sx={{ mb: 2, position: "relative", overflow: "hidden", cursor: "pointer", border: "1px solid #dce7e8", borderRadius: 4, bgcolor: "#fbfffe", boxShadow: "0 7px 18px rgba(15,118,110,.08)", transition: "transform .18s ease, box-shadow .18s ease", "&:hover": { transform: "translateY(-2px)", boxShadow: "0 12px 26px rgba(15,118,110,.14)" }, "&:focus-visible": { outline: "3px solid #14b8a655", outlineOffset: 2 }, "&::after": { content: '\"\"', position: "absolute", insetBlock: 0, right: 0, width: 5, bgcolor: "#0f766e" } }}><CardContent sx={{ p: { xs: 1.65, sm: 2 } }}><Stack direction="row" alignItems="center" spacing={1.2} sx={{ mb: 1.55 }}><Box sx={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: "50%", bgcolor: "#e6f6f2", color: "#0f766e" }}><TrendingUpRoundedIcon /></Box><Box sx={{ minWidth: 0, flex: 1 }}><Typography fontWeight={800}>التراكمي الشهري</Typography><Typography variant="caption" color="text.secondary">{formatMonth(month)}</Typography></Box><Box sx={{ width: 32, height: 32, display: "grid", placeItems: "center", borderRadius: "50%", bgcolor: "#fff", color: "#0f766e", border: "1px solid #d9eeea" }}><ChevronLeftRoundedIcon /></Box></Stack><Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))" }, rowGap: 1.2 }}><MonthlyMetric label="محقق القطع" value={display(aggregate.actualPieces)} color="#0f766e" /><MonthlyMetric label="هدف القطع" value={display(aggregate.targetPieces)} color="#1d4ed8" /><MonthlyMetric label="إنجاز القطع" value={percentage(aggregate.actualPieces, aggregate.targetPieces)} color="#0f766e" /><MonthlyMetric label="محقق العملاء" value={display(aggregate.totalConsumers)} color="#7c3aed" /><MonthlyMetric label="هدف العملاء" value={display(aggregate.targetConsumers)} color="#2563eb" /><MonthlyMetric label="إنجاز العملاء" value={percentage(aggregate.totalConsumers, aggregate.targetConsumers)} color="#7c3aed" /></Box></CardContent></Card>;
}

function MonthlyAggregateDialog({ aggregate, month, onClose }) {
  if (!aggregate) return null;
  const hasVouchers = Number(aggregate.vouchers || 0) > 0;
  const columns = "minmax(150px, 1fr) 92px 92px 82px";

  return <Dialog open onClose={onClose} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}><DialogTitle sx={{ pb: 1.5 }}><Stack direction="row" justifyContent="space-between" alignItems="center"><Stack direction="row" spacing={1} alignItems="center"><Box sx={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 2.5, color: "#0f766e", bgcolor: "#e6f6f2" }}><TableChartOutlinedIcon /></Box><Box><Typography fontWeight={800}>تفاصيل التراكمي الشهري</Typography><Typography variant="caption" color="text.secondary">{formatMonth(month)}</Typography></Box></Stack><IconButton aria-label="إغلاق" onClick={onClose}><CloseRoundedIcon /></IconButton></Stack></DialogTitle><DialogContent dividers><Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))" }, border: "1px solid #e3edf0", borderRadius: 2.5, overflow: "hidden", mb: 2.25 }}><Box sx={{ p: 1.35, bgcolor: "#f7fcfb" }}><Inventory2OutlinedIcon sx={{ color: "#0f766e", fontSize: 20 }} /><Typography variant="caption" color="text.secondary" display="block">إجمالي القطع</Typography><Typography fontWeight={800}>{display(aggregate.actualPieces)} / {display(aggregate.targetPieces)}</Typography><Typography variant="caption" color="#0f766e" fontWeight={800}>{percentage(aggregate.actualPieces, aggregate.targetPieces)}</Typography></Box><Box sx={{ p: 1.35, borderInlineStart: "1px solid #e3edf0", bgcolor: "#f9f8ff" }}><Groups2OutlinedIcon sx={{ color: "#7c3aed", fontSize: 20 }} /><Typography variant="caption" color="text.secondary" display="block">إجمالي العملاء</Typography><Typography fontWeight={800}>{display(aggregate.totalConsumers)} / {display(aggregate.targetConsumers)}</Typography><Typography variant="caption" color="#7c3aed" fontWeight={800}>{percentage(aggregate.totalConsumers, aggregate.targetConsumers)}</Typography></Box><Box sx={{ p: 1.35, borderInlineStart: { xs: "none", sm: "1px solid #e3edf0" }, borderTop: { xs: "1px solid #e3edf0", sm: "none" }, bgcolor: "#fffdf7" }}><AssessmentOutlinedIcon sx={{ color: "#d97706", fontSize: 20 }} /><Typography variant="caption" color="text.secondary" display="block">التقارير المسجلة</Typography><Typography fontWeight={800}>{display(aggregate.reports)}</Typography>{hasVouchers ? <Typography variant="caption" color="#d97706" fontWeight={800}>الفواتشر: {display(aggregate.vouchers)}</Typography> : <Typography variant="caption" color="text.secondary">لا يوجد فاوتشر</Typography>}</Box></Box><Typography fontWeight={800} sx={{ mb: 1 }}>أداء الكاتيجوري والمنتجات</Typography>{aggregate.categories?.length ? <Box sx={{ overflowX: "auto", border: "1px solid #e2e8f1", borderRadius: 2.5 }}><Box sx={{ minWidth: 500 }}><Box sx={{ display: "grid", gridTemplateColumns: columns, px: 1.4, py: 1, bgcolor: "#f5f8fb" }}><Typography variant="caption" fontWeight={800}>الكاتيجوري / المنتج</Typography><Typography variant="caption" textAlign="center" fontWeight={800}>المحقق</Typography><Typography variant="caption" textAlign="center" fontWeight={800}>الهدف</Typography><Typography variant="caption" textAlign="center" fontWeight={800}>الإنجاز</Typography></Box>{aggregate.categories.map((category) => <Box key={category.category}><Box sx={{ display: "grid", gridTemplateColumns: columns, px: 1.4, py: 1.1, bgcolor: "#eef8f6", borderTop: "1px solid #d7ebe7" }}><Typography fontWeight={800} color="#0f766e">{category.category}</Typography><Typography textAlign="center" fontWeight={800}>{display(category.actualPieces)}</Typography><Typography textAlign="center" fontWeight={700}>{display(category.targetPieces)}</Typography><Typography textAlign="center" color="#0f766e" fontWeight={800}>{percentage(category.actualPieces, category.targetPieces)}</Typography></Box>{category.products.map((product) => <Box key={product.productId} sx={{ display: "grid", gridTemplateColumns: columns, px: 1.4, py: 1.05, borderTop: "1px solid #edf1f6" }}><Typography sx={{ pr: 1.5, position: "relative", "&::before": { content: '\"\"', position: "absolute", right: 0, top: "50%", width: 6, height: 6, borderRadius: "50%", bgcolor: "#94a3b8", transform: "translateY(-50%)" } }} fontWeight={700}>{product.productName}</Typography><Typography textAlign="center" color="#16825a" fontWeight={700}>{display(product.actualPieces)}</Typography><Typography textAlign="center">{display(product.targetPieces)}</Typography><Typography textAlign="center" color="#2563eb" fontWeight={800}>{percentage(product.actualPieces, product.targetPieces)}</Typography></Box>)}</Box>)}</Box></Box> : <Box sx={{ py: 4, textAlign: "center", border: "1px dashed #cfd9ea", borderRadius: 2.5 }}><Typography color="text.secondary">لا توجد أهداف أو منتجات لهذا الشهر.</Typography></Box>}</DialogContent></Dialog>;
}

export default function ReportsPage({ forcedType }) {
  const navigate = useNavigate();
  const [month, setMonth] = useState(getCairoDate().slice(0, 7));
  const [type, setType] = useState(forcedType || "");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [isMonthlyAggregateOpen, setMonthlyAggregateOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError("");
    getReports({ month, ...(type ? { type } : {}) })
      .then((result) => { if (!cancelled) setData(result); })
      .catch((requestError) => { if (!cancelled) setError(requestError.response?.data?.message || "تعذر تحميل التقارير."); });
    return () => { cancelled = true; };
  }, [month, type]);

  const grouped = useMemo(() => (data?.reports || []).reduce((groups, report) => {
    const key = report.UUID || `${report.Date}-${report.BranchID}-${report.ReportType}`;
    groups[key] = [...(groups[key] || []), report];
    return groups;
  }, {}), [data]);
  const summary = data?.summary || {};
  const monthlyAggregate = data?.monthlyAggregate;

  return <AppShell hideHeader>
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1.5} sx={{ mb: 2.25 }}><Box><Typography variant="h5" fontWeight={800}>التقارير</Typography><Typography color="text.secondary" variant="body2">سجل الزيارات والتقارير المسجلة</Typography></Box><TextField type="month" size="small" label="الشهر" value={month} onChange={(event) => setMonth(event.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: { xs: "100%", sm: 172 } }} /></Stack>
    <Card elevation={0} sx={{ border: "1px solid #dfe7f1", borderRadius: 4, mb: 2, bgcolor: "#fff" }}><CardContent sx={{ p: 2 }}><Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}><Stack direction="row" spacing={.75} flexWrap="wrap" useFlexGap><Button size="small" variant={!type ? "contained" : "outlined"} onClick={() => setType("")}>الكل</Button>{Object.entries(reportTypes).map(([key, item]) => <Button key={key} size="small" variant={type === key ? "contained" : "outlined"} onClick={() => setType(key)}>{item.label}</Button>)}</Stack><Stack direction="row" spacing={2.5}><Box textAlign="center"><Typography fontWeight={800}>{display(summary.count)}</Typography><Typography variant="caption" color="text.secondary">تقارير</Typography></Box><Box textAlign="center"><Typography fontWeight={800}>{display(summary.piecesAchievement)}٪</Typography><Typography variant="caption" color="text.secondary">إنجاز القطع</Typography></Box><Box textAlign="center"><Typography fontWeight={800}>{display(summary.consumersAchievement)}٪</Typography><Typography variant="caption" color="text.secondary">إنجاز العملاء</Typography></Box></Stack></Stack></CardContent></Card>
    {data && <SalesValueCard value={summary.salesValue} month={month} />}
    {data && <MonthlyAggregateCard aggregate={monthlyAggregate} month={month} onOpen={() => setMonthlyAggregateOpen(true)} />}
    {error && <Alert severity="warning">{error}</Alert>}
    {!data && !error && <Box sx={{ minHeight: 280, display: "grid", placeItems: "center" }}><CircularProgress /></Box>}
    {data && !data.reports.length && <Card elevation={0} sx={{ border: "1px dashed #cfd9ea", borderRadius: 4, textAlign: "center", py: 5 }}><AssessmentOutlinedIcon color="primary" sx={{ fontSize: 42 }} /><Typography fontWeight={800} sx={{ mt: 1 }}>لا توجد تقارير مطابقة</Typography><Typography color="text.secondary" variant="body2">اختاري شهرًا أو نوع تقرير مختلفًا.</Typography></Card>}
    <Stack spacing={1.15}>{Object.values(grouped).map((reports) => {
      const first = reports[0];
      const reportType = reportTypes[first.ReportType] || { label: first.ReportType, color: "#64748b", tint: "#f8fafc", icon: <AssessmentOutlinedIcon /> };
      return <Card key={`${first.UUID}-${first.Date}`} role="button" tabIndex={0} elevation={0} onClick={() => setSelectedReport(reports)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedReport(reports); } }} sx={{ position: "relative", overflow: "hidden", cursor: "pointer", border: "1px solid #dfe7f1", borderRadius: 4, bgcolor: reportType.tint, boxShadow: "0 5px 13px rgba(25,43,76,.04)", transition: "transform .18s ease, box-shadow .18s ease", "&:hover": { transform: "translateY(-2px)", boxShadow: "0 10px 21px rgba(25,43,76,.1)" }, "&:focus-visible": { outline: `3px solid ${reportType.color}55`, outlineOffset: 2 }, "&::after": { content: '\"\"', position: "absolute", insetBlock: 0, right: 0, width: 4, bgcolor: reportType.color } }}><CardContent sx={{ p: 1.7 }}><Stack direction="row" alignItems="center" spacing={1.35}><Box sx={{ width: 43, height: 43, flex: "0 0 auto", display: "grid", placeItems: "center", borderRadius: "50%", color: reportType.color, bgcolor: "#fff" }}>{reportType.icon}</Box><Box sx={{ minWidth: 0, flex: 1 }}><Typography fontWeight={800} noWrap>{first.BranchName || "إجازة"}</Typography><Stack direction="row" spacing={.55} alignItems="center" sx={{ mt: .2 }}><CalendarMonthRoundedIcon sx={{ color: reportType.color, fontSize: 15 }} /><Typography variant="caption" color="text.secondary">{formatReportDay(first.Date)}</Typography></Stack></Box><Chip size="small" label={reportType.label} sx={{ color: reportType.color, bgcolor: "#fff", fontWeight: 700, border: `1px solid ${reportType.color}33` }} /></Stack></CardContent></Card>;
    })}</Stack>
    <ReportDetailsDialog reports={selectedReport} onClose={() => setSelectedReport(null)} />
    {selectedReport?.[0]?.UUID && <Button variant="contained" color="primary" startIcon={<EditRoundedIcon />} onClick={() => navigate(`/visit?edit=${encodeURIComponent(selectedReport[0].UUID)}`)} sx={{ position: "fixed", zIndex: 1401, bottom: { xs: 22, sm: 34 }, left: { xs: 22, sm: 34 }, borderRadius: 3, boxShadow: "0 10px 24px rgba(25, 118, 210, .28)" }}>تعديل التقرير</Button>}
    <MonthlyAggregateDialog aggregate={isMonthlyAggregateOpen ? monthlyAggregate : null} month={month} onClose={() => setMonthlyAggregateOpen(false)} />
  </AppShell>;
}
