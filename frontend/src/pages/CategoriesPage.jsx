import { useState } from 'react';
import { Box, Typography, Button, Stack, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Card, CardContent, IconButton } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useForm } from 'react-hook-form';
import { useSnackbar } from 'notistack';
import { useQueryClient } from '@tanstack/react-query';
import { useCategories } from '../hooks/useInventory';
import { categoryApi } from '../api/endpoints';
import { useConfirm } from '../hooks/useConfirm';

export default function CategoriesPage() {
  const { data, isLoading } = useCategories();
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const rows = (data || []).map((c) => ({ id: c._id, name: c.name, threshold: c.lowStockThreshold, description: c.description, raw: c }));

  const handleDelete = async (category) => {
    const ok = await confirm(`Deactivate category "${category.name}"? It will no longer be selectable for new purchases/tickets.`);
    if (!ok) return;
    await categoryApi.remove(category._id);
    enqueueSnackbar('Category deactivated', { variant: 'success' });
    qc.invalidateQueries({ queryKey: ['categories'] });
  };

  const columns = [
    { field: 'name', headerName: 'Category', width: 200 },
    { field: 'description', headerName: 'Description', flex: 1, minWidth: 200 },
    { field: 'threshold', headerName: 'Low Stock Threshold', width: 180 },
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
        <Typography variant="h5" fontWeight={700}>Item Categories</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>New Category</Button>
      </Stack>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <DataGrid autoHeight rows={rows} columns={columns} loading={isLoading} sx={{ border: 'none' }} />
        </CardContent>
      </Card>

      <CategoryDialog open={open} onClose={() => setOpen(false)} onSaved={() => qc.invalidateQueries({ queryKey: ['categories'] })} />
      <CategoryDialog open={!!editTarget} category={editTarget} onClose={() => setEditTarget(null)} onSaved={() => qc.invalidateQueries({ queryKey: ['categories'] })} />
    </Box>
  );
}

function CategoryDialog({ open, category, onClose, onSaved }) {
  const { enqueueSnackbar } = useSnackbar();
  const isEdit = !!category;
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    values: isEdit ? { name: category.name, description: category.description || '', lowStockThreshold: category.lowStockThreshold } : { lowStockThreshold: 5 }
  });

  const submit = async (values) => {
    const payload = { ...values, lowStockThreshold: Number(values.lowStockThreshold) || 5 };
    if (isEdit) {
      await categoryApi.update(category._id, payload);
      enqueueSnackbar('Category updated', { variant: 'success' });
    } else {
      await categoryApi.create(payload);
      enqueueSnackbar('Category created', { variant: 'success' });
    }
    reset();
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{isEdit ? 'Edit Item Category' : 'New Item Category'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Category name" error={!!errors.name} {...register('name', { required: true })} autoFocus />
          <TextField label="Description" multiline rows={2} {...register('description')} />
          <TextField label="Low stock threshold" type="number" {...register('lowStockThreshold')} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit(submit)} disabled={isSubmitting}>{isEdit ? 'Save Changes' : 'Create'}</Button>
      </DialogActions>
    </Dialog>
  );
}
