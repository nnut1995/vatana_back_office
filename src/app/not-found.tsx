import { Box, Button, Typography } from "@mui/material";

export default function NotFound() {
  return (
    <Box sx={{ p: 6, textAlign: "center" }}>
      <Typography variant="h4" gutterBottom>ไม่พบหน้าที่ต้องการ</Typography>
      <Typography sx={{ mb: 3 }}>หน้านี้อาจถูกย้าย หรือไม่มีข้อมูลที่คุณต้องการ</Typography>
      <Button href="/" variant="contained">กลับหน้าหลัก</Button>
    </Box>
  );
}
