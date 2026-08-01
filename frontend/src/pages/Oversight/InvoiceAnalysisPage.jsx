import { Box, Stack, TextField, Typography } from "@mui/material";
import AppShell from "../../components/layout/AppShell";
import { getCairoDate } from "../../utils/date";
import InvoiceAnalysis from "./InvoiceAnalysis";
import { useState } from "react";

export default function InvoiceAnalysisPage() {
  const [month, setMonth] = useState(getCairoDate().slice(0, 7));
  return <AppShell hideNavigation><Stack spacing={2.25}><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1}><Box><Typography variant="h5" fontWeight={900}>تحليل الفواتير</Typography><Typography variant="body2" color="text.secondary">بيانات مباشرة من تبويب Reports في Google Sheets.</Typography></Box><TextField type="month" size="small" label="الشهر" value={month} onChange={(event) => setMonth(event.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: { xs: "100%", sm: 178 } }} /></Stack><InvoiceAnalysis month={month} /></Stack></AppShell>;
}
