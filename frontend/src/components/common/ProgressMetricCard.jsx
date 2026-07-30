import { Box, Card, LinearProgress, Stack, Typography } from "@mui/material";

export default function ProgressMetricCard({ title, icon, color, target = 0, actual = 0, unit = "" }) {
  const percentage = target ? Math.min(Math.round((actual / target) * 100), 100) : 0;
  const display = (value) => Number(value || 0).toLocaleString("ar-EG");

  return (
    <Card elevation={0} sx={{ border: "1px solid #e8edf7", borderRadius: 4, minHeight: 205 }}>
      <Stack spacing={2.2} sx={{ p: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography color="text.secondary" fontWeight={700}>{title}</Typography>
          <Box sx={{ width: 45, height: 45, borderRadius: 3, display: "grid", placeItems: "center", color, bgcolor: `${color}15` }}>
            {icon}
          </Box>
        </Stack>
        <Stack direction="row" justifyContent="space-between" alignItems="end">
          <Box>
            <Typography variant="h4" fontWeight={800}>{display(actual)}</Typography>
            <Typography variant="caption" color="text.secondary">المحقق {unit}</Typography>
          </Box>
          <Typography sx={{ color, fontWeight: 800, fontSize: 22 }}>{percentage}%</Typography>
        </Stack>
        <LinearProgress variant="determinate" value={percentage} sx={{ height: 9, borderRadius: 8, bgcolor: `${color}18`, "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 8 } }} />
        <Typography variant="body2" color="text.secondary">الهدف: {display(target)} {unit}</Typography>
      </Stack>
    </Card>
  );
}
