import { useState } from "react";
import { Box, Stack, TextField, Typography } from "@mui/material";
import AppShell from "../../components/layout/AppShell";
import { getCairoDate } from "../../utils/date";
import InvoiceAnalysis from "./InvoiceAnalysis";

function lastDayOfMonth(month) {
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7));
  return `${month}-${String(new Date(year, monthIndex, 0).getDate()).padStart(2, "0")}`;
}

export default function InvoiceAnalysisPage() {
  const [month, setMonth] = useState(getCairoDate().slice(0, 7));
  const [date, setDate] = useState("");

  function changeMonth(nextMonth) {
    setMonth(nextMonth);
    setDate((currentDate) => currentDate.startsWith(nextMonth) ? currentDate : "");
  }

  return <AppShell hideNavigation><Stack spacing={2.25}><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1}><Box><Typography variant="h5" fontWeight={900}>سحب التقارير والنواقص</Typography><Typography variant="body2" color="text.secondary">المصدران الوحيدان: Reports و ProductShortages. يطبّق الاختيار نفسه على كليهما.</Typography></Box><Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ width: { xs: "100%", sm: "auto" } }}><TextField type="month" size="small" label="الشهر" value={month} onChange={(event) => changeMonth(event.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: { xs: "100%", sm: 178 } }} /><TextField type="date" size="small" label="يوم محدد (اختياري)" value={date} onChange={(event) => setDate(event.target.value)} InputLabelProps={{ shrink: true }} inputProps={{ min: `${month}-01`, max: lastDayOfMonth(month) }} sx={{ width: { xs: "100%", sm: 188 } }} /></Stack></Stack><InvoiceAnalysis month={month} date={date} /></Stack></AppShell>;
}
