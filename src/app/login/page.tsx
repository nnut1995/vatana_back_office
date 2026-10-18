"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);
    if (res?.error) {
      setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        bgcolor: "background.default",
      }}
    >
      <Container maxWidth="xs">
        <Paper sx={{ p: 4, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Avatar sx={{ bgcolor: "primary.main", mb: 2 }}>
            <LockOutlinedIcon />
          </Avatar>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            ระบบหลังบ้าน Vatana
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            เข้าสู่ระบบเพื่อใช้งาน
          </Typography>

          {error && (
            <Alert severity="error" sx={{ width: "100%", mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
            <TextField
              label="อีเมล"
              type="email"
              autoComplete="username"
              autoFocus
              fullWidth
              required
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              label="รหัสผ่าน"
              type="password"
              autoComplete="current-password"
              fullWidth
              required
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ mt: 3 }}
            >
              {loading ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
