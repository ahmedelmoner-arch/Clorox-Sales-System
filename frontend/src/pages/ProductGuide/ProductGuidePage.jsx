import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Card, CardActionArea, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, InputAdornment, Stack, TextField, Typography } from "@mui/material";
import AutoStoriesRoundedIcon from "@mui/icons-material/AutoStoriesRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import AppShell from "../../components/layout/AppShell";
import MobileScreenHeader from "../../components/layout/MobileScreenHeader";
import { getProductGuide } from "../../services/product-guide.service";

function withPdfPage(url, page) {
  if (!url || !page) return url;
  return `${url}${url.includes("#") ? "&" : "#"}page=${page}`;
}

function BulletList({ title, items }) {
  if (!items?.length) return null;
  return <Box sx={{ mt: 2.25 }}><Typography fontWeight={900} sx={{ mb: .9 }}>{title}</Typography><Stack spacing={.85}>{items.map((item) => <Stack key={item} direction="row" spacing={.8} alignItems="flex-start"><CheckCircleRoundedIcon sx={{ mt: .18, fontSize: 18, color: "#16825a" }} /><Typography variant="body2">{item}</Typography></Stack>)}</Stack></Box>;
}

function ProductDialog({ product, onClose }) {
  if (!product) return null;
  const pdfUrl = withPdfPage(product.pdfUrl, product.pdfPage);
  return <Dialog open onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3 } }}>
    <DialogTitle sx={{ pb: 1.5 }}><Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}><Box><Typography fontWeight={900}>{product.productName}</Typography><Stack direction="row" spacing={.7} sx={{ mt: .8 }}><Chip label={product.category} size="small" color="primary" variant="outlined" />{product.productId && <Chip label={`كود ${product.productId}`} size="small" variant="outlined" />}</Stack></Box><IconButton aria-label="إغلاق" onClick={onClose}><CloseRoundedIcon /></IconButton></Stack></DialogTitle>
    <DialogContent dividers>{product.shortDescription && <Typography color="text.secondary">{product.shortDescription}</Typography>}<BulletList title="أهم المميزات" items={product.keyBenefits} /><BulletList title="الاستخدام" items={product.usage} /></DialogContent>
    <DialogActions sx={{ px: 3, py: 2 }}>{pdfUrl && <Button component="a" href={pdfUrl} target="_blank" rel="noreferrer" variant="contained" endIcon={<OpenInNewRoundedIcon />}>فتح الكتيب{product.pdfPage ? ` - صفحة ${product.pdfPage.toLocaleString("ar-EG")}` : ""}</Button>}<Button onClick={onClose}>إغلاق</Button></DialogActions>
  </Dialog>;
}

export default function ProductGuidePage() {
  const [guide, setGuide] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getProductGuide()
      .then((data) => { if (!cancelled) setGuide(data); })
      .catch((requestError) => { if (!cancelled) setError(requestError.response?.data?.message || "تعذر تحميل دليل المنتجات."); });
    return () => { cancelled = true; };
  }, []);

  const products = guide?.products || [];
  const categories = useMemo(() => [...new Set(products.map((product) => product.category))], [products]);
  const visibleProducts = useMemo(() => {
    const search = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = category === "all" || product.category === category;
      const searchable = [product.productName, product.productId, product.shortDescription, ...product.keyBenefits, ...product.usage].join(" ").toLowerCase();
      return matchesCategory && (!search || searchable.includes(search));
    });
  }, [category, products, query]);

  return <AppShell hideHeader><MobileScreenHeader title="دليل المنتجات" subtitle="معلومات البيع والاستخدام" /><Stack spacing={2.25}>
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1.25}><Stack direction="row" spacing={1.1} alignItems="center"><Box sx={{ width: 46, height: 46, display: "grid", placeItems: "center", borderRadius: 2.5, bgcolor: "#e9f0ff", color: "#1767db" }}><AutoStoriesRoundedIcon /></Box><Box><Typography variant="h5" fontWeight={900}>دليل المنتجات</Typography><Typography variant="body2" color="text.secondary">تعريفات ومميزات المنتجات</Typography></Box></Stack>{guide?.document?.url && <Button component="a" href={guide.document.url} target="_blank" rel="noreferrer" variant="outlined" endIcon={<PictureAsPdfRoundedIcon />}>فتح الكتيب الكامل</Button>}</Stack>
    {error && <Alert severity="warning">{error}</Alert>}
    {!guide && !error && <Box sx={{ minHeight: 320, display: "grid", placeItems: "center" }}><CircularProgress /></Box>}
    {guide && <><TextField fullWidth value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحثي باسم المنتج أو الكود أو الميزة" InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon color="action" /></InputAdornment> }} />
      <Stack direction="row" spacing={.8} useFlexGap flexWrap="wrap"><Chip label="الكل" color={category === "all" ? "primary" : "default"} onClick={() => setCategory("all")} />{categories.map((item) => <Chip key={item} label={item} color={category === item ? "primary" : "default"} variant={category === item ? "filled" : "outlined"} onClick={() => setCategory(item)} />)}</Stack>
      {visibleProducts.length ? <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" }, gap: 1.5 }}>{visibleProducts.map((product) => <Card key={`${product.productId}-${product.productName}`} elevation={0} sx={{ border: "1px solid #e1e8f3", borderRadius: 2.5, transition: "transform .18s ease, box-shadow .18s ease", "&:hover": { transform: "translateY(-2px)", boxShadow: "0 10px 22px rgba(28,53,96,.1)" } }}><CardActionArea onClick={() => setSelectedProduct(product)} sx={{ height: "100%", textAlign: "inherit" }}><CardContent sx={{ p: 2.1 }}><Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}><Box sx={{ minWidth: 0 }}><Typography fontWeight={900}>{product.productName || product.productId}</Typography>{product.productId && <Typography variant="caption" color="text.secondary">كود المنتج: {product.productId}</Typography>}</Box><AutoStoriesRoundedIcon sx={{ flexShrink: 0, color: "#1767db" }} /></Stack><Chip label={product.category} size="small" color="primary" variant="outlined" sx={{ mt: 1.25 }} />{product.shortDescription && <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{product.shortDescription}</Typography>}{product.pdfPage && <Typography variant="caption" color="primary.main" fontWeight={800} sx={{ display: "block", mt: 1.3 }}>صفحة {product.pdfPage.toLocaleString("ar-EG")} في الكتيب</Typography>}</CardContent></CardActionArea></Card>)}</Box> : <Box sx={{ py: 7, textAlign: "center", borderTop: "1px solid #e3e9f3" }}><Typography fontWeight={800}>{products.length ? "لا توجد نتائج مطابقة للبحث." : "لا توجد منتجات منشورة في دليل المنتجات بعد."}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: .6 }}>{products.length ? "غيّري البحث أو الكاتيجوري." : "أضيفي صفًا لكل منتج في Tab ProductGuide ثم اجعلي Active = TRUE."}</Typography></Box>}</>}
  </Stack><ProductDialog product={selectedProduct} onClose={() => setSelectedProduct(null)} /></AppShell>;
}
