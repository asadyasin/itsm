import { useState } from 'react';
import {
  Box, Typography, Button, Stack, Card, CardContent, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Switch, FormControlLabel, Alert
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import LockResetIcon from '@mui/icons-material/LockReset';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { userApi, departmentApi } from '../api/endpoints';

export default function UsersPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [open, setOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState(null);

  const { data, isLoading } = useQuery({ queryKey: ['users', 'admin-list'], queryFn: () => userApi.list({ limit: 100 }).then((r) => r.data.data) });
  const { data: departments } = useQuery({ queryKey: ['departments'], queryFn: () => departmentApi.list().then((r) => r.data.data) });

  const rows = (data || []).map((u) => ({
    id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    department: u.department?.name || '—',
    isActive: u.isActive
  }));

  const toggleActive = async (id) => {
    await userApi.toggleActive(id);
    qc.invalidateQueries({ queryKey: ['users'] });
  };

  const resetPassword = async (id) => {
    const { data } = await userApi.resetPassword(id);
    setTempPassword(data.data.tempPassword);
  };

  const columns = [
    { field: 'name', headerName: 'Name', width: 170 },
    { field: 'email', headerName: 'Email', width: 220 },
    { field: 'role', headerName: 'Role', width: 110 },
    { field: 'department', headerName: 'Department', width: 160 },
    {
      field: 'isActive', headerName: 'Active', width: 100,
      renderCell: (p) => <Switch size="small" checked={p.value} onChange={() => toggleActive(p.row.id)} onClick={(e) => e.stopPropagation()} />
    },
    {
      field: 'actions', headerName: '', width: 60, sortable: false,
      renderCell: (p) => (
        <Button size="small" onClick={(e) => { e.stopPropagation(); resetPassword(p.row.id); }} title="Reset password">
          <LockResetIcon fontSize="small" />
        </Button>
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

      <CreateUserDialog open={open} onClose={() => setOpen(false)} departments={departments} onCreated={() => qc.invalidateQueries({ queryKey: ['users'] })} />
    </Box>
  );
}

function CreateUserDialog({ open, onClose, departments, onCreated }) {
  const { enqueueSnackbar } = useSnackbar();
  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm({ defaultValues: { role: 'user' } });

  const submit = async (values) => {
    await userApi.create(values);
    enqueueSnackbar('User created', { variant: 'success' });
    reset();
    onCreated();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add User</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Full name" error={!!errors.name} {...register('name', { required: true })} />
          <TextField label="Email" error={!!errors.email} {...register('email', { required: true })} />
          <TextField label="Temporary password" error={!!errors.password} {...register('password', { required: true, minLength: 8 })} helperText="Minimum 8 characters" />
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
              <TextField {...field} select label="Department">
                {(departments || []).map((d) => <MenuItem key={d._id} value={d._id}>{d.name}</MenuItem>)}
              </TextField>
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit(submit)} disabled={isSubmitting}>Create User</Button>
      </DialogActions>
    </Dialog>
  );
}
