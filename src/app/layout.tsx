import type { Metadata } from "next";
import { Geist_Mono, IBM_Plex_Sans_Thai } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "@/theme";
import "./globals.css";

// Covers Thai and Latin, so Thai text no longer falls back to a system font.
const plexThai = IBM_Plex_Sans_Thai({
  variable: "--font-plex-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ระบบหลังบ้าน Vatana",
  description: "ระบบหลังบ้านและจัดการคำสั่งซื้อ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${plexThai.variable} ${geistMono.variable}`}>
      <body>
        <AppRouterCacheProvider options={{ key: "mui" }}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
