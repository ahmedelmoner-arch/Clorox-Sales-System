import { useEffect, useState } from "react";
import { Alert, Box, Button, Card, CardContent, CircularProgress, Stack, Typography } from "@mui/material";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import { getInvoices } from "../../services/oversight.service";
import { exportInvoicesCsv, exportInvoicesExcel } from "../../utils/oversight-export";

function SourceTable({ source }) {
  const headers = source.headers || [];
  const rows = source.rows || [];
  const label = source.sheet === "Reports" ? "كل تسجيلات التقارير" : "كل تسجيلات النواقص";
  return <Card elevation={0} sx={{ border: "1px solid #e2e8f2", borderRadius: 2.5, overflow: "hidden" }}><CardContent sx={{ p: { xs: 1.5, sm: 2 }, pb: 1.25 }}><Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}><Box><Typography fontWeight={900}>{source.sheet}</Typography><Typography variant="caption" color="text.secondary">{label}</Typography></Box><Box sx={{ px: 1.1, py: .45, borderRadius: 4, bgcolor: source.sheet === "Reports" ? "#edf4ff" : "#fff6e8", color: source.sheet === "Reports" ? "#2563eb" : "#b45309", fontWeight: 900, fontSize: 13 }}>{Number(source.rowCount || rows.length).toLocaleString("ar-EG")} صف</Box></Stack></CardContent>{!headers.length ? <Alert severity="info" sx={{ m: 1.5, mt: 0 }}>لا توجد بيانات في هذا الشيت ضمن الفترة المختارة.</Alert> : <Box sx={{ overflowX: "auto" }}><Box component="table" sx={{ width: "max-content", minWidth: "100%", borderCollapse: "collapse", "& th": { bgcolor: "#f5f8fc", fontWeight: 900, whiteSpace: "nowrap" }, "& th, & td": { borderBottom: "1px solid #edf1f6", px: 1.25, py: 1, textAlign: "right", fontSize: 13, whiteSpace: "nowrap" } }}><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.UUID || row.ShortageID || source.sheet}-${index}`}>{headers.map((header) => <td key={header}>{row[header] ?? "—"}</td>)}</tr>)}</tbody></Box></Box>}</Card>;
}

export default function InvoiceAnalysis({ month, date }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState("");

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError("");
    getInvoices(month, date)
      .then((result) => { if (!cancelled) setData(result); })
      .catch((requestError) => { if (!cancelled) setError(requestError.response?.data?.message || "تعذر سحب البيانات من Reports وProductShortages."); });
    return () => { cancelled = true; };
  }, [month, date]);

  async function download(format) {
    if (!data || exporting) return;
    try {
      setExporting(format);
      if (format === "excel") await exportInvoicesExcel(data);
      else exportInvoicesCsv(data);
    } catch {
      setError("تعذر تصدير البيانات. يرجى المحاولة مرة أخرى.");
    } finally {
      setExporting("");
    }
  }

  if (error) return <Alert severity="warning">{error}</Alert>;
  if (!data) return <Box sx={{ minHeight: 260, display: "grid", placeItems: "center" }}><CircularProgress /></Box>;

  const sources = data.sources || [];
  const period = data.date ? `اليوم ${data.date}` : `الشهر ${data.month}`;
  return <Stack spacing={1.5}><Card elevation={0} sx={{ border: "1px solid #e2e8f2", borderRadius: 2.5 }}><CardContent sx={{ p: { xs: 1.5, sm: 2 } }}><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1.25}><Stack direction="row" spacing={1} alignItems="center"><ReceiptLongOutlinedIcon color="primary" /><Box><Typography fontWeight={900}>سحب بيانات الفترة المختارة</Typography><Typography variant="body2" color="text.secondary">{period} · المصدران: Reports و ProductShortages</Typography></Box></Stack><Stack direction="row" spacing={1}><Button size="small" variant="outlined" startIcon={<FileDownloadOutlinedIcon />} disabled={Boolean(exporting)} onClick={() => download("excel")}>{exporting === "excel" ? "جارٍ التجهيز..." : "Excel"}</Button><Button size="small" variant="outlined" startIcon={<FileDownloadOutlinedIcon />} disabled={Boolean(exporting)} onClick={() => download("csv")}>{exporting === "csv" ? "جارٍ التجهيز..." : "CSV × 2"}</Button></Stack></Stack><Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>إجمالي الصفوف المسحوبة: {Number(data.totalRows).toLocaleString("ar-EG")} — {sources.map((source) => `${source.sheet}: ${Number(source.rowCount).toLocaleString("ar-EG")}`).join(" · ")}</Typography></CardContent></Card>{sources.map((source) => <SourceTable key={source.sheet} source={source} />)}</Stack>;
}
