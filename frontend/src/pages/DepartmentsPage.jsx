import { useState } from 'react';
import { Box, Typography, Button, Stack, Card, CardContent, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { departmentApi, userApi } from '../api/endpoints';

export default function DepartmentsPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['departments'], queryFn: () => departmentApi.list().then((r) => r.data.data) });
  const { data: users } = useQuery({ queryKey: ['users', 'for-manager-select'], queryFn: () => userApi.list({ limit: 100 }).then((r) => r.data.data) });

  const rows = (data || []).map((d) => ({ id: d._id, name: d.name, code: d.code || '—', manager: d.manager?.name || '—' }));
  const columns = [
    { field: 'name', headerName: 'Department', flex: 1, minWidth: 180 },
    { field: 'code', headerName: 'Code', width: 100 },
    { field: 'manager', headerName: 'Manager', width: 180 }
  ];

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm();

  const submit = async (values) => {
    await departmentApi.create(values);
    enqueueSnackbar('Department created', { variant: 'success' });
    qc.invalidateQueries({ queryKey: ['departments'] });
    reset();
    setOpen(false);
  };

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

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>New Department</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Department name" error={!!errors.name} {...register('name', { required: true })} autoFocus />
            <TextField label="Code" {...register('code')} />
            <Controller
              name="manager"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Manager (optional)">
                  <MenuItem value="">None</MenuItem>
                  {(users || []).filter((u) => u.role === 'manager').map((u) => <MenuItem key={u._id} value={u._id}>{u.name}</MenuItem>)}
                </TextField>
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit(submit)} disabled={isSubmitting}>Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
