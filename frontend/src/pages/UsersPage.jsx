import { useState } from 'react';
import {
  Box, Typography, Button, Stack, Card, CardContent, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Switch, Alert, IconButton, Chip
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LockResetIcon from '@mui/icons-material/LockReset';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { userApi, departmentApi } from '../api/endpoints';
import { useConfirm } from '../hooks/useConfirm';

export default function UsersPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [tempPassword, setTempPassword] = useState(null);

  const { data, isLoading } = useQuery({ queryKey: ['users', 'admin-list'], queryFn: () => userApi.list({ limit: 100 }).then((r) => r.data.data) });
  const { data: departments } = useQuery({ queryKey: ['departments'], queryFn: () => departmentApi.list().then((r) => r.data.data) });

  const rows = (data || []).map((u) => ({
    id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    department: u.department?.name || '—',
    isActive: u.isActive,
    authProvider: u.authProvider || 'local',
    raw: u
  }));

  const invalidateUsers = () => qc.invalidateQueries({ queryKey: ['users'] });

  const toggleActive = async (id) => {
    await userApi.toggleActive(id);
    invalidateUsers();
  };

  const resetPassword = async (id) => {
    const { data } = await userApi.resetPassword(id);
    setTempPassword(data.data.tempPassword);
  };

  const handleDelete = async (user) => {
    const ok = await confirm(`Deactivate and remove "${user.name}"? They will no longer be able to log in.`);
    if (!ok) return;
    await userApi.remove(user._id);
    enqueueSnackbar('User removed', { variant: 'success' });
    invalidateUsers();
  };

  const columns = [
    { field: 'name', headerName: 'Name', width: 170 },
    { field: 'email', headerName: 'Email', width: 220 },
    { field: 'role', headerName: 'Role', width: 110 },
    { field: 'department', headerName: 'Department', width: 160 },
    {
      field: 'authProvider', headerName: 'Sign-in', width: 100,
      renderCell: (p) => <Chip size="small" label={p.value === 'google' ? 'Google' : 'Local'} color={p.value === 'google' ? 'info' : 'default'} variant="outlined" />
    },
    {
      field: 'isActive', headerName: 'Active', width: 90,
      renderCell: (p) => <Switch size="small" checked={p.value} onChange={() => toggleActive(p.row.id)} onClick={(e) => e.stopPropagation()} />
    },
    {
      field: 'actions', headerName: '', width: 140, sortable: false,
      renderCell: (p) => (
        <Stack direction="row">
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditTarget(p.row.raw); }} title="Edit user">
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); resetPassword(p.row.id); }} title="Reset password">
            <LockResetIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); handleDelete(p.row.raw); }} title="Remove user">
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Stack>
      )
    }
  ];

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>Users</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>Add User</Button>
      </Stack>

      {tempPassword && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setTempPassword(null)}>
          Temporary password: <b>{tempPassword}</b> — share this securely with the user.
        </Alert>
      )}

      <Card>
        <CardContent sx={{ p: 0 }}>
          <DataGrid autoHeight rows={rows} columns={columns} loading={isLoading} sx={{ border: 'none' }} />
        </CardContent>
      </Card>

      {open && <UserDialog open={open} departments={departments} onClose={() => setOpen(false)} onSaved={invalidateUsers} />}
      {editTarget && <UserDialog open={!!editTarget} user={editTarget} departments={departments} onClose={() => setEditTarget(null)} onSaved={invalidateUsers} />}
    </Box>
  );
}

function UserDialog({ open, user, departments, onClose, onSaved }) {
  const { enqueueSnackbar } = useSnackbar();
  const isEdit = !!user;
  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm({
    values: isEdit
      ? { name: user.name, email: user.email, role: user.role, department: user.department?._id || '' }
      : { role: 'user' }
  });

  const submit = async (values) => {
    if (isEdit) {
      const { name, email, role, department } = values;
      await userApi.update(user._id, { name, email, role, department: department || null });
      enqueueSnackbar('User updated', { variant: 'success' });
    } else {
      await userApi.create(values);
      enqueueSnackbar('User created', { variant: 'success' });
    }
    reset();
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? `Edit ${user?.name}` : 'Add User'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Full name" error={!!errors.name} {...register('name', { required: true })} />
          <TextField label="Email" error={!!errors.email} {...register('email', { required: true })} />
          {!isEdit && (
            <TextField label="Temporary password" error={!!errors.password} {...register('password', { required: true, minLength: 8 })} helperText="Minimum 8 characters" />
          )}
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <TextField {...field} select label="Role">
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="manager">Manager</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </TextField>
            )}
          />
          <Controller
            name="department"
            control={control}
            render={({ field }) => (
              <TextField {...field} select label="Department" value={field.value || ''}>
                <MenuItem value="">None</MenuItem>
                {(departments || []).map((d) => <MenuItem key={d._id} value={d._id}>{d.name}</MenuItem>)}
              </TextField>
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit(submit)} disabled={isSubmitting}>{isEdit ? 'Save Changes' : 'Create User'}</Button>
      </DialogActions>
    </Dialog>
  );
}
