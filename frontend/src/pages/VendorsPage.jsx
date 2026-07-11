import { useState } from 'react';
import { Box, Typography, Button, Stack, Card, CardContent, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useForm } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { vendorApi } from '../api/endpoints';
import { useConfirm } from '../hooks/useConfirm';

export default function VendorsPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const { data, isLoading } = useQuery({ queryKey: ['vendors', 'admin-list'], queryFn: () => vendorApi.list().then((r) => r.data.data) });
  const rows = (data || []).map((v) => ({ id: v._id, name: v.name, contactPerson: v.contactPerson || '—', phone: v.phone || '—', email: v.email || '—', raw: v }));

  const handleDelete = async (vendor) => {
    const ok = await confirm(`Deactivate vendor "${vendor.name}"?`);
    if (!ok) return;
    await vendorApi.remove(vendor._id);
    enqueueSnackbar('Vendor deactivated', { variant: 'success' });
    qc.invalidateQueries({ queryKey: ['vendors'] });
  };

  const columns = [
    { field: 'name', headerName: 'Vendor', flex: 1, minWidth: 180 },
    { field: 'contactPerson', headerName: 'Contact', width: 160 },
    { field: 'phone', headerName: 'Phone', width: 140 },
    { field: 'email', headerName: 'Email', width: 200 },
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
        <Typography variant="h5" fontWeight={700}>Vendors</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>New Vendor</Button>
      </Stack>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <DataGrid autoHeight rows={rows} columns={columns} loading={isLoading} sx={{ border: 'none' }} />
        </CardContent>
      </Card>

      <VendorDialog open={open} onClose={() => setOpen(false)} onSaved={() => qc.invalidateQueries({ queryKey: ['vendors'] })} />
      <VendorDialog open={!!editTarget} vendor={editTarget} onClose={() => setEditTarget(null)} onSaved={() => qc.invalidateQueries({ queryKey: ['vendors'] })} />
    </Box>
  );
}

function VendorDialog({ open, vendor, onClose, onSaved }) {
  const { enqueueSnackbar } = useSnackbar();
  const isEdit = !!vendor;
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    values: isEdit ? { name: vendor.name, contactPerson: vendor.contactPerson || '', phone: vendor.phone || '', email: vendor.email || '' } : undefined
  });

  const submit = async (values) => {
    if (isEdit) {
      await vendorApi.update(vendor._id, values);
      enqueueSnackbar('Vendor updated', { variant: 'success' });
    } else {
      await vendorApi.create(values);
      enqueueSnackbar('Vendor created', { variant: 'success' });
    }
    reset();
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{isEdit ? 'Edit Vendor' : 'New Vendor'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Vendor name" error={!!errors.name} {...register('name', { required: true })} autoFocus />
          <TextField label="Contact person" {...register('contactPerson')} />
          <TextField label="Phone" {...register('phone')} />
          <TextField label="Email" {...register('email')} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit(submit)} disabled={isSubmitting}>{isEdit ? 'Save Changes' : 'Create'}</Button>
      </DialogActions>
    </Dialog>
  );
}
