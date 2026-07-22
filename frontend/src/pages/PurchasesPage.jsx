import { useState } from 'react';
import {
  Box, Typography, Button, Stack, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Autocomplete, Card, CardContent, IconButton
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useConfirm } from '../hooks/useConfirm';
import { usePurchases, useCategories, useVendors } from '../hooks/useInventory';
import { purchaseApi, inventoryApi, officeApi } from '../api/endpoints';
import dayjs from '../utils/dayjs';

export default function PurchasesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [unitsTarget, setUnitsTarget] = useState(null);
  const { data, isLoading, refetch } = usePurchases({ limit: 50 });
  const { enqueueSnackbar } = useSnackbar();
  const confirm = useConfirm();

  const rows = (data?.data || []).map((p) => ({
    id: p._id,
    date: dayjs(p.purchaseDate).format('DD MMM YYYY'),
    category: p.itemCategory?.name,
    brand: p.brand,
    model: p.model,
    quantity: p.quantity,
    vendor: p.vendor?.name,
    office: p.office?.name || '—',
    invoiceNo: p.invoiceNo,
    raw: p
  }));

  const handleDelete = async (purchase) => {
    const ok = await confirm(`Remove purchase record for ${purchase.brand || ''} ${purchase.model || ''}? Any serial numbers already registered will be unaffected.`);
    if (!ok) return;
    await purchaseApi.remove(purchase._id);
    enqueueSnackbar('Purchase record removed', { variant: 'success' });
    refetch();
  };

  const columns = [
    { field: 'date', headerName: 'Purchase Date', width: 130 },
    { field: 'category', headerName: 'Category', width: 130 },
    { field: 'brand', headerName: 'Brand', width: 110 },
    { field: 'model', headerName: 'Model', width: 120 },
    { field: 'quantity', headerName: 'Qty', width: 80 },
    { field: 'vendor', headerName: 'Vendor', width: 150 },
    { field: 'office', headerName: 'Office', width: 130 },
    { field: 'invoiceNo', headerName: 'Invoice #', width: 120 },
    {
      field: 'serials', headerName: 'Serials', width: 130, sortable: false,
      renderCell: (params) => (
        <Button size="small" startIcon={<PlaylistAddIcon />} onClick={() => setUnitsTarget(params.row.raw)}>
          Add Units
        </Button>
      )
    },
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
        <Typography variant="h5" fontWeight={700}>Purchases</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>Record Purchase</Button>
      </Stack>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <DataGrid autoHeight rows={rows} columns={columns} loading={isLoading} sx={{ border: 'none' }} pageSizeOptions={[10, 20, 50]} />
        </CardContent>
      </Card>

      {createOpen && <CreatePurchaseDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={refetch} />}
      {editTarget && <CreatePurchaseDialog open={!!editTarget} purchase={editTarget} onClose={() => setEditTarget(null)} onCreated={refetch} />}
      {unitsTarget && <AddUnitsDialog purchase={unitsTarget} onClose={() => setUnitsTarget(null)} onDone={refetch} />}
    </Box>
  );
}

function CreatePurchaseDialog({ open, purchase, onClose, onCreated }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data: categories } = useCategories();
  const { data: vendors } = useVendors();
  const { data: offices } = useQuery({ queryKey: ['offices'], queryFn: () => officeApi.list().then((r) => r.data.data) });
  const isEdit = !!purchase;
  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm({
    values: isEdit
      ? {
          itemCategory: purchase.itemCategory?._id || purchase.itemCategory,
          vendor: purchase.vendor?._id || purchase.vendor,
          office: purchase.office?._id || purchase.office,
          brand: purchase.brand || '',
          model: purchase.model || '',
          quantity: purchase.quantity,
          invoiceNo: purchase.invoiceNo || '',
          description: purchase.description || ''
        }
      : undefined
  });

  const submit = async (values) => {
    if (isEdit) {
      await purchaseApi.update(purchase._id, values);
      enqueueSnackbar('Purchase updated', { variant: 'success' });
    } else {
      await purchaseApi.create(values);
      enqueueSnackbar('Purchase recorded', { variant: 'success' });
    }
    reset();
    onCreated();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? 'Edit Purchase' : 'Record Purchase'}</DialogTitle>
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
          <Controller
            name="office"
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <TextField {...field} select label="Office (stock location)" error={!!errors.office} fullWidth helperText="Serial numbers registered under this purchase inherit this office's location automatically">
                {(offices || []).map((o) => <MenuItem key={o._id} value={o._id}>{o.name} ({o.location})</MenuItem>)}
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
  const { control, handleSubmit, reset } = useForm({ defaultValues: { units: [{ serialNumber: '', assetTag: '', warrantyExpiry: '' }] } });
  const { fields, append, remove } = useFieldArray({ control, name: 'units' });

  const submit = async (values) => {
    await inventoryApi.createUnits({ purchaseId: purchase._id, units: values.units.filter((u) => u.serialNumber) });
    enqueueSnackbar('Serial numbers registered', { variant: 'success' });
    reset({ units: [{ serialNumber: '', assetTag: '', warrantyExpiry: '' }] });
    onDone();
    onClose();
  };

  return (
    <Dialog open={!!purchase} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Register Serial Numbers {purchase ? `— ${purchase.brand || ''} ${purchase.model || ''}` : ''}</DialogTitle>
      <DialogContent>
        {purchase?.office && (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
            Location will be set automatically to <b>{purchase.office.name} ({purchase.office.location})</b>.
          </Typography>
        )}
        <Stack spacing={2} sx={{ mt: 1 }}>
          {fields.map((field, index) => (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} key={field.id} alignItems={{ sm: 'center' }}>
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
              <Controller
                name={`units.${index}.warrantyExpiry`}
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="Warranty Expiry" type="date" size="small" fullWidth InputLabelProps={{ shrink: true }} />
                )}
              />
              <IconButton onClick={() => remove(index)} disabled={fields.length === 1}><DeleteOutlineIcon fontSize="small" /></IconButton>
            </Stack>
          ))}
          <Button startIcon={<AddIcon />} onClick={() => append({ serialNumber: '', assetTag: '', warrantyExpiry: '' })} sx={{ alignSelf: 'flex-start' }}>
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
