import { Accordion, AccordionDetails, AccordionSummary, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { ORDER_STATUS_LABELS, type OrderStatusHistoryEntry } from "@/types/order";
import { formatDateTime } from "@/lib/format";

export function OrderStatusHistory({ history = [] }: { history?: OrderStatusHistoryEntry[] }) {
  return <Accordion sx={{ mb: 3 }}>
    <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography>ประวัติสถานะคำสั่งซื้อ ({history.length} รายการ)</Typography></AccordionSummary>
    <AccordionDetails>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>เก็บทุกการเปลี่ยนสถานะตั้งแต่เริ่มใช้ระบบบันทึกนี้ ประวัติเดิมจะไม่ถูกแก้ไขหรือลบ</Typography>
      {!history.length ? <Typography>ยังไม่มีประวัติการเปลี่ยนสถานะ</Typography> : <TableContainer><Table size="small" aria-label="ประวัติสถานะคำสั่งซื้อ">
        <TableHead><TableRow>{["เวลา", "ผู้บันทึก", "สถานะเดิม", "สถานะใหม่"].map(label => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
        <TableBody>{[...history].reverse().map(e => <TableRow key={e.id}>
          <TableCell>{formatDateTime(e.at)}</TableCell><TableCell>{e.actor}</TableCell><TableCell>{ORDER_STATUS_LABELS[e.from]}</TableCell><TableCell>{ORDER_STATUS_LABELS[e.to]}</TableCell>
        </TableRow>)}</TableBody>
      </Table></TableContainer>}
    </AccordionDetails>
  </Accordion>;
}
