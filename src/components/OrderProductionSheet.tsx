import { validColorHex } from "@/lib/color-config";
import { sizeColumns, sizeLabel, isChildShirt, CHILD_SIZE_NUMBERS } from "@/lib/size-columns";
import { productTypeValue, legacyProductType } from "@/lib/product-type";
import { ProductTypeControl } from "@/components/ProductTypeControl";
import { DecorWorkControl } from "@/components/DecorWorkControl";
import { SkuEditControl } from "@/components/SkuEditControl";
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
import { ProductImagePreview } from "@/components/ProductImagePreview";
import { WorkDetailsControl } from "@/components/WorkDetailsControl";
import { ProductStatusControl } from "@/components/ProductStatusControl";
import {
  variantTotal,
  productTotal,
  productStatus,
  type OrderProduct,
  type SerializedOrder,
} from "@/types/order";

function ColorSwatch({ hex }: { hex?: string }) {
  const bg = validColorHex(hex) ? hex : "transparent";
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

export function ProductRow({
  product,
  orderId,
  index,
  previewImage = false,
  readOnlyDetails = false,
  decorSteps,
  decorReadOnly = false,
}: {
  product: OrderProduct;
  orderId: string;
  index: number;
  previewImage?: boolean;
  readOnlyDetails?: boolean;
  decorSteps?: string[];
  decorReadOnly?: boolean;
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
          <ProductTypeControl productType={productTypeValue(product)} legacyType={legacyProductType(product)} needsCanonical={!product.productType?.trim()} orderId={orderId} index={index} readOnly />
          {previewImage ? <ProductImagePreview image={product} alt={product.designName} /> : <ProductImageControl
            orderId={orderId}
            index={index}
            imageKey={product.imageKey}
            imageUrl={product.imageUrl}
            alt={product.designName}
          />}
          {product.material && (
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              {product.material}
            </Typography>
          )}

        </Box>

        {/* Middle: size grid */}
        <Box sx={{ flexGrow: 1, minWidth: 0, overflowX: "auto" }}>
          <Box
            sx={{
              px: 2,
              pt: 1.5,
              display: "flex",
              flexWrap: "wrap",
              gap: 1,
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <Box>
              <Typography variant="subtitle2" sx={{ fontFamily: "var(--font-geist-mono), monospace" }}>
                {product.styleCode}
              </Typography>
              <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
                {product.designName}
              </Typography>
            </Box>
            <ProductStatusControl
              key={`${orderId}-${index}-${productStatus(product)}-${product.productionNotes ?? ""}`}
              orderId={orderId}
              index={index}
              status={productStatus(product)}
              history={product.history}
              orderedUnits={productTotal(product)}
              productionNotes={product.productionNotes}
            />
          </Box>
          {!readOnlyDetails && <Box sx={{ px: 2, pt: 1 }}><SkuEditControl orderId={orderId} index={index} product={product} /></Box>}
          <Table size="small" sx={{ mt: 0.5 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>สี</TableCell>
                {sizeColumns(product).map((s) => (
                  <TableCell key={s} align="center" aria-label={sizeLabel(product, s)} sx={{ fontWeight: 600 }}>
                    {s}
                    {isChildShirt(product) && CHILD_SIZE_NUMBERS[s] && <Box component="span" sx={{ display: "block" }}>{CHILD_SIZE_NUMBERS[s]}</Box>}
                  </TableCell>
                ))}
                <TableCell align="center" sx={{ fontWeight: 700 }}>
                  รวม
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {product.variants.map((variant, i) => (
                <TableRow key={`${variant.color}-${i}`}>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    <ColorSwatch hex={variant.colorHex} />
                    {variant.color}
                  </TableCell>
                  {sizeColumns(product).map((s) => (
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
                  <TableCell sx={{ fontWeight: 700 }}>รวมสินค้านี้</TableCell>
                  <TableCell colSpan={sizeColumns(product).length} />
                  <TableCell align="center" sx={{ fontWeight: 700 }}>
                    {formatNumber(productTotal(product))}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>

        {/* Right: work overview and production sequence */}
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
          <WorkDetailsControl
            readOnly
            orderId={orderId}
            index={index}
            workFront={product.workFront}
            workBack={product.workBack}
            workSleeves={product.workSleeves}
            productionSteps={product.productionSteps}
            workRemark={product.workRemark}
            artworks={product.artworks}
          />
        </Box>
      </Box>
      {(productStatus(product) === "decor" || !!product.decorWork?.length) && <DecorWorkControl product={product} orderId={orderId} index={index}
        readOnly={decorReadOnly || productStatus(product) !== "decor"} steps={decorSteps} />}
    </Paper>
  );
}

export function OrderProductionSheet({ order, decorSteps }: { order: SerializedOrder; decorSteps?: string[] }) {
  return (
    <Stack spacing={2}>
      {order.products.map((product, i) => (
        <ProductRow
          key={`${product.styleCode}-${i}`}
          product={product}
          orderId={order._id}
          index={i}
          decorSteps={decorSteps}
          decorReadOnly={order.status === "cancelled"}
        />
      ))}
    </Stack>
  );
}
