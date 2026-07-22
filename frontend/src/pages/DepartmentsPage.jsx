import { useState } from 'react';
import { Box, Typography, Button, Stack, Card, CardContent, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, IconButton } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { departmentApi, userApi, officeApi } from '../api/endpoints';
import { useConfirm } from '../hooks/useConfirm';

export default function DepartmentsPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const { data, isLoading } = useQuery({ queryKey: ['departments'], queryFn: () => departmentApi.list().then((r) => r.data.data) });
  const { data: users } = useQuery({ queryKey: ['users', 'for-manager-select'], queryFn: () => userApi.list({ limit: 100 }).then((r) => r.data.data) });
  const { data: offices } = useQuery({ queryKey: ['offices'], queryFn: () => officeApi.list().then((r) => r.data.data) });

  const rows = (data || []).map((d) => ({
    id: d._id,
    name: d.name,
    code: d.code || '—',
    office: d.office?.name || '—',
    company: d.office?.company?.name || '—',
    manager: d.manager?.name || '—',
    raw: d
  }));

  const handleDelete = async (dept) => {
    const ok = await confirm(`Deactivate department "${dept.name}"?`);
    if (!ok) return;
    await departmentApi.remove(dept._id);
    enqueueSnackbar('Department deactivated', { variant: 'success' });
    qc.invalidateQueries({ queryKey: ['departments'] });
  };

  const columns = [
    { field: 'name', headerName: 'Department', flex: 1, minWidth: 150 },
    { field: 'office', headerName: 'Office', width: 140 },
    { field: 'company', headerName: 'Company', width: 140 },
    { field: 'code', headerName: 'Code', width: 90 },
    { field: 'manager', headerName: 'Manager', width: 150 },
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
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} disabled={!offices?.length}>New Department</Button>
      </Stack>
      {!offices?.length && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Create a Company and at least one Office first, under "Company & Offices".
        </Typography>
      )}

      <Card>
        <CardContent sx={{ p: 0 }}>
          <DataGrid autoHeight rows={rows} columns={columns} loading={isLoading} sx={{ border: 'none' }} />
        </CardContent>
      </Card>

      {open && <DepartmentDialog open={open} users={users} offices={offices} onClose={() => setOpen(false)} onSaved={() => qc.invalidateQueries({ queryKey: ['departments'] })} />}
      {editTarget && <DepartmentDialog open={!!editTarget} department={editTarget} users={users} offices={offices} onClose={() => setEditTarget(null)} onSaved={() => qc.invalidateQueries({ queryKey: ['departments'] })} />}
    </Box>
  );
}

function DepartmentDialog({ open, department, users, offices, onClose, onSaved }) {
  const { enqueueSnackbar } = useSnackbar();
  const isEdit = !!department;
  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm({
    values: isEdit
      ? { name: department.name, code: department.code || '', office: department.office?._id || department.office || '', manager: department.manager?._id || '' }
      : undefined
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
          <Controller
            name="office"
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <TextField {...field} select label="Office" error={!!errors.office} fullWidth>
                {(offices || []).map((o) => (
                  <MenuItem key={o._id} value={o._id}>{o.name} ({o.company?.name})</MenuItem>
                ))}
              </TextField>
            )}
          />
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
