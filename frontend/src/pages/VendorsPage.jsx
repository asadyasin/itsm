import { useState } from 'react';
import { Box, Typography, Button, Stack, Card, CardContent, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import { useForm } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { vendorApi } from '../api/endpoints';

export default function VendorsPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['vendors', 'admin-list'], queryFn: () => vendorApi.list().then((r) => r.data.data) });
  const rows = (data || []).map((v) => ({ id: v._id, name: v.name, contactPerson: v.contactPerson || '—', phone: v.phone || '—', email: v.email || '—' }));
  const columns = [
    { field: 'name', headerName: 'Vendor', flex: 1, minWidth: 180 },
    { field: 'contactPerson', headerName: 'Contact', width: 160 },
    { field: 'phone', headerName: 'Phone', width: 140 },
    { field: 'email', headerName: 'Email', width: 200 }
  ];

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  const submit = async (values) => {
    await vendorApi.create(values);
    enqueueSnackbar('Vendor created', { variant: 'success' });
    qc.invalidateQueries({ queryKey: ['vendors'] });
    reset();
    setOpen(false);
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>Vendors</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>New Vendor</Button>
      </Stack>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <DataGrid autoHeight rows={rows} columns={columns} loading={isLoading} sx={{ border: 'none' }} />
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>New Vendor</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Vendor name" error={!!errors.name} {...register('name', { required: true })} autoFocus />
            <TextField label="Contact person" {...register('contactPerson')} />
            <TextField label="Phone" {...register('phone')} />
            <TextField label="Email" {...register('email')} />
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
