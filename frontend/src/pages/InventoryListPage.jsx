import { useMemo, useState } from 'react';
import { Box, Typography, Button, TextField, MenuItem, Stack, Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete, Checkbox, FormControlLabel } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useInventoryItems, useCategories, useInventoryActions } from '../hooks/useInventory';
import { useAuth } from '../contexts/AuthContext';
import { StatusChip } from '../components/StatusChips';
import { inventoryApi, ticketApi } from '../api/endpoints';
import { downloadAuthenticated } from '../utils/download';
import { useQuery } from '@tanstack/react-query';

const STATUS_OPTIONS = ['Available', 'Issued', 'Repair', 'Lost', 'Scrapped', 'Reserved'];

export default function InventoryListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({ status: searchParams.get('status') || '', itemCategory: '', search: '' });
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueTarget, setIssueTarget] = useState(null);
  const [exporting, setExporting] = useState(false);

  const params = useMemo(() => {
    const p = {};
    if (filters.status) p.status = filters.status;
    if (filters.itemCategory) p.itemCategory = filters.itemCategory;
    if (filters.search) p.search = filters.search;
    return p;
  }, [filters]);

  const { data, isLoading, refetch } = useInventoryItems(params);
  const { data: categories } = useCategories();

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadAuthenticated(inventoryApi.bulkExport('xlsx'), 'inventory-export.xlsx');
    } catch (err) {
      enqueueSnackbar('Failed to export inventory', { variant: 'error' });
    } finally {
      setExporting(false);
    }
  };

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
            <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={handleExport} disabled={exporting}>
              {exporting ? 'Exporting…' : 'Export'}
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
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [sendEmail, setSendEmail] = useState(true);
  const { issue } = useInventoryActions();

  const { data: approvedTickets } = useQuery({
    queryKey: ['approved-tickets-for-issue'],
    queryFn: () => ticketApi.list({ status: 'Manager Approved', limit: 100 }).then((r) => r.data.data),
    enabled: open
  });

  // Once a ticket is picked, only show items in stock that match what was actually requested.
  const { data: availableItems } = useQuery({
    queryKey: ['available-items-for-ticket', selectedTicket?.requestedItemCategory?._id],
    queryFn: () => inventoryApi.list({ status: 'Available', itemCategory: selectedTicket.requestedItemCategory._id, limit: 100 }).then((r) => r.data.data),
    enabled: open && !!selectedTicket
  });

  const handleSubmit = async () => {
    if (!selectedItem || !selectedTicket) return;
    await issue.mutateAsync({ itemId: selectedItem._id, ticketId: selectedTicket._id, userId: selectedTicket.user._id, sendEmail });
    onIssued();
    onClose();
    setSelectedItem(null);
    setSelectedTicket(null);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Issue Inventory Item</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Autocomplete
            options={approvedTickets || []}
            getOptionLabel={(o) => `${o.ticketNumber} — ${o.user?.name} (${o.requestedItemCategory?.name})`}
            value={selectedTicket}
            onChange={(e, val) => { setSelectedTicket(val); setSelectedItem(null); }}
            renderInput={(params) => <TextField {...params} label="Approved ticket" helperText="Only manager-approved tickets can be fulfilled" />}
          />
          <Autocomplete
            options={availableItems || []}
            getOptionLabel={(o) => `${o.serialNumber} — ${o.brand || ''} ${o.model || ''}`}
            value={selectedItem}
            onChange={(e, val) => setSelectedItem(val)}
            disabled={!selectedTicket}
            renderInput={(params) => <TextField {...params} label={selectedTicket ? `Available ${selectedTicket.requestedItemCategory?.name}` : 'Select a ticket first'} />}
          />
          <FormControlLabel
            control={<Checkbox checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />}
            label="Send email notification"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={issue.isPending || !selectedTicket || !selectedItem}>
          {issue.isPending ? 'Issuing…' : 'Issue Item'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
