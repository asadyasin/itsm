import { useState } from 'react';
import { Box, Typography, Card, CardContent, Grid, Button, Stack, Alert, List, ListItem, ListItemText, Chip } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useSnackbar } from 'notistack';
import { vendorApi, categoryApi, purchaseApi, userApi, inventoryApi } from '../api/endpoints';

const IMPORTERS = [
  {
    key: 'vendors',
    title: 'Vendors',
    description: 'Bring over your supplier list from your old system.',
    columns: 'name, contactPerson, phone, email',
    note: 'Safe to re-run — matches existing vendors by name and updates them instead of duplicating.',
    call: (file) => { const fd = new FormData(); fd.append('file', file); return vendorApi.bulkImport(fd); }
  },
  {
    key: 'categories',
    title: 'Item Categories',
    description: 'Import your list of asset types (Laptop, Mouse, Monitor, etc).',
    columns: 'name, description, lowStockThreshold',
    note: 'Safe to re-run — matches existing categories by name.',
    call: (file) => { const fd = new FormData(); fd.append('file', file); return categoryApi.bulkImport(fd); }
  },
  {
    key: 'purchases',
    title: 'Purchases',
    description: 'Import historical purchase records. Set up Offices first — every row must reference an existing office by name.',
    columns: 'purchaseDate, category, vendor, office, brand, model, quantity, invoiceNo, unitPrice, description',
    note: 'Vendors and categories are created automatically if they don\u2019t already exist; offices must already exist.',
    call: (file) => { const fd = new FormData(); fd.append('file', file); return purchaseApi.bulkImport(fd); }
  },
  {
    key: 'users',
    title: 'Users',
    description: 'Import your staff directory. Departments referenced must already exist.',
    columns: 'name, email, password, role, department',
    note: 'Existing emails are skipped, never overwritten. Missing/short passwords default to a temporary one.',
    call: (file) => { const fd = new FormData(); fd.append('file', file); return userApi.bulkImport(fd); }
  },
  {
    key: 'inventory',
    title: 'Inventory Serial Numbers',
    description: 'Import individual asset serial numbers against purchases already in the system.',
    columns: 'purchaseId or invoiceNo, serialNumber, assetTag, warrantyExpiry',
    note: 'Location is always auto-set from the purchase\u2019s office \u2014 never taken from the file.',
    call: (file) => { const fd = new FormData(); fd.append('file', file); return inventoryApi.bulkImport(fd); }
  }
];

function ImportCard({ importer }) {
  const { enqueueSnackbar } = useSnackbar();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const { data } = await importer.call(file);
      setResult(data.data);
      enqueueSnackbar(`${importer.title}: ${data.data.created} imported${data.data.failed?.length ? `, ${data.data.failed.length} failed` : ''}`, {
        variant: data.data.failed?.length ? 'warning' : 'success'
      });
    } catch (err) {
      // global axios interceptor already shows a toast for the error
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700}>{importer.title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{importer.description}</Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
          <b>Columns:</b> {importer.columns}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>{importer.note}</Typography>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button component="label" variant="outlined" size="small" startIcon={<UploadFileIcon />}>
            {file ? file.name : 'Choose CSV/Excel'}
            <input type="file" hidden accept=".csv,.xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </Button>
          <Button variant="contained" size="small" disabled={!file || uploading} onClick={handleUpload}>
            {uploading ? 'Importing…' : 'Import'}
          </Button>
        </Stack>

        {result && (
          <Box sx={{ mt: 2 }}>
            <Alert severity={result.failed?.length ? 'warning' : 'success'} sx={{ mb: 1 }}>
              {result.created} row(s) imported successfully
              {result.updated !== undefined ? ` (${result.updated} updated)` : ''}
              {result.failed?.length ? `, ${result.failed.length} row(s) failed` : ''}.
            </Alert>
            {result.failed?.length > 0 && (
              <List dense sx={{ maxHeight: 160, overflowY: 'auto', bgcolor: 'action.hover', borderRadius: 1 }}>
                {result.failed.map((f, i) => (
                  <ListItem key={i}>
                    <Chip size="small" label={`Row ${f.row}`} sx={{ mr: 1 }} />
                    <ListItemText primary={f.error} primaryTypographyProps={{ fontSize: 12 }} />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default function DataImportPage() {
  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>Data Import</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Migrate data from your previous system. Import in order: Companies/Offices (from the Company &amp; Offices page) →
        Departments → Vendors &amp; Categories → Purchases → Inventory Serial Numbers → Users.
      </Typography>
      <Grid container spacing={2}>
        {IMPORTERS.map((importer) => (
          <Grid item xs={12} md={6} key={importer.key}>
            <ImportCard importer={importer} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
