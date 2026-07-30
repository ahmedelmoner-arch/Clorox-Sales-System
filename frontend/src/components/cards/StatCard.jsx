import { Card, CardContent, Typography, Box } from "@mui/material";

export default function StatCard({
  title,
  value,
  subtitle,
  color = "#0057FF",
  icon,
}) {
  return (
    <Card
      elevation={0}
      sx={{
        minHeight: 170,
        borderRadius: 4,
        border: "1px solid #E9EEF7",
        background: "#fff",
        transition: "all .25s ease",
        cursor: "pointer",

        "&:hover": {
          transform: "translateY(-6px)",
          boxShadow: "0 15px 35px rgba(0,0,0,.08)",
          borderColor: `${color}40`,
        },
      }}
    >
      <CardContent
        sx={{
          p: 2.5,
          "&:last-child": {
            pb: 3,
          },
        }}
      >
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <Box>
            <Typography
              sx={{
                color: "#8A94A6",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {title}
            </Typography>

            <Typography
              sx={{
                mt: 1,
                fontSize: 28,
                fontWeight: 700,
                color: "#111827",
                lineHeight: 1.1,
              }}
            >
              {value}
            </Typography>
          </Box>

          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: "18px",
              bgcolor: `${color}15`,
              color: color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",

              "& svg": {
                fontSize: 30,
              },
            }}
          >
            {icon}
          </Box>
        </Box>

        <Box
          sx={{
            mt: 2,
            pt: 2,
            borderTop: "1px dashed #EDF1F7",
          }}
        >
          <Typography
            sx={{
              color: color,
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            {subtitle}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}