import { useEffect, useState } from "react";
import { Alert, Box, Button, Card, CardContent, CircularProgress, Stack, Typography } from "@mui/material";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import { getInvoices } from "../../services/oversight.service";
import { exportInvoicesCsv, exportInvoicesExcel } from "../../utils/oversight-export";

export default function InvoiceAnalysis({ month }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState("");

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError("");
    getInvoices(month)
      .then((result) => { if (!cancelled) setData(result); })
      .catch((requestError) => { if (!cancelled) setError(requestError.response?.data?.message || "تعذر تحميل الفواتير من Reports."); });
    return () => { cancelled = true; };
  }, [month]);

  async function download(format) {
    if (!data || exporting) return;
    try {
      setExporting(format);
      if (format === "excel") await exportInvoicesExcel(data);
      else exportInvoicesCsv(data);
    } catch {
      setError("تعذر تصدير الفواتير. يرجى المحاولة مرة أخرى.");
    } finally {
      setExporting("");
    }
  }

  if (error) return <Alert severity="warning">{error}</Alert>;
  if (!data) return <Box sx={{ minHeight: 260, display: "grid", placeItems: "center" }}><CircularProgress /></Box>;

  const headers = data.headers || [];
  const rows = data.rows || [];
  return <Stack spacing={1.5}>
    <Card elevation={0} sx={{ border: "1px solid #e2e8f2", borderRadius: 2.5 }}><CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1.25}>
        <Stack direction="row" spacing={1} alignItems="center"><ReceiptLongOutlinedIcon color="primary" /><Box><Typography fontWeight={900}>تحليل الفواتير</Typography><Typography variant="body2" color="text.secondary">مصدر البيانات: Google Sheets › {data.sourceSheet} — بنفس أسماء وأعمدة الشيت الأصلية.</Typography></Box></Stack>
        <Stack direction="row" spacing={1}><Button size="small" variant="outlined" startIcon={<FileDownloadOutlinedIcon />} disabled={Boolean(exporting)} onClick={() => download("excel")}>{exporting === "excel" ? "جارٍ التجهيز..." : "Excel"}</Button><Button size="small" variant="outlined" startIcon={<FileDownloadOutlinedIcon />} disabled={Boolean(exporting)} onClick={() => download("csv")}>{exporting === "csv" ? "جارٍ التجهيز..." : "CSV"}</Button></Stack>
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>عدد صفوف الفواتير: {data.rowCount} · عدد الفواتير: {data.invoiceCount}</Typography>
    </CardContent></Card>
    {!rows.length ? <Alert severity="info">لا توجد فواتير مسجلة في Reports للشهر المحدد.</Alert> : <Card elevation={0} sx={{ border: "1px solid #e2e8f2", borderRadius: 2.5, overflow: "hidden" }}><Box sx={{ overflowX: "auto" }}><Box component="table" sx={{ width: "max-content", minWidth: "100%", borderCollapse: "collapse", "& th": { bgcolor: "#f5f8fc", fontWeight: 900, whiteSpace: "nowrap" }, "& th, & td": { borderBottom: "1px solid #edf1f6", px: 1.25, py: 1, textAlign: "right", fontSize: 13, whiteSpace: "nowrap" } }}><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.UUID || "invoice"}-${index}`}>{headers.map((header) => <td key={header}>{row[header] ?? "—"}</td>)}</tr>)}</tbody></Box></Box></Card>}
  </Stack>;
}
