import { useState } from 'react';
import {
  Box, Typography, Button, Stack, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Autocomplete, Card, CardContent, IconButton
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useSnackbar } from 'notistack';
import { usePurchases, useCategories, useVendors } from '../hooks/useInventory';
import { purchaseApi, inventoryApi } from '../api/endpoints';
import dayjs from '../utils/dayjs';

export default function PurchasesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [unitsTarget, setUnitsTarget] = useState(null);
  const { data, isLoading, refetch } = usePurchases({ limit: 50 });

  const rows = (data?.data || []).map((p) => ({
    id: p._id,
    date: dayjs(p.purchaseDate).format('DD MMM YYYY'),
    category: p.itemCategory?.name,
    brand: p.brand,
    model: p.model,
    quantity: p.quantity,
    vendor: p.vendor?.name,
    invoiceNo: p.invoiceNo,
    raw: p
  }));

  const columns = [
    { field: 'date', headerName: 'Purchase Date', width: 130 },
    { field: 'category', headerName: 'Category', width: 130 },
    { field: 'brand', headerName: 'Brand', width: 110 },
    { field: 'model', headerName: 'Model', width: 120 },
    { field: 'quantity', headerName: 'Qty', width: 80 },
    { field: 'vendor', headerName: 'Vendor', width: 150 },
    { field: 'invoiceNo', headerName: 'Invoice #', width: 120 },
    {
      field: 'actions', headerName: 'Serials', width: 140, sortable: false,
      renderCell: (params) => (
        <Button size="small" startIcon={<PlaylistAddIcon />} onClick={() => setUnitsTarget(params.row.raw)}>
          Add Units
        </Button>
      )
    }
  ];

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>Purchases</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>Record Purchase</Button>
      </Stack>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <DataGrid autoHeight rows={rows} columns={columns} loading={isLoading} sx={{ border: 'none' }} pageSizeOptions={[10, 20, 50]} />
        </CardContent>
      </Card>

      <CreatePurchaseDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={refetch} />
      <AddUnitsDialog purchase={unitsTarget} onClose={() => setUnitsTarget(null)} onDone={refetch} />
    </Box>
  );
}

function CreatePurchaseDialog({ open, onClose, onCreated }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data: categories } = useCategories();
  const { data: vendors } = useVendors();
  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm();

  const submit = async (values) => {
    await purchaseApi.create(values);
    enqueueSnackbar('Purchase recorded', { variant: 'success' });
    reset();
    onCreated();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Record Purchase</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Controller
            name="itemCategory"
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <TextField {...field} select label="Item Category" error={!!errors.itemCategory} fullWidth>
                {(categories || []).map((c) => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
              </TextField>
            )}
          />
          <Controller
            name="vendor"
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <TextField {...field} select label="Vendor" error={!!errors.vendor} fullWidth>
                {(vendors || []).map((v) => <MenuItem key={v._id} value={v._id}>{v.name}</MenuItem>)}
              </TextField>
            )}
          />
          <Stack direction="row" spacing={2}>
            <TextField label="Brand" fullWidth {...register('brand')} />
            <TextField label="Model" fullWidth {...register('model')} />
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField label="Quantity" type="number" fullWidth {...register('quantity', { required: true, valueAsNumber: true, min: 1 })} error={!!errors.quantity} />
            <TextField label="Invoice No." fullWidth {...register('invoiceNo')} />
          </Stack>
          <TextField label="Description" fullWidth multiline rows={2} {...register('description')} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit(submit)} disabled={isSubmitting}>Save Purchase</Button>
      </DialogActions>
    </Dialog>
  );
}

function AddUnitsDialog({ purchase, onClose, onDone }) {
  const { enqueueSnackbar } = useSnackbar();
  const { control, handleSubmit, reset } = useForm({ defaultValues: { units: [{ serialNumber: '', assetTag: '' }] } });
  const { fields, append, remove } = useFieldArray({ control, name: 'units' });

  const submit = async (values) => {
    await inventoryApi.createUnits({ purchaseId: purchase._id, units: values.units.filter((u) => u.serialNumber) });
    enqueueSnackbar('Serial numbers registered', { variant: 'success' });
    reset({ units: [{ serialNumber: '', assetTag: '' }] });
    onDone();
    onClose();
  };

  return (
    <Dialog open={!!purchase} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Register Serial Numbers {purchase ? `— ${purchase.brand || ''} ${purchase.model || ''}` : ''}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          {fields.map((field, index) => (
            <Stack direction="row" spacing={1} key={field.id} alignItems="center">
              <Controller
                name={`units.${index}.serialNumber`}
                control={control}
                render={({ field }) => <TextField {...field} label="Serial Number" size="small" fullWidth />}
              />
              <Controller
                name={`units.${index}.assetTag`}
                control={control}
                render={({ field }) => <TextField {...field} label="Asset Tag (optional)" size="small" fullWidth />}
              />
              <IconButton onClick={() => remove(index)} disabled={fields.length === 1}><DeleteOutlineIcon fontSize="small" /></IconButton>
            </Stack>
          ))}
          <Button startIcon={<AddIcon />} onClick={() => append({ serialNumber: '', assetTag: '' })} sx={{ alignSelf: 'flex-start' }}>
            Add another
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit(submit)}>Register Units</Button>
      </DialogActions>
    </Dialog>
  );
}
