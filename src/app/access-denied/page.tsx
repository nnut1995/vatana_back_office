import { Box, Button, Typography } from '@mui/material';
export default function AccessDenied() {
  return <Box sx={{ p: 5 }}><Typography variant="h5">บัญชีนี้ไม่สามารถเข้าใช้งานได้</Typography><Typography sx={{ my: 2 }}>กรุณาติดต่อผู้ดูแลระบบเพื่อเปิดใช้งานบัญชี</Typography><Button href="/api/auth/signout">ออกจากระบบ</Button></Box>;
}
