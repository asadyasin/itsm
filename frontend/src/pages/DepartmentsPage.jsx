import { useState } from 'react';
import { Box, Typography, Button, Stack, Card, CardContent, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, IconButton } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { departmentApi, userApi } from '../api/endpoints';
import { useConfirm } from '../hooks/useConfirm';

export default function DepartmentsPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const { data, isLoading } = useQuery({ queryKey: ['departments'], queryFn: () => departmentApi.list().then((r) => r.data.data) });
  const { data: users } = useQuery({ queryKey: ['users', 'for-manager-select'], queryFn: () => userApi.list({ limit: 100 }).then((r) => r.data.data) });

  const rows = (data || []).map((d) => ({ id: d._id, name: d.name, code: d.code || '—', manager: d.manager?.name || '—', raw: d }));

  const handleDelete = async (dept) => {
    const ok = await confirm(`Deactivate department "${dept.name}"?`);
    if (!ok) return;
    await departmentApi.remove(dept._id);
    enqueueSnackbar('Department deactivated', { variant: 'success' });
    qc.invalidateQueries({ queryKey: ['departments'] });
  };

  const columns = [
    { field: 'name', headerName: 'Department', flex: 1, minWidth: 180 },
    { field: 'code', headerName: 'Code', width: 100 },
    { field: 'manager', headerName: 'Manager', width: 180 },
    {
      field: 'actions', headerName: '', width: 100, sortable: false,
      renderCell: (params) => (
        <Stack direction="row">
          <IconButton size="small" onClick={() => setEditTarget(params.row.raw)}><EditOutlinedIcon fontSize="small" /></IconButton>
          <IconButton size="small" color="error" onClick={() => handleDelete(params.row.raw)}><DeleteOutlineIcon fontSize="small" /></IconButton>
        </Stack>
      )
    }
  ];

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>Departments</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>New Department</Button>
      </Stack>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <DataGrid autoHeight rows={rows} columns={columns} loading={isLoading} sx={{ border: 'none' }} />
        </CardContent>
      </Card>

      <DepartmentDialog open={open} users={users} onClose={() => setOpen(false)} onSaved={() => qc.invalidateQueries({ queryKey: ['departments'] })} />
      <DepartmentDialog open={!!editTarget} department={editTarget} users={users} onClose={() => setEditTarget(null)} onSaved={() => qc.invalidateQueries({ queryKey: ['departments'] })} />
    </Box>
  );
}

function DepartmentDialog({ open, department, users, onClose, onSaved }) {
  const { enqueueSnackbar } = useSnackbar();
  const isEdit = !!department;
  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm({
    values: isEdit ? { name: department.name, code: department.code || '', manager: department.manager?._id || '' } : undefined
  });

  const submit = async (values) => {
    const payload = { ...values, manager: values.manager || null };
    if (isEdit) {
      await departmentApi.update(department._id, payload);
      enqueueSnackbar('Department updated', { variant: 'success' });
    } else {
      await departmentApi.create(payload);
      enqueueSnackbar('Department created', { variant: 'success' });
    }
    reset();
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{isEdit ? 'Edit Department' : 'New Department'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Department name" error={!!errors.name} {...register('name', { required: true })} autoFocus />
          <TextField label="Code" {...register('code')} />
          <Controller
            name="manager"
            control={control}
            render={({ field }) => (
              <TextField {...field} select label="Manager (optional)" value={field.value || ''}>
                <MenuItem value="">None</MenuItem>
                {(users || []).filter((u) => u.role === 'manager').map((u) => <MenuItem key={u._id} value={u._id}>{u.name}</MenuItem>)}
              </TextField>
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit(submit)} disabled={isSubmitting}>{isEdit ? 'Save Changes' : 'Create'}</Button>
      </DialogActions>
    </Dialog>
  );
}
