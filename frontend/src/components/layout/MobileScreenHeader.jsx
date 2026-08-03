import { Box, IconButton, Stack, Typography } from "@mui/material";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import { useNavigate } from "react-router-dom";

export default function MobileScreenHeader({ title, subtitle, action = "save" }) {
  const navigate = useNavigate();
  return <Box sx={{ mx: { xs: -2, sm: -3 }, mt: { xs: -2, sm: -3 }, mb: 2.5, px: { xs: 2, sm: 3 }, py: 1.35, color: "#fff", background: "linear-gradient(105deg,#064db8,#1379ee)", boxShadow: "0 8px 20px rgba(10,82,190,.25)" }}>
    <Stack direction="row" alignItems="center" justifyContent="space-between"><IconButton aria-label="عودة" onClick={() => navigate(-1)} sx={{ color: "#fff" }}><ArrowForwardRoundedIcon /></IconButton><Box textAlign="center"><Typography fontWeight={900}>{title}</Typography>{subtitle && <Typography variant="caption" sx={{ opacity: .82 }}>{subtitle}</Typography>}</Box>{action === "save" ? <SaveOutlinedIcon /> : <Box sx={{ width: 24 }} />}</Stack>
  </Box>;
}
