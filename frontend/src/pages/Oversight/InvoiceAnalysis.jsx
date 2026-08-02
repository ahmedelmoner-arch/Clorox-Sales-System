import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Card, CardContent, CircularProgress, Stack, Tab, Tabs, Typography } from "@mui/material";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import { getInvoices } from "../../services/oversight.service";
import { exportInvoicesCsv, exportInvoicesExcel } from "../../utils/oversight-export";

function columnLetter(index) {
  let value = index + 1;
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

function SheetGrid({ source }) {
  const headers = source?.headers || [];
  const rows = source?.rows || [];
  if (!headers.length) return <Alert severity="info">لا توجد صفوف في {source?.sheet} ضمن الفترة المختارة.</Alert>;

  return <Box sx={{ overflow: "auto", maxHeight: "calc(100vh - 315px)", minHeight: 340, border: "1px solid #d9dce3", borderRadius: 1.5, bgcolor: "#fff", direction: "ltr" }}><Box component="table" sx={{ borderCollapse: "separate", borderSpacing: 0, width: "max-content", minWidth: "100%", fontFamily: "Arial, sans-serif", fontSize: 12, color: "#18233a", "& th, & td": { boxSizing: "border-box", borderRight: "1px solid #d9dce3", borderBottom: "1px solid #d9dce3", height: 31, px: 1.2, whiteSpace: "nowrap", textAlign: "center" }, "& tr > :last-child": { borderRight: "none" } }}><thead><tr><th aria-label="رقم الصف" style={{ position: "sticky", top: 0, left: 0, zIndex: 4, minWidth: 46, background: "#f4f5f8", color: "#64748b", fontWeight: 700 }} /><>{headers.map((header, index) => <th key={`letter-${header}`} style={{ position: "sticky", top: 0, zIndex: 2, minWidth: 92, background: "#f4f5f8", color: "#64748b", fontWeight: 700 }}>{columnLetter(index)}</th>)}</></tr><tr><th style={{ position: "sticky", top: 31, left: 0, zIndex: 4, minWidth: 46, background: "#5a3c8a", color: "#fff", fontWeight: 800 }}>1</th>{headers.map((header) => <th key={header} title={header} style={{ position: "sticky", top: 31, zIndex: 2, minWidth: 92, background: "#5a3c8a", color: "#fff", fontWeight: 800 }}><Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}><span>{header}</span><span aria-hidden="true" style={{ fontSize: 11, opacity: .9 }}>⌄</span></Box></th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.UUID || row.ShortageID || source.sheet}-${index}`}><td style={{ position: "sticky", left: 0, zIndex: 1, minWidth: 46, background: "#f8f9fb", color: "#64748b", fontWeight: 700 }}>{index + 2}</td>{headers.map((header) => <td key={header} title={String(row[header] ?? "")}>{row[header] ?? ""}</td>)}</tr>)}</tbody></Box></Box>;
}

export default function InvoiceAnalysis({ month, date }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState("");
  const [selectedSheet, setSelectedSheet] = useState("Reports");

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError("");
    getInvoices(month, date)
      .then((result) => { if (!cancelled) setData(result); })
      .catch((requestError) => { if (!cancelled) setError(requestError.response?.data?.message || "تعذر سحب البيانات من Reports وProductShortages."); });
    return () => { cancelled = true; };
  }, [month, date]);

  const sources = data?.sources || [];
  const activeSource = useMemo(() => sources.find((source) => source.sheet === selectedSheet) || sources[0], [selectedSheet, sources]);

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

  const period = data.date ? `اليوم ${data.date}` : `الشهر ${data.month}`;
  return <Stack spacing={1.5}><Card elevation={0} sx={{ border: "1px solid #e2e8f2", borderRadius: 2.5 }}><CardContent sx={{ p: { xs: 1.5, sm: 2 } }}><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1.25}><Stack direction="row" spacing={1} alignItems="center"><ReceiptLongOutlinedIcon color="primary" /><Box><Typography fontWeight={900}>الصفوف الأصلية للشيتات</Typography><Typography variant="body2" color="text.secondary">{period} · بدون تجميع أو تعديل للصفوف.</Typography></Box></Stack><Stack direction="row" spacing={1}><Button size="small" variant="outlined" startIcon={<FileDownloadOutlinedIcon />} disabled={Boolean(exporting)} onClick={() => download("excel")}>{exporting === "excel" ? "جارٍ التجهيز..." : "Excel"}</Button><Button size="small" variant="outlined" startIcon={<FileDownloadOutlinedIcon />} disabled={Boolean(exporting)} onClick={() => download("csv")}>{exporting === "csv" ? "جارٍ التجهيز..." : "CSV × 2"}</Button></Stack></Stack><Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>المصدران الوحيدان: Reports وProductShortages · إجمالي الصفوف: {Number(data.totalRows).toLocaleString("ar-EG")}</Typography></CardContent></Card><Card elevation={0} sx={{ border: "1px solid #e2e8f2", borderRadius: 2.5, overflow: "hidden" }}><Tabs value={activeSource?.sheet || false} onChange={(_, nextSheet) => setSelectedSheet(nextSheet)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile sx={{ px: 1, borderBottom: "1px solid #e2e8f2", bgcolor: "#fbfcfe", "& .MuiTab-root": { minHeight: 50, fontWeight: 900, textTransform: "none" } }}>{sources.map((source) => <Tab key={source.sheet} value={source.sheet} label={`${source.sheet} (${Number(source.rowCount).toLocaleString("ar-EG")})`} />)}</Tabs><Box sx={{ p: { xs: 1, sm: 1.5 }, bgcolor: "#f7f8fb" }}>{activeSource && <SheetGrid source={activeSource} />}</Box></Card></Stack>;
}
