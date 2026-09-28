"use client";

import { Box, Button, Typography } from "@mui/material";

export default function ErrorPage({ unstable_retry }: { unstable_retry: () => void }) {
  return (
    <Box sx={{ p: 6, textAlign: "center" }}>
      <Typography variant="h4" gutterBottom>เกิดข้อผิดพลาด</Typography>
      <Typography sx={{ mb: 3 }}>ไม่สามารถแสดงข้อมูลได้ในขณะนี้ กรุณาลองอีกครั้ง</Typography>
      <Button onClick={unstable_retry} variant="contained">ลองอีกครั้ง</Button>
    </Box>
  );
}
