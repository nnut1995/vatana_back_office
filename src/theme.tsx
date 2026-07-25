"use client";

import { forwardRef } from "react";
import NextLink, { type LinkProps as NextLinkProps } from "next/link";
import { createTheme } from "@mui/material/styles";

// Lets MUI components (Button, Link, ListItemButton…) use Next.js client-side
// navigation via a plain `href` prop, without passing the Link component across
// the server/client boundary.
const LinkBehavior = forwardRef<
  HTMLAnchorElement,
  Omit<NextLinkProps, "href"> & { href: NextLinkProps["href"] }
>(function LinkBehavior(props, ref) {
  return <NextLink ref={ref} {...props} />;
});

const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: "light",
    primary: { main: "#4f46e5" },
    secondary: { main: "#0ea5e9" },
    background: { default: "#f7f8fa" },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: "var(--font-geist-sans), system-ui, Arial, sans-serif",
    h4: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  components: {
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { border: "1px solid #ececf0" } },
    },
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiLink: { defaultProps: { component: LinkBehavior } },
    MuiButtonBase: { defaultProps: { LinkComponent: LinkBehavior } },
  },
});

export default theme;
