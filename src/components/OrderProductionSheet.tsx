import {
  Box,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { formatNumber } from "@/lib/format";
import { ProductImageControl } from "@/components/ProductImageControl";
import { FinishingsControl } from "@/components/FinishingsControl";
import {
  SIZES,
  variantTotal,
  productTotal,
  productFinishings,
  type OrderProduct,
  type SerializedOrder,
} from "@/types/order";

// Rough swatch colours for common garment colours; falls back to grey.
const SWATCH: Record<string, string> = {
  BLACK: "#111827",
  WHITE: "#f9fafb",
  NAVY: "#1e293b",
  RED: "#dc2626",
  BLUE: "#2563eb",
  GREY: "#9ca3af",
  GRAY: "#9ca3af",
};

function ColorSwatch({ color }: { color: string }) {
  const bg = SWATCH[color.toUpperCase()] ?? "#c7c9d1";
  return (
    <Box
      component="span"
      sx={{
        display: "inline-block",
        width: 12,
        height: 12,
        borderRadius: "50%",
        bgcolor: bg,
        border: "1px solid rgba(0,0,0,0.2)",
        mr: 1,
        verticalAlign: "middle",
      }}
    />
  );
}

function ProductRow({
  product,
  orderId,
  index,
}: {
  product: OrderProduct;
  orderId: string;
  index: number;
}) {
  return (
    <Paper sx={{ overflow: "hidden" }}>
      <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" } }}>
        {/* Left: image + product type */}
        <Box
          sx={{
            width: { xs: "100%", md: 172 },
            flexShrink: 0,
            p: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            borderRight: { md: "1px solid" },
            borderBottom: { xs: "1px solid", md: "none" },
            borderColor: { xs: "divider", md: "divider" },
            bgcolor: "grey.50",
          }}
        >
          <ProductImageControl
            orderId={orderId}
            index={index}
            imageKey={product.imageKey}
            imageUrl={product.imageUrl}
            alt={product.designName}
          />
          {product.material && (
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              {product.material}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary" align="center">
            {product.productType}
          </Typography>
        </Box>

        {/* Middle: size grid */}
        <Box sx={{ flexGrow: 1, minWidth: 0, overflowX: "auto" }}>
          <Box sx={{ px: 2, pt: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontFamily: "var(--font-geist-mono), monospace" }}>
              {product.styleCode}
            </Typography>
            <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
              {product.designName}
            </Typography>
          </Box>
          <Table size="small" sx={{ mt: 0.5 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Colour</TableCell>
                {SIZES.map((s) => (
                  <TableCell key={s} align="center" sx={{ fontWeight: 600 }}>
                    {s}
                  </TableCell>
                ))}
                <TableCell align="center" sx={{ fontWeight: 700 }}>
                  TOTAL
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {product.variants.map((variant, i) => (
                <TableRow key={`${variant.color}-${i}`}>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    <ColorSwatch color={variant.color} />
                    {variant.color}
                  </TableCell>
                  {SIZES.map((s) => (
                    <TableCell key={s} align="center">
                      {variant.sizes[s] ? formatNumber(variant.sizes[s]) : "—"}
                    </TableCell>
                  ))}
                  <TableCell align="center" sx={{ fontWeight: 700 }}>
                    {formatNumber(variantTotal(variant))}
                  </TableCell>
                </TableRow>
              ))}
              {product.variants.length > 1 && (
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Product total</TableCell>
                  <TableCell colSpan={SIZES.length} />
                  <TableCell align="center" sx={{ fontWeight: 700 }}>
                    {formatNumber(productTotal(product))}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>

        {/* Right: finishing steps (photo + description) */}
        <Box
          sx={{
            width: { xs: "100%", md: 300 },
            flexShrink: 0,
            p: 2,
            borderLeft: { md: "1px solid" },
            borderTop: { xs: "1px solid", md: "none" },
            borderColor: "divider",
            bgcolor: "grey.50",
          }}
        >
          <FinishingsControl
            orderId={orderId}
            index={index}
            finishings={productFinishings(product)}
          />
        </Box>
      </Box>
    </Paper>
  );
}

export function OrderProductionSheet({ order }: { order: SerializedOrder }) {
  return (
    <Stack spacing={2}>
      {order.products.map((product, i) => (
        <ProductRow
          key={`${product.styleCode}-${i}`}
          product={product}
          orderId={order._id}
          index={i}
        />
      ))}
    </Stack>
  );
}
