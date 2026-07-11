import { useState } from 'react';
import { Box, Typography, Button, Stack, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Card, CardContent } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import { useForm } from 'react-hook-form';
import { useSnackbar } from 'notistack';
import { useCategories } from '../hooks/useInventory';
import { categoryApi } from '../api/endpoints';
import { useQueryClient } from '@tanstack/react-query';

export default function CategoriesPage() {
  const { data, isLoading } = useCategories();
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  const rows = (data || []).map((c) => ({ id: c._id, name: c.name, threshold: c.lowStockThreshold, description: c.description }));
  const columns = [
    { field: 'name', headerName: 'Category', width: 200 },
    { field: 'description', headerName: 'Description', flex: 1, minWidth: 200 },
    { field: 'threshold', headerName: 'Low Stock Threshold', width: 180 }
  ];

  const submit = async (values) => {
    await categoryApi.create({ ...values, lowStockThreshold: Number(values.lowStockThreshold) || 5 });
    enqueueSnackbar('Category created', { variant: 'success' });
    qc.invalidateQueries({ queryKey: ['categories'] });
    reset();
    setOpen(false);
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>Item Categories</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>New Category</Button>
      </Stack>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <DataGrid autoHeight rows={rows} columns={columns} loading={isLoading} sx={{ border: 'none' }} />
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>New Item Category</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Category name" error={!!errors.name} {...register('name', { required: true })} autoFocus />
            <TextField label="Description" multiline rows={2} {...register('description')} />
            <TextField label="Low stock threshold" type="number" defaultValue={5} {...register('lowStockThreshold')} />
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
