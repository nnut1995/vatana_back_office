"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import LogoutIcon from "@mui/icons-material/Logout";
import { PRODUCT_STATUSES, PRODUCT_STATUS_LABELS } from "@/types/order";

const DRAWER_WIDTH = 232;

const NAV = [
  { href: "/production-report", label: "ผลงานรายแผนก", icon: <DashboardIcon /> },
  { href: "/", label: "ภาพรวม", icon: <DashboardIcon /> },
  { href: "/orders", label: "คำสั่งซื้อ", icon: <ReceiptLongIcon /> },
  { href: "/departments", label: "งานรายแผนก", icon: <DashboardIcon /> },
];

export function AppShell({
  user,
  children,
}: {
  user: { name?: string | null; email?: string | null };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar
        position="fixed"
        color="inherit"
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          borderBottom: "1px solid",
          borderColor: "divider",
          boxShadow: "none",
        }}
      >
        <Toolbar>
          <Avatar
            variant="rounded"
            sx={{ bgcolor: "primary.main", width: 32, height: 32, mr: 1.5, fontSize: 16 }}
          >
            V
          </Avatar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Vatana
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
            {user.name ?? user.email}
          </Typography>
          <IconButton aria-label="เมนูบัญชีผู้ใช้" onClick={(e) => setAnchorEl(e.currentTarget)} size="small">
            <Avatar sx={{ width: 32, height: 32 }}>
              {(user.name ?? user.email ?? "?").charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <MenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              ออกจากระบบ
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: "border-box" },
        }}
      >
        <Toolbar />
        <Divider />
        <List sx={{ px: 1, py: 1.5 }}>
          {NAV.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <ListItemButton
                key={item.href}
                component={Link}
                href={item.href}
                selected={active}
                sx={{ borderRadius: 2, mb: 0.5 }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            );
          })}
        </List>
        <Divider />
        <Typography variant="overline" sx={{ px: 3, pt: 1 }}>แผนก / ขั้นตอนผลิต</Typography>
        <List dense sx={{ px: 1 }}>
          {PRODUCT_STATUSES.map(stage => (
            <ListItemButton key={stage} component={Link} href={`/departments/${stage}`} selected={pathname === `/departments/${stage}`} sx={{ borderRadius: 2 }}>
              <ListItemText primary={PRODUCT_STATUS_LABELS[stage]} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, bgcolor: "background.default" }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
