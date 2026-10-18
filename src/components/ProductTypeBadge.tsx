import { Box, Typography } from "@mui/material";

export function ProductTypeBadge({ productType }: { productType: string }) {
  const kids = productType.includes("เด็ก");
  const adult = productType.includes("ผู้ใหญ่");
  const color = kids && !adult ? "#9a3412" : adult && !kids ? "#1e40af" : "#374151";
  return <Box sx={{ width: "100%", textAlign: "center", border: "2px solid", borderColor: color,
    bgcolor: kids && !adult ? "#fff7ed" : adult && !kids ? "#eff6ff" : "#f3f4f6", color, borderRadius: 2, p: 1 }}>
    <Typography sx={{ fontWeight: 800, fontSize: 20, overflowWrap: "anywhere" }}>{productType.trim() || "ยังไม่ระบุประเภท"}</Typography>
  </Box>;
}
