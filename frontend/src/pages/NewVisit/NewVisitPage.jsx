import { useEffect, useMemo, useState } from "react";
import { Accordion, AccordionDetails, AccordionSummary, Alert, Autocomplete, Box, Button, Card, CardContent, Chip, CircularProgress, Divider, IconButton, MenuItem, Snackbar, Stack, TextField, Typography } from "@mui/material";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import { useSearchParams } from "react-router-dom";
import AppShell from "../../components/layout/AppShell";
import MobileScreenHeader from "../../components/layout/MobileScreenHeader";
import { getVisitInit } from "../../services/visit.service";
import { getReport, saveReport, updateReport } from "../../services/report.service";
import { saveShortages } from "../../services/shortage.service";
import { useSession } from "../../context/SessionContext";
import { getCairoDate } from "../../utils/date";

const typeLabels = { Sales: "مبيعات", Vouchers: "فاوتشر", Vacation: "إجازة" };
const shortageTypeLabels = { OutOfStock: "غير موجود", LowStock: "كمية غير كافية", NotDisplayed: "غير معروض" };
const number = (value) => Number(value || 0).toLocaleString("ar-EG");
const isEnteredNonNegativeInteger = (value) => {
  const text = String(value ?? "").trim();
  return text !== "" && Number.isInteger(Number(text)) && Number(text) >= 0;
};

const priceMonthLabels = { Jan: "يناير", Feb: "فبراير", Mar: "مارس", Apr: "أبريل", May: "مايو", Jun: "يونيو", Jul: "يوليو", Aug: "أغسطس", Sep: "سبتمبر", Oct: "أكتوبر", Nov: "نوفمبر", Dec: "ديسمبر" };

function SalesValuePreview({ visible, value, pieces, month, missingPriceCount }) {
  if (!visible) return null;
  return <Card elevation={0} sx={{ mb: 2, overflow: "hidden", borderRadius: 4, color: "#fff", background: "linear-gradient(115deg, #0f766e, #14b8a6)", boxShadow: "0 12px 24px rgba(13,148,136,.2)" }}><CardContent sx={{ p: { xs: 2, sm: 2.5 } }}><Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}><Box><Typography variant="body2" sx={{ opacity: .84, fontWeight: 700 }}>قيمة المبيعات المتوقعة</Typography><Typography sx={{ mt: .35, fontSize: { xs: 29, sm: 34 }, lineHeight: 1.1, fontWeight: 900 }}>{number(value)} ج.م</Typography><Typography variant="caption" sx={{ display: "block", mt: .75, opacity: .85 }}>محسوبة من {number(pieces)} قطعة بأسعار {priceMonthLabels[month] || month || "الشهر المحدد"}</Typography></Box><Box sx={{ width: 54, height: 54, display: "grid", placeItems: "center", borderRadius: 3, bgcolor: "rgba(255,255,255,.16)" }}><PaidRoundedIcon sx={{ fontSize: 30 }} /></Box></Stack>{missingPriceCount > 0 && <Alert severity="warning" sx={{ mt: 1.5, bgcolor: "rgba(255,255,255,.94)" }}>يوجد {number(missingPriceCount)} منتج مختار بلا سعر في هذا الشهر؛ أضيفي السعر في تبويب UnitPrice قبل الحفظ.</Alert>}</CardContent></Card>;
}

export default function NewVisitPage() {
  const { user } = useSession();
  const [searchParams] = useSearchParams();
  const editReportId = searchParams.get("edit") || "";
  const isEditing = Boolean(editReportId);
  const [init, setInit] = useState(null);
  const [entries, setEntries] = useState({});
  const [shortages, setShortages] = useState({});
  const [selectedShortageProduct, setSelectedShortageProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingLoad, setEditingLoad] = useState(isEditing);
  const [editingReports, setEditingReports] = useState([]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ open: false, message: "", severity: "success" });
  const [form, setForm] = useState({ date: getCairoDate(), reportType: "", branch: null, supervisor: null, vacationType: "", vouchers: "", positiveConsumers: "", negativeConsumers: "", targetConsumers: "", notes: "" });

  useEffect(() => {
    if (!editReportId) {
      setEditingReports([]);
      setEditingLoad(false);
      return undefined;
    }

    let cancelled = false;
    setEditingLoad(true);
    getReport(editReportId)
      .then((data) => {
        if (cancelled) return;
        const reports = data?.reports || [];
        const first = reports[0];
        if (!first) throw new Error("لم يتم العثور على التقرير.");
        setEditingReports(reports);
        setForm({
          date: first.Date || getCairoDate(),
          reportType: first.ReportType || "",
          branch: first.BranchID ? { code: first.BranchID, name: first.BranchName || "" } : null,
          supervisor: first.SupervisorsID ? { id: first.SupervisorsID, name: first.SupervisorName || "" } : null,
          vacationType: first.VacationType || "",
          vouchers: first.Vouchers ?? "",
          positiveConsumers: first.PostiveConsumer ?? "",
          negativeConsumers: first.NegativeConsumer ?? "",
          targetConsumers: first.TargetConsumer ?? "",
          notes: first.Notes || "",
        });
      })
      .catch((error) => {
        if (!cancelled) setFeedback({ open: true, severity: "error", message: error.response?.data?.message || error.message || "تعذر تحميل التقرير للتعديل." });
      })
      .finally(() => { if (!cancelled) setEditingLoad(false); });

    return () => { cancelled = true; };
  }, [editReportId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setInit(null);
    setEntries({});
    setShortages({});
    setSelectedShortageProduct(null);

    getVisitInit(form.date, form.branch)
      .then((data) => { if (!cancelled) setInit(data); })
      .catch((error) => {
        if (!cancelled) setFeedback({ open: true, severity: "error", message: error.response?.data?.message || "تعذر تحميل بيانات النموذج." });
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [form.branch?.code, form.branch?.name, form.date]);

  useEffect(() => {
    if (!editingReports.length || !init) return;
    const first = editingReports[0];
    if (init.targetDate !== first.Date) return;
    const catalog = new Map((init.products || []).map((product) => [String(product.ProductID), product]));
    const restoredEntries = editingReports.reduce((result, report) => {
      const productId = String(report.ProductID || "").trim();
      if (!productId) return result;
      const product = catalog.get(productId) || report;
      result[productId] = {
        productId,
        productName: product.ProductName || report.ProductName || productId,
        targetPieces: Number(init.productTargets?.[productId]?.targetPieces ?? report.TargetPieces ?? 0),
        unitPrice: Number(product.UnitPrice ?? report.UnitPrice ?? 0),
        unitPriceConfigured: Boolean(product.unitPriceConfigured ?? Number(product.UnitPrice ?? report.UnitPrice ?? 0)),
        actualPieces: report.ActualPieces ?? "",
      };
      return result;
    }, {});
    setEntries(restoredEntries);
  }, [editingReports, init]);

  const productsByCategory = useMemo(() => (init?.products || []).reduce((groups, product) => {
    const category = product.Category || "منتجات أخرى";
    groups[category] = [...(groups[category] || []), product];
    return groups;
  }, {}), [init]);
  const categoryTotals = useMemo(() => Object.fromEntries(
    Object.entries(productsByCategory).map(([category, products]) => {
      const target = products.reduce((total, product) => total + Number(init?.productTargets?.[String(product.ProductID)]?.targetPieces || 0), 0);
      const actual = products.reduce((total, product) => total + Number(entries[product.ProductID]?.actualPieces || 0), 0);
      const salesValue = products.reduce((total, product) => total + Number(entries[product.ProductID]?.actualPieces || 0) * Number(product.UnitPrice || 0), 0);
      return [category, { target, actual, salesValue, achievement: target ? Math.round((actual / target) * 100) : 0 }];
    }),
  ), [entries, init?.productTargets, productsByCategory]);
  const isVacation = form.reportType === "Vacation";
  const isVoucher = form.reportType === "Vouchers";
  const targetPieces = Object.values(init?.productTargets || {}).reduce((total, item) => total + Number(item.targetPieces || 0), 0);
  const actualPieces = Object.values(entries).reduce((total, item) => total + Number(item.actualPieces || 0), 0);
  const totalSalesValue = Object.values(entries).reduce((total, item) => total + Number(item.actualPieces || 0) * Number(item.unitPrice || 0), 0);
  const selectedProductsWithoutPrice = Object.values(entries).filter((item) => Number(item.actualPieces || 0) > 0 && !item.unitPriceConfigured);
  const saleProducts = Object.values(entries).filter((item) => Number(item.actualPieces) > 0);
  const shortageEntries = Object.values(shortages);
  const hasSales = saleProducts.length > 0;
  const hasShortages = shortageEntries.length > 0;
  const progress = targetPieces ? Math.round((actualPieces / targetPieces) * 100) : 0;

  function updateForm(field, value) { setForm((current) => ({ ...current, [field]: value })); }
  function updateReportType(reportType) {
    setForm((current) => ({
      ...current,
      reportType,
      // Vacation reports are not tied to a branch. Clear any hidden selection.
      ...(reportType === "Vacation" ? { branch: null, targetConsumers: "" } : {}),
    }));
    if (reportType === "Vacation") {
      setShortages({});
      setSelectedShortageProduct(null);
    }
  }
  function updateEntry(product, actualPieces) {
    const targetPieces = Number(init?.productTargets?.[String(product.ProductID)]?.targetPieces || 0);
    const unitPrice = Number(product.UnitPrice || 0);
    setEntries((current) => ({ ...current, [product.ProductID]: { productId: product.ProductID, productName: product.ProductName, targetPieces, unitPrice, unitPriceConfigured: product.unitPriceConfigured, actualPieces } }));
  }
  function addShortage(product) {
    if (!product) return;
    const productId = String(product.ProductID || "");
    if (!productId) return;
    setShortages((current) => ({
      ...current,
      [productId]: {
        productId,
        productName: product.ProductName || productId,
        shortageType: "OutOfStock",
        estimatedDemand: "",
        notes: "",
      },
    }));
    setSelectedShortageProduct(null);
  }
  function updateShortage(productId, field, value) {
    setShortages((current) => ({ ...current, [productId]: { ...current[productId], [field]: value } }));
  }
  function removeShortage(productId) {
    setShortages((current) => {
      const next = { ...current };
      delete next[productId];
      return next;
    });
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.reportType) return setFeedback({ open: true, severity: "warning", message: "اختاري نوع التقرير أولًا." });
    if (!form.supervisor) return setFeedback({ open: true, severity: "warning", message: "اختاري اسم المشرف أولًا." });
    if (!isVacation && !form.branch) return setFeedback({ open: true, severity: "warning", message: "اختاري اسم الفرع أولًا." });
    if (isVacation && !form.vacationType) return setFeedback({ open: true, severity: "warning", message: "اختاري نوع الإجازة أولًا." });
    if (!isVacation && hasSales && !isEnteredNonNegativeInteger(form.positiveConsumers)) {
      return setFeedback({ open: true, severity: "warning", message: "أدخلي عدد العملاء الإيجابيين برقم صحيح." });
    }
    if (!isVacation && hasSales && !isEnteredNonNegativeInteger(form.negativeConsumers)) {
      return setFeedback({ open: true, severity: "warning", message: "أدخلي عدد العملاء السلبيين برقم صحيح." });
    }
    if (isVoucher && hasSales && !isEnteredNonNegativeInteger(form.vouchers)) {
      return setFeedback({ open: true, severity: "warning", message: "أدخلي عدد الفواتشر برقم صحيح." });
    }
    if (hasSales && selectedProductsWithoutPrice.length) {
      return setFeedback({ open: true, severity: "warning", message: "أضيفي السعر الشهري للمنتجات المختارة في تبويب UnitPrice قبل حفظ التقرير." });
    }
    if (!isVacation && !hasSales && !hasShortages) {
      return setFeedback({ open: true, severity: "warning", message: "سجلي مبيعات أو منتجًا ناقصًا واحدًا على الأقل قبل الحفظ." });
    }
    let savedReport = null;
    try {
      setSaving(true);
      const products = saleProducts;
      const reportPayload = { date: form.date, reportType: form.reportType, branchId: isVacation ? "" : form.branch?.code, branchName: isVacation ? "" : form.branch?.name, supervisorId: form.supervisor?.id, vacationType: form.vacationType, vouchers: form.vouchers, positiveConsumers: form.positiveConsumers, negativeConsumers: form.negativeConsumers, targetConsumers: form.targetConsumers, notes: form.notes, products };
      if (isVacation || hasSales) savedReport = isEditing ? await updateReport(editReportId, reportPayload) : await saveReport(reportPayload);
      const savedShortages = !isEditing && hasShortages
        ? await saveShortages({
          date: form.date,
          branchId: form.branch?.code,
          branchName: form.branch?.name,
          supervisorId: form.supervisor?.id,
          reportId: savedReport?.reportId || "",
          shortages: shortageEntries,
        })
        : null;
      if (isEditing) {
        setEditingReports(savedReport?.records || editingReports);
      } else {
        setEntries({});
        setShortages({});
        setSelectedShortageProduct(null);
        setForm((current) => ({ ...current, branch: null, supervisor: null, vacationType: "", vouchers: "", positiveConsumers: "", negativeConsumers: "", targetConsumers: "", notes: "" }));
      }
      const confirmations = [];
      if (savedReport) {
        const savedRows = savedReport.sheetUpdate?.updatedRows || products.length || 1;
        const savedRange = savedReport.sheetUpdate?.updatedRange;
        confirmations.push(`تم حفظ التقرير في Reports (${savedRows} صف${savedRows === 1 ? "" : "وف"})${savedRange ? ` — ${savedRange}` : ""}`);
      }
      if (savedShortages) {
        const savedRows = savedShortages.sheetUpdate?.updatedRows || shortageEntries.length;
        const savedRange = savedShortages.sheetUpdate?.updatedRange;
        confirmations.push(`تم حفظ النواقص في ProductShortages (${savedRows} صف${savedRows === 1 ? "" : "وف"})${savedRange ? ` — ${savedRange}` : ""}`);
      }
      setFeedback({ open: true, severity: "success", message: `${confirmations.join(". ")}.` });
    } catch (error) {
      const prefix = savedReport ? "تم حفظ التقرير في Reports، لكن " : "";
      setFeedback({ open: true, severity: "error", message: `${prefix}${error.response?.data?.message || "تعذر حفظ البيانات. حاولي مرة أخرى."}` });
    } finally { setSaving(false); }
  }

  if (loading) return <AppShell hideHeader><MobileScreenHeader title="تسجيل تقرير" subtitle="جارٍ تحميل بيانات التقرير" /><Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}><CircularProgress /></Box></AppShell>;

  if (editingLoad) return <AppShell hideHeader><MobileScreenHeader title="تعديل تقرير" subtitle="جارٍ تحميل بيانات التقرير" /><Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}><CircularProgress /></Box></AppShell>;

  return (
    <AppShell hideHeader>
      <MobileScreenHeader title="تسجيل تقرير" subtitle="أضيفي بيانات الزيارة أو المبيعات" />
      {isEditing && <Alert severity="info" sx={{ mb: 2 }}>أنتِ الآن تعدّلين التقرير نفسه. سيُسجَّل نوع التعديل ووقته في Google Sheets.</Alert>}
      <SalesValuePreview visible={!isVacation && Boolean(form.reportType) && hasSales} value={totalSalesValue} pieces={actualPieces} month={init?.unitPriceMonth} missingPriceCount={selectedProductsWithoutPrice.length} />
      <Box component="form" onSubmit={submit}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1} sx={{ mb: 2.5 }}>
          <Box><Typography variant="h5" fontWeight={900}>إضافة تقرير جديد</Typography><Typography color="text.secondary">أدخلي البيانات ثم احفظيها مباشرة في ملف التقارير.</Typography></Box>
          <Chip icon={<Inventory2OutlinedIcon />} label={typeLabels[form.reportType] || "اختاري نوع التقرير"} color="primary" variant="outlined" />
        </Stack>
        <Card elevation={0} sx={{ border: "1px solid #e8edf7", borderRadius: 4, mb: 2 }}><CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography fontWeight={900} sx={{ mb: 2 }}>بيانات التقرير</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 2 }}>
            <TextField fullWidth type="date" label="التاريخ" value={form.date} onChange={(event) => updateForm("date", event.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField fullWidth label="اسم المندوبة" value={user?.delegateName || user?.name || ""} InputProps={{ readOnly: true }} />
            <TextField fullWidth required select label="نوع التقرير" value={form.reportType} onChange={(event) => updateReportType(event.target.value)}>
              <MenuItem value="" disabled>اختاري نوع التقرير</MenuItem>
              {(init?.reportTypes || ["Sales", "Vouchers", "Vacation"]).map((type) => <MenuItem key={type} value={type}>{typeLabels[type] || type}</MenuItem>)}
            </TextField>
            <Autocomplete options={init?.supervisors || []} value={form.supervisor} onChange={(_, value) => updateForm("supervisor", value)} getOptionLabel={(option) => option.name || ""} isOptionEqualToValue={(option, value) => option.id === value.id} renderInput={(params) => <TextField {...params} required label="اسم المشرف" placeholder="اختاري اسم المشرف" />} />
            {!isVacation && <Autocomplete options={init?.branches || []} value={form.branch} onChange={(_, value) => updateForm("branch", value)} getOptionLabel={(option) => option.name || ""} isOptionEqualToValue={(option, value) => option.code === value.code} renderInput={(params) => <TextField {...params} required label="اسم الفرع" placeholder="ابحثي باسم الفرع" />} />}
            {isVacation && <TextField fullWidth required select label="نوع الإجازة" value={form.vacationType} onChange={(event) => updateForm("vacationType", event.target.value)}>{(init?.vacationTypes || []).map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}</TextField>}
          </Box>
        </CardContent></Card>

        {!isVacation && form.branch && <Card elevation={0} sx={{ borderRadius: 3.5, mb: 2, boxShadow: "0 8px 20px rgba(24,42,78,.14)" }}><CardContent sx={{ py: 2 }}>
          <Typography textAlign="center" fontWeight={900}>اسم الفرع</Typography><Typography textAlign="center" color="primary.main" fontWeight={800} sx={{ mt: .25 }}>{form.branch.name}</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", textAlign: "center", mt: 1.8 }}><Box><Typography variant="body2">🎯 الهدف</Typography><Typography fontSize={21} fontWeight={900}>{number(targetPieces)}</Typography></Box><Box sx={{ borderInline: "1px solid #e5e9f1" }}><Typography variant="body2">✅ المحقق</Typography><Typography fontSize={21} fontWeight={900} color="#109553">{number(actualPieces)}</Typography></Box><Box><Typography variant="body2">📈 الإنجاز</Typography><Typography fontSize={21} fontWeight={900} color="primary.main">{progress}%</Typography></Box></Box>
        </CardContent></Card>}

        {!isEditing && !isVacation && form.branch && <Card elevation={0} sx={{ border: "1px solid #f2d9b1", borderRadius: 4, mb: 2, bgcolor: "#fffdf8" }}><CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} justifyContent="space-between" spacing={1} sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center"><Box sx={{ width: 38, height: 38, display: "grid", placeItems: "center", borderRadius: 2, color: "#b45309", bgcolor: "#fff0d4" }}><ReportProblemOutlinedIcon /></Box><Box><Typography fontWeight={900}>نواقص المنتجات</Typography><Typography variant="caption" color="text.secondary">اختياري — يُحفظ في سجل مستقل ولا يغيّر المبيعات.</Typography></Box></Stack>
            <Chip size="small" color={hasShortages ? "warning" : "default"} label={hasShortages ? `${number(shortageEntries.length)} نقص مسجل` : "لا توجد نواقص"} />
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems={{ sm: "flex-start" }}>
            <Autocomplete fullWidth size="small" options={(init?.products || []).filter((product) => !shortages[String(product.ProductID)])} value={selectedShortageProduct} onChange={(_, value) => setSelectedShortageProduct(value)} getOptionLabel={(option) => option.ProductName || ""} isOptionEqualToValue={(option, value) => String(option.ProductID) === String(value.ProductID)} renderInput={(params) => <TextField {...params} label="المنتج الناقص" placeholder="ابحثي باسم المنتج" />} />
            <Button type="button" variant="outlined" color="warning" onClick={() => addShortage(selectedShortageProduct)} disabled={!selectedShortageProduct} startIcon={<AddRoundedIcon />} sx={{ minWidth: { sm: 142 }, whiteSpace: "nowrap" }}>إضافة نقص</Button>
          </Stack>
          {hasShortages && <Stack spacing={1.2} sx={{ mt: 2 }}>{shortageEntries.map((shortage) => <Box key={shortage.productId} sx={{ p: 1.35, border: "1px solid #f0dfc5", borderRadius: 2.5, bgcolor: "background.paper" }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: 1.15 }}><Typography fontWeight={900} noWrap>{shortage.productName}</Typography><IconButton type="button" size="small" color="error" aria-label={`حذف نقص ${shortage.productName}`} onClick={() => removeShortage(shortage.productId)}><CloseRoundedIcon fontSize="small" /></IconButton></Stack>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "minmax(190px, 1fr) 150px" }, gap: 1.1 }}>
              <TextField select size="small" label="حالة النقص" value={shortage.shortageType} onChange={(event) => updateShortage(shortage.productId, "shortageType", event.target.value)}>{Object.entries(shortageTypeLabels).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField>
              <TextField size="small" type="number" label="الطلب المتوقع (اختياري)" value={shortage.estimatedDemand} onChange={(event) => updateShortage(shortage.productId, "estimatedDemand", event.target.value)} inputProps={{ min: 0, step: 1 }} />
              <TextField size="small" label="ملاحظة (اختياري)" value={shortage.notes} onChange={(event) => updateShortage(shortage.productId, "notes", event.target.value)} sx={{ gridColumn: { sm: "1 / -1" } }} />
            </Box>
          </Box>)}</Stack>}
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.25 }}>يمكنك حفظ النواقص حتى لو لم تسجلي مبيعات في هذه الزيارة.</Typography>
        </CardContent></Card>}

        {!!form.reportType && !isVacation && <Card elevation={0} sx={{ border: "1px solid #e8edf7", borderRadius: 4, mb: 2 }}><CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}><Typography fontWeight={900}>المنتجات</Typography><Typography variant="caption" color="text.secondary">اكتبي المحقق فقط للمنتجات التي تم تسجيلها</Typography></Stack>
          {Object.entries(productsByCategory).map(([category, products]) => {
            const totals = categoryTotals[category];
            return <Accordion key={category} disableGutters elevation={0} sx={{ mb: 1, overflow: "hidden", borderRadius: 2.5, border: "none", "&:before": { display: "none" } }}>
              <AccordionSummary expandIcon={<ExpandMoreRoundedIcon sx={{ color: "#fff" }} />} sx={{ minHeight: 56, bgcolor: "#116df0", color: "#fff", "&.Mui-expanded": { minHeight: 56, bgcolor: "#075fdc" }, "& .MuiAccordionSummary-content": { my: 1, minWidth: 0 }, "& .MuiAccordionSummary-content.Mui-expanded": { my: 1 } }}>
                <Box sx={{ width: "100%", minWidth: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.25 }}>
                  <Typography fontWeight={900} noWrap>{category} <Typography component="span" sx={{ opacity: .82 }} variant="caption">({products.length})</Typography></Typography>
                  <Stack direction="row" spacing={{ xs: .75, sm: 1.5 }} divider={<Divider orientation="vertical" flexItem sx={{ borderColor: "rgba(255,255,255,.35)" }} />} sx={{ flexShrink: 0, alignItems: "center" }}>
                    <Typography variant="caption" fontWeight={800} noWrap>الهدف {number(totals.target)}</Typography>
                    <Typography variant="caption" fontWeight={800} noWrap>المحقق {number(totals.actual)}</Typography>
                    <Typography variant="caption" fontWeight={800} noWrap>القيمة {number(totals.salesValue)} ج.م</Typography>
                    <Typography variant="caption" fontWeight={900} noWrap>{totals.achievement}%</Typography>
                  </Stack>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 0 }}><Stack divider={<Divider flexItem />}>
                {products.map((product) => {
                  const target = Number(init?.productTargets?.[String(product.ProductID)]?.targetPieces || 0);
                  const actual = entries[product.ProductID]?.actualPieces || "";
                  const achievement = target && actual !== "" ? Math.round((Number(actual) / target) * 100) : 0;
                  const salesValue = Number(actual || 0) * Number(product.UnitPrice || 0);
                  return <Box key={product.ProductID} sx={{ py: 1.1, px: { xs: 0, sm: .5 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1}><Typography fontWeight={800} noWrap>{product.ProductName}</Typography><Typography variant="caption" color="text.secondary" noWrap>كود: {product.ProductID}</Typography></Stack>
                    <Box sx={{ mt: .9, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: .75, alignItems: "center" }}>
                      <Box sx={{ textAlign: "center", py: .6, borderRadius: 1.75, bgcolor: "#f5f8fc" }}><Typography variant="caption" color="text.secondary" display="block">الهدف</Typography><Typography fontWeight={800}>{number(target)}</Typography></Box>
                      <TextField size="small" type="number" label="المحقق" value={actual} onChange={(event) => updateEntry(product, event.target.value)} inputProps={{ min: 0 }} sx={{ "& .MuiInputBase-root": { height: 42 }, "& .MuiInputBase-input": { textAlign: "center", py: .6 } }} />
                      <Box sx={{ textAlign: "center", py: .6, borderRadius: 1.75, bgcolor: "#f2f8ff" }}><Typography variant="caption" color="text.secondary" display="block">الإنجاز</Typography><Typography color="primary.main" fontWeight={900}>{achievement}%</Typography></Box>
                    </Box>
                    <Box sx={{ mt: .8, pt: .8, borderTop: "1px dashed #dce7e8", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: .75 }}>
                      <Box sx={{ textAlign: "center" }}><Typography variant="caption" color="text.secondary" display="block">سعر الوحدة</Typography><Typography fontWeight={800}>{product.UnitPrice === "" || product.UnitPrice === undefined ? "غير محدد" : `${number(product.UnitPrice)} ج.م`}</Typography></Box>
                      <Box sx={{ textAlign: "center", borderInlineStart: "1px solid #e5ebf2" }}><Typography variant="caption" color="text.secondary" display="block">قيمة البيع</Typography><Typography color="#0f766e" fontWeight={900}>{number(salesValue)} ج.م</Typography></Box>
                    </Box>
                  </Box>;
                })}
              </Stack></AccordionDetails>
            </Accordion>;
          })}
        </CardContent></Card>}

        {!!form.reportType && !isVacation && <Card elevation={0} sx={{ border: "1px solid #e8edf7", borderRadius: 4, mb: 2 }}><CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography fontWeight={900} sx={{ mb: 2 }}>بيانات العملاء {isVoucher ? "والفاوتشر" : ""}</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 2 }}>
            <TextField required={hasSales} type="number" label="عملاء إيجابيون" value={form.positiveConsumers} onChange={(event) => updateForm("positiveConsumers", event.target.value)} inputProps={{ min: 0, step: 1 }} helperText="أدخلي ٠ عند عدم وجود عملاء" />
            <TextField required={hasSales} type="number" label="عملاء سلبيون" value={form.negativeConsumers} onChange={(event) => updateForm("negativeConsumers", event.target.value)} inputProps={{ min: 0, step: 1 }} helperText="أدخلي ٠ عند عدم وجود عملاء" />
            <TextField type="number" label="إجمالي العملاء" value={Number(form.positiveConsumers || 0) + Number(form.negativeConsumers || 0)} InputProps={{ readOnly: true }} />
            <TextField type="number" label="هدف العملاء اليومي" value={init?.targetConsumers ?? 0} InputProps={{ readOnly: true }} helperText="يتم جلبه تلقائيًا من الهدف" />
            {isVoucher && <TextField required={hasSales} type="number" label="عدد الفاوتشر" value={form.vouchers} onChange={(event) => updateForm("vouchers", event.target.value)} inputProps={{ min: 0, step: 1 }} helperText="أدخلي ٠ عند عدم وجود فواتشر" />}
          </Box>
        </CardContent></Card>}
        <Card elevation={0} sx={{ border: "1px solid #e8edf7", borderRadius: 4 }}><CardContent sx={{ p: { xs: 2, sm: 3 } }}><TextField fullWidth multiline minRows={3} label="ملاحظة" value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} placeholder="أي ملاحظة تودين إضافتها للتقرير" /><Button type="submit" disabled={saving} variant="contained" size="large" endIcon={saving ? <CircularProgress size={18} color="inherit" /> : hasShortages && !hasSales ? <ReportProblemOutlinedIcon /> : <SaveRoundedIcon />} sx={{ mt: 2.5, minWidth: 180, py: 1.25 }}>{saving ? "جارٍ الحفظ..." : hasShortages && !hasSales ? "حفظ النواقص" : hasShortages ? "حفظ التقرير والنواقص" : "حفظ التقرير"}</Button></CardContent></Card>
      </Box>
      <Snackbar open={feedback.open} autoHideDuration={5000} onClose={() => setFeedback((current) => ({ ...current, open: false }))}><Alert severity={feedback.severity} variant="filled" onClose={() => setFeedback((current) => ({ ...current, open: false }))}>{feedback.message}</Alert></Snackbar>
    </AppShell>
  );
}
