import { Grid } from "@mui/material";

import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import MainLayout from "../../components/layout/MainLayout";
import HeaderCard from "../../components/cards/HeaderCard";
import StatCard from "../../components/cards/StatCard";
import CalendarTodayRoundedIcon from "@mui/icons-material/CalendarTodayRounded";


import {
  Button,
  Card,
  CardContent,
  Typography,
  Box,
} from "@mui/material";


export default function Dashboard() {
  return (
  <MainLayout>

    <HeaderCard />

    <Grid container spacing={2}>

      <Grid item xs={12} sm={6}>
        <StatCard
          title="إجمالي القطع"
          value="0"
          subtitle="المستهدف : 0 قطعة"
          color="#0057FF"
          icon={<Inventory2OutlinedIcon />}
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <StatCard
          title="العملاء"
          value="0"
          subtitle="تمت الزيارة اليوم"
          color="#22C55E"
          icon={<GroupsOutlinedIcon />}
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <StatCard
          title="التقارير"
          value="0"
          subtitle="تم إرسالها"
          color="#F59E0B"
          icon={<DescriptionOutlinedIcon />}
        />
      </Grid>

      <Grid item xs={12} sm={6}>

        <Card
          elevation={0}
          sx={{
            borderRadius:5,
            border:"1px solid #E9EEF7",
            height:"100%"
          }}
        >
          <CardContent>

            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >

              <Box>

                <Typography
                  color="text.secondary"
                >
                  آخر زيارة
                </Typography>

                <Typography
                  fontWeight="bold"
                  fontSize={24}
                  mt={1}
                >
                  لا يوجد
                </Typography>

              </Box>

              <CalendarTodayRoundedIcon
                sx={{
                  fontSize:38,
                  color:"#0057FF"
                }}
              />

            </Box>

          </CardContent>

        </Card>

      </Grid>

      

    </Grid>

  </MainLayout>
);
}