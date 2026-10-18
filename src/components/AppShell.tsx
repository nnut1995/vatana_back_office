"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  AppBar,
  Avatar,
  Box,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  SvgIcon,
  Toolbar,
  Typography,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AssignmentIcon from "@mui/icons-material/Assignment";
import BarChartIcon from "@mui/icons-material/BarChart";
import GroupsIcon from "@mui/icons-material/Groups";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import LogoutIcon from "@mui/icons-material/Logout";
import ScienceIcon from "@mui/icons-material/Science";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import LayersIcon from "@mui/icons-material/Layers";
import PrintIcon from "@mui/icons-material/Print";
import PaletteIcon from "@mui/icons-material/Palette";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckroomIcon from "@mui/icons-material/Checkroom";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { PRODUCT_STATUSES, PRODUCT_STATUS_LABELS, type ProductStatus } from "@/types/order";

const DRAWER_WIDTH = 232;

const DEPARTMENT_ICONS: Record<ProductStatus, React.ReactNode> = {
  sample: <ScienceIcon />,
  wait_for_approval: <HourglassTopIcon />,
  fabric_preparation: <LayersIcon />,
  printing: <PrintIcon />,
  decor: <PaletteIcon />,
  sewing: <SvgIcon><path d="M3 21 15.5 4.5c1.6-2.1 3.5-2.8 4.5-1.8s.3 2.9-1.8 4.5L3 21Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="m16 7 2-2M13 12c7-1 9 2 6 5s-5-1-8 2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></SvgIcon>,
  special_work: <AutoFixHighIcon />,
  finishing: <AutoAwesomeIcon />,
  folding: <CheckroomIcon />,
  packing: <Inventory2Icon />,
  sent: <LocalShippingIcon />,
};

const NAV = [
  { href: "/", label: "ภาพรวม", icon: <DashboardIcon /> },
  { href: "/orders", label: "คำสั่งซื้อ", icon: <ReceiptLongIcon /> },
  { href: "/departments", label: "งานรายแผนก", icon: <AssignmentIcon /> },
  { href: "/production-report", label: "ผลงานรายแผนก", icon: <BarChartIcon /> },
  { href: "/colors", label: "ตั้งค่าสี", icon: <PaletteIcon /> },
  { href: "/staff", label: "จัดการพนักงาน", icon: <GroupsIcon /> },
];

export function AppShell({
  user,
  children,
}: {
  user: import("@/lib/permissions").AccessUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [departmentsOpen, setDepartmentsOpen] = useState(true);
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
          {NAV.filter(item => user.role === "admin" || item.href === "/departments").map((item) => {
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
          <ListItemButton onClick={() => setDepartmentsOpen(open => !open)} aria-expanded={departmentsOpen} aria-controls="department-navigation" sx={{ borderRadius: 2, mb: 0.5 }}>
            <ListItemIcon sx={{ minWidth: 40 }}><AccountTreeIcon /></ListItemIcon>
            <ListItemText primary="แผนก" />
            {departmentsOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </ListItemButton>
          <Collapse in={departmentsOpen} timeout="auto" unmountOnExit>
          <List id="department-navigation" disablePadding>
          {PRODUCT_STATUSES.filter(stage => user.role === "admin" || user.departments.includes(stage)).map(stage => (
            <ListItemButton key={stage} component={Link} href={`/departments/${stage}`} selected={pathname === `/departments/${stage}`} sx={{ borderRadius: 2, mb: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 40 }}>{DEPARTMENT_ICONS[stage]}</ListItemIcon>
              <ListItemText primary={PRODUCT_STATUS_LABELS[stage]} />
            </ListItemButton>
          ))}
          </List>
          </Collapse>
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, bgcolor: "background.default" }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
