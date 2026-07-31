import { useEffect, useMemo, useState } from "react";
import { Accordion, AccordionDetails, AccordionSummary, Alert, Autocomplete, Box, Button, Card, CardContent, Chip, CircularProgress, Divider, MenuItem, Snackbar, Stack, TextField, Typography } from "@mui/material";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import AppShell from "../../components/layout/AppShell";
import MobileScreenHeader from "../../components/layout/MobileScreenHeader";
import { getVisitInit } from "../../services/visit.service";
import { saveReport } from "../../services/report.service";
import { useSession } from "../../context/SessionContext";
import { getCairoDate } from "../../utils/date";

const typeLabels = { Sales: "مبيعات", Vouchers: "فاوتشر", Vacation: "إجازة" };
const number = (value) => Number(value || 0).toLocaleString("ar-EG");
const isEnteredNonNegativeInteger = (value) => {
  const text = String(value ?? "").trim();
  return text !== "" && Number.isInteger(Number(text)) && Number(text) >= 0;
};

export default function NewVisitPage() {
  const { user } = useSession();
  const [init, setInit] = useState(null);
  const [entries, setEntries] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ open: false, message: "", severity: "success" });
  const [form, setForm] = useState({ date: getCairoDate(), reportType: "", branch: null, supervisor: null, vacationType: "", vouchers: "", positiveConsumers: "", negativeConsumers: "", targetConsumers: "", notes: "" });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setInit(null);
    setEntries({});

    getVisitInit(form.date, form.branch)
      .then((data) => { if (!cancelled) setInit(data); })
      .catch((error) => {
        if (!cancelled) setFeedback({ open: true, severity: "error", message: error.response?.data?.message || "تعذر تحميل بيانات النموذج." });
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [form.branch?.code, form.branch?.name, form.date]);

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
  const progress = targetPieces ? Math.round((actualPieces / targetPieces) * 100) : 0;

  function updateForm(field, value) { setForm((current) => ({ ...current, [field]: value })); }
  function updateReportType(reportType) {
    setForm((current) => ({
      ...current,
      reportType,
      // Vacation reports are not tied to a branch. Clear any hidden selection.
      ...(reportType === "Vacation" ? { branch: null, targetConsumers: "" } : {}),
    }));
  }
  function updateEntry(product, actualPieces) {
    const targetPieces = Number(init?.productTargets?.[String(product.ProductID)]?.targetPieces || 0);
    const unitPrice = Number(product.UnitPrice || 0);
    setEntries((current) => ({ ...current, [product.ProductID]: { productId: product.ProductID, productName: product.ProductName, targetPieces, unitPrice, actualPieces } }));
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.reportType) return setFeedback({ open: true, severity: "warning", message: "اختاري نوع التقرير أولًا." });
    if (!form.supervisor) return setFeedback({ open: true, severity: "warning", message: "اختاري اسم المشرف أولًا." });
    if (!isVacation && !form.branch) return setFeedback({ open: true, severity: "warning", message: "اختاري اسم الفرع أولًا." });
    if (isVacation && !form.vacationType) return setFeedback({ open: true, severity: "warning", message: "اختاري نوع الإجازة أولًا." });
    if (!isVacation && !isEnteredNonNegativeInteger(form.positiveConsumers)) {
      return setFeedback({ open: true, severity: "warning", message: "أدخلي عدد العملاء الإيجابيين برقم صحيح." });
    }
    if (!isVacation && !isEnteredNonNegativeInteger(form.negativeConsumers)) {
      return setFeedback({ open: true, severity: "warning", message: "أدخلي عدد العملاء السلبيين برقم صحيح." });
    }
    if (isVoucher && !isEnteredNonNegativeInteger(form.vouchers)) {
      return setFeedback({ open: true, severity: "warning", message: "أدخلي عدد الفواتشر برقم صحيح." });
    }
    try {
      setSaving(true);
      const products = Object.values(entries).filter((item) => Number(item.actualPieces) > 0);
      const savedReport = await saveReport({ date: form.date, reportType: form.reportType, branchId: isVacation ? "" : form.branch?.code, branchName: isVacation ? "" : form.branch?.name, supervisorId: form.supervisor?.id, vacationType: form.vacationType, vouchers: form.vouchers, positiveConsumers: form.positiveConsumers, negativeConsumers: form.negativeConsumers, targetConsumers: form.targetConsumers, notes: form.notes, products });
      setEntries({});
      setForm((current) => ({ ...current, branch: null, supervisor: null, vacationType: "", vouchers: "", positiveConsumers: "", negativeConsumers: "", targetConsumers: "", notes: "" }));
      const savedRows = savedReport?.sheetUpdate?.updatedRows || products.length || 1;
      const savedRange = savedReport?.sheetUpdate?.updatedRange;
      setFeedback({ open: true, severity: "success", message: `تم الحفظ في تبويب Reports على Google Sheets (${savedRows} صف${savedRows === 1 ? "" : "وف"})${savedRange ? ` — ${savedRange}` : ""}.` });
    } catch (error) {
      setFeedback({ open: true, severity: "error", message: error.response?.data?.message || "تعذر حفظ التقرير. حاولي مرة أخرى." });
    } finally { setSaving(false); }
  }

  if (loading) return <AppShell hideHeader><MobileScreenHeader title="تسجيل تقرير" subtitle="جارٍ تحميل بيانات التقرير" /><Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}><CircularProgress /></Box></AppShell>;

  return (
    <AppShell hideHeader>
      <MobileScreenHeader title="تسجيل تقرير" subtitle="أضيفي بيانات الزيارة أو المبيعات" />
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
                  return <Box key={product.ProductID} sx={{ py: 1.25, display: "grid", gridTemplateColumns: { xs: "1fr 110px", sm: "1fr 120px 140px 80px" }, gap: 1.5, alignItems: "center" }}><Box><Typography fontWeight={700}>{product.ProductName}</Typography><Typography variant="caption" color="text.secondary" display="block">كود: {product.ProductID}</Typography><Typography variant="caption" color="text.secondary">سعر الوحدة: {product.UnitPrice === "" || product.UnitPrice === undefined ? "غير محدد" : `${number(product.UnitPrice)} ج.م`}</Typography></Box><Typography variant="body2" color="text.secondary">الهدف: {number(target)}</Typography><TextField size="small" type="number" label="المحقق" value={actual} onChange={(event) => updateEntry(product, event.target.value)} inputProps={{ min: 0 }} /><Typography color="primary.main" fontWeight={800} textAlign="center">{achievement}%</Typography></Box>;
                })}
              </Stack></AccordionDetails>
            </Accordion>;
          })}
        </CardContent></Card>}

        {!!form.reportType && !isVacation && <Card elevation={0} sx={{ border: "1px solid #e8edf7", borderRadius: 4, mb: 2 }}><CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography fontWeight={900} sx={{ mb: 2 }}>بيانات العملاء {isVoucher ? "والفاوتشر" : ""}</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 2 }}>
            <TextField required type="number" label="عملاء إيجابيون" value={form.positiveConsumers} onChange={(event) => updateForm("positiveConsumers", event.target.value)} inputProps={{ min: 0, step: 1 }} helperText="أدخلي ٠ عند عدم وجود عملاء" />
            <TextField required type="number" label="عملاء سلبيون" value={form.negativeConsumers} onChange={(event) => updateForm("negativeConsumers", event.target.value)} inputProps={{ min: 0, step: 1 }} helperText="أدخلي ٠ عند عدم وجود عملاء" />
            <TextField type="number" label="إجمالي العملاء" value={Number(form.positiveConsumers || 0) + Number(form.negativeConsumers || 0)} InputProps={{ readOnly: true }} />
            <TextField type="number" label="هدف العملاء اليومي" value={init?.targetConsumers ?? 0} InputProps={{ readOnly: true }} helperText="يتم جلبه تلقائيًا من الهدف" />
            {isVoucher && <TextField required type="number" label="عدد الفاوتشر" value={form.vouchers} onChange={(event) => updateForm("vouchers", event.target.value)} inputProps={{ min: 0, step: 1 }} helperText="أدخلي ٠ عند عدم وجود فواتشر" />}
          </Box>
        </CardContent></Card>}
        <Card elevation={0} sx={{ border: "1px solid #e8edf7", borderRadius: 4 }}><CardContent sx={{ p: { xs: 2, sm: 3 } }}><TextField fullWidth multiline minRows={3} label="ملاحظة" value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} placeholder="أي ملاحظة تودين إضافتها للتقرير" /><Button type="submit" disabled={saving} variant="contained" size="large" endIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveRoundedIcon />} sx={{ mt: 2.5, minWidth: 180, py: 1.25 }}>{saving ? "جارٍ الحفظ..." : "حفظ التقرير"}</Button></CardContent></Card>
      </Box>
      <Snackbar open={feedback.open} autoHideDuration={5000} onClose={() => setFeedback((current) => ({ ...current, open: false }))}><Alert severity={feedback.severity} variant="filled" onClose={() => setFeedback((current) => ({ ...current, open: false }))}>{feedback.message}</Alert></Snackbar>
    </AppShell>
  );
}
