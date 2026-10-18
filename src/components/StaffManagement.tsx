'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Paper, Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import type { AccessUser } from '@/lib/permissions';
import { PRODUCT_STATUSES, PRODUCT_STATUS_LABELS, type ProductStatus } from '@/types/order';
type Draft = Omit<AccessUser, 'id'> & { id?: string; password: string };
export function StaffManagement({ users, currentId }: { users: AccessUser[]; currentId: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const open = (user?: AccessUser) => { setError(''); setDraft(user ? { ...user, password: '' } : { name: '', email: '', role: 'staff', departments: [], active: true, password: '' }); };
  async function save() {
    if (!draft) return;
    setSaving(true); setError('');
    try {
      const response = await fetch(draft.id ? `/api/staff/${draft.id}` : '/api/staff', { method: draft.id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'บันทึกไม่สำเร็จ');
      setDraft(null); setNotice('บันทึกบัญชีและสิทธิ์เรียบร้อยแล้ว'); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ'); } finally { setSaving(false); }
  }
  return <Stack spacing={2}>
    {notice && <Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert>}
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField label="ค้นหาชื่อหรืออีเมล" size="small" value={query} onChange={e => setQuery(e.target.value)} sx={{ flex: 1 }} /><Button variant="contained" onClick={() => open()}>เพิ่มพนักงาน</Button></Stack>
    <Paper sx={{ overflowX: 'auto' }}><Table><TableHead><TableRow>{['ชื่อ / อีเมล', 'บทบาท', 'แผนก', 'สถานะ', 'จัดการ'].map(label => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead><TableBody>
      {users.filter(u => `${u.name} ${u.email}`.toLowerCase().includes(query.toLowerCase())).map(u => <TableRow key={u.id}><TableCell><Typography>{u.name}{u.id === currentId ? ' (คุณ)' : ''}</Typography><Typography variant="body2" color="text.secondary">{u.email}</Typography></TableCell><TableCell>{u.role === 'admin' ? 'ผู้ดูแลระบบ' : 'พนักงาน'}</TableCell><TableCell>{u.role === 'admin' ? 'ทุกแผนก' : u.departments.length ? <Stack direction="row" sx={{ gap: 0.5, flexWrap: "wrap" }}>{u.departments.map(d => <Chip size="small" key={d} label={PRODUCT_STATUS_LABELS[d]} />)}</Stack> : 'ยังไม่ได้มอบหมาย'}</TableCell><TableCell><Chip size="small" color={u.active ? 'success' : 'default'} label={u.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'} /></TableCell><TableCell><Button onClick={() => open(u)}>แก้ไข</Button></TableCell></TableRow>)}
    </TableBody></Table></Paper>
    <Dialog open={!!draft} onClose={() => !saving && setDraft(null)} fullWidth maxWidth="sm"><DialogTitle>{draft?.id ? 'แก้ไขพนักงานและสิทธิ์' : 'เพิ่มพนักงาน'}</DialogTitle>{draft && <><DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField label="ชื่อพนักงาน" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
      <TextField label="อีเมลสำหรับเข้าสู่ระบบ" type="email" value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })} />
      <TextField label={draft.id ? 'รหัสผ่านใหม่ (เว้นว่างเพื่อใช้รหัสเดิม)' : 'รหัสผ่าน'} type="password" autoComplete="new-password" helperText="อย่างน้อย 10 ตัวอักษร" value={draft.password} onChange={e => setDraft({ ...draft, password: e.target.value })} />
      <TextField select label="บทบาท" value={draft.role} disabled={draft.id === currentId} slotProps={{ inputLabel: { shrink: true }, select: { notched: true } }} onChange={e => setDraft({ ...draft, role: e.target.value as 'admin' | 'staff' })}><MenuItem value="admin">ผู้ดูแลระบบ — ทุกแผนก</MenuItem><MenuItem value="staff">พนักงาน — เฉพาะแผนกที่มอบหมาย</MenuItem></TextField>
      {draft.role === 'staff' && <Box><Typography>แผนกที่รับผิดชอบ (เลือกได้หลายแผนก)</Typography><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>{PRODUCT_STATUSES.map((stage: ProductStatus) => <FormControlLabel key={stage} label={PRODUCT_STATUS_LABELS[stage]} control={<Checkbox checked={draft.departments.includes(stage)} onChange={e => setDraft({ ...draft, departments: e.target.checked ? [...draft.departments, stage] : draft.departments.filter(d => d !== stage) })} />} />)}</Box></Box>}
      <FormControlLabel label="เปิดใช้งานบัญชี" control={<Switch checked={draft.active} disabled={draft.id === currentId} onChange={e => setDraft({ ...draft, active: e.target.checked })} />} />
    </Stack></DialogContent><DialogActions><Button disabled={saving} onClick={() => setDraft(null)}>ยกเลิก</Button><Button variant="contained" disabled={saving} onClick={save}>{saving ? 'กำลังบันทึก…' : 'บันทึก'}</Button></DialogActions></>}</Dialog>
  </Stack>;
}
