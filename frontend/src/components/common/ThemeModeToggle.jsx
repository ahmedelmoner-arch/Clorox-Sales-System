import { IconButton, Tooltip } from "@mui/material";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import { useThemeMode } from "../../context/ThemeModeContext";

export default function ThemeModeToggle() {
  const { isDark, toggleMode } = useThemeMode();
  const label = isDark ? "تفعيل الوضع النهاري" : "تفعيل الوضع الليلي";
  return <Tooltip title={label}><IconButton aria-label={label} onClick={toggleMode} sx={{ width: 40, height: 40, color: isDark ? "#ffd166" : "#36506f", bgcolor: isDark ? "#202d3d" : "#edf3fb", border: "1px solid", borderColor: isDark ? "#384b61" : "#dce7f4", "&:hover": { bgcolor: isDark ? "#293a4e" : "#e3edf9" } }}>{isDark ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}</IconButton></Tooltip>;
}
