import { useMemo, useState } from 'react';
import { Box, Typography, Button, TextField, MenuItem, Stack, Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete, Checkbox, FormControlLabel } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useInventoryItems, useCategories, useInventoryActions } from '../hooks/useInventory';
import { useAuth } from '../contexts/AuthContext';
import { StatusChip } from '../components/StatusChips';
import { inventoryApi, userApi } from '../api/endpoints';
import { useQuery } from '@tanstack/react-query';

const STATUS_OPTIONS = ['Available', 'Issued', 'Repair', 'Lost', 'Scrapped', 'Reserved'];

export default function InventoryListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [filters, setFilters] = useState({ status: '', itemCategory: '', search: '' });
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueTarget, setIssueTarget] = useState(null);

  const params = useMemo(() => {
    const p = {};
    if (filters.status) p.status = filters.status;
    if (filters.itemCategory) p.itemCategory = filters.itemCategory;
    if (filters.search) p.search = filters.search;
    return p;
  }, [filters]);

  const { data, isLoading, refetch } = useInventoryItems(params);
  const { data: categories } = useCategories();

  const rows = (data?.data || []).map((item) => ({
    id: item._id,
    serialNumber: item.serialNumber,
    category: item.itemCategory?.name,
    brand: item.brand,
    model: item.model,
    status: item.status,
    issuedTo: item.currentUser?.name || '—',
    vendor: item.purchase?.vendor?.name || '—'
  }));

  const columns = [
    { field: 'serialNumber', headerName: 'Serial Number', flex: 1, minWidth: 140 },
    { field: 'category', headerName: 'Category', flex: 0.8, minWidth: 120 },
    { field: 'brand', headerName: 'Brand', flex: 0.7, minWidth: 100 },
    { field: 'model', headerName: 'Model', flex: 0.8, minWidth: 120 },
    { field: 'status', headerName: 'Status', flex: 0.7, minWidth: 120, renderCell: (params) => <StatusChip status={params.value} /> },
    { field: 'issuedTo', headerName: 'Issued To', flex: 0.9, minWidth: 140 },
    { field: 'vendor', headerName: 'Vendor', flex: 0.8, minWidth: 120 }
  ];

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>Inventory</Typography>
        {user?.role === 'admin' && (
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<FileDownloadIcon />} href={inventoryApi.bulkExportUrl('xlsx')} target="_blank">
              Export
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setIssueOpen(true)}>
              Issue Item
            </Button>
          </Stack>
        )}
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          size="small"
          label="Search"
          placeholder="Serial, brand, model..."
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          sx={{ minWidth: 220 }}
        />
        <TextField
          size="small"
          select
          label="Status"
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All</MenuItem>
          {STATUS_OPTIONS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
        <TextField
          size="small"
          select
          label="Category"
          value={filters.itemCategory}
          onChange={(e) => setFilters((f) => ({ ...f, itemCategory: e.target.value }))}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All</MenuItem>
          {(categories || []).map((c) => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
        </TextField>
      </Stack>

      <Box sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
        <DataGrid
          autoHeight
          rows={rows}
          columns={columns}
          loading={isLoading}
          onRowClick={(p) => navigate(`/inventory/${p.id}`)}
          pageSizeOptions={[10, 20, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 20 } } }}
          sx={{ cursor: 'pointer', border: 'none' }}
        />
      </Box>

      <IssueDialog
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        onIssued={() => { refetch(); enqueueSnackbar('Item issued successfully', { variant: 'success' }); }}
      />
    </Box>
  );
}

function IssueDialog({ open, onClose, onIssued }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [sendEmail, setSendEmail] = useState(true);
  const { issue } = useInventoryActions();

  const { data: availableItems } = useQuery({
    queryKey: ['available-items'],
    queryFn: () => inventoryApi.list({ status: 'Available', limit: 100 }).then((r) => r.data.data),
    enabled: open
  });
  const { data: users } = useQuery({
    queryKey: ['users-for-issue'],
    queryFn: () => userApi.list({ limit: 100 }).then((r) => r.data.data),
    enabled: open
  });

  const handleSubmit = async () => {
    if (!selectedItem || !selectedUser) return;
    await issue.mutateAsync({ itemId: selectedItem._id, userId: selectedUser._id, sendEmail });
    onIssued();
    onClose();
    setSelectedItem(null);
    setSelectedUser(null);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Issue Inventory Item</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Autocomplete
            options={availableItems || []}
            getOptionLabel={(o) => `${o.serialNumber} — ${o.brand || ''} ${o.model || ''}`}
            value={selectedItem}
            onChange={(e, val) => setSelectedItem(val)}
            renderInput={(params) => <TextField {...params} label="Available item" />}
          />
          <Autocomplete
            options={users || []}
            getOptionLabel={(o) => `${o.name} (${o.email})`}
            value={selectedUser}
            onChange={(e, val) => setSelectedUser(val)}
            renderInput={(params) => <TextField {...params} label="Issue to user" />}
          />
          <FormControlLabel
            control={<Checkbox checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />}
            label="Send email notification"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={issue.isPending}>
          {issue.isPending ? 'Issuing…' : 'Issue Item'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
