import { useState } from 'react';
import { Box, Typography, Card, CardContent, Grid, Button, Stack } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { useSnackbar } from 'notistack';
import { reportApi } from '../api/endpoints';
import { downloadAuthenticated } from '../utils/download';

const REPORTS = [
  { type: 'issued-assets', label: 'Issued Assets', description: 'All currently issued inventory items and their holders.' },
  { type: 'returned-assets', label: 'Returned Assets', description: 'History of items returned to inventory.' },
  { type: 'vendor-purchases', label: 'Vendor Purchases', description: 'Purchase records grouped by vendor.' },
  { type: 'user-inventory', label: 'User Inventory', description: 'Assets currently issued, broken down by user.' },
  { type: 'tickets', label: 'Ticket Report', description: 'All help desk tickets with status and priority.' }
];

const FORMATS = [
  { format: 'excel', label: 'Excel', ext: 'xlsx' },
  { format: 'csv', label: 'CSV', ext: 'csv' },
  { format: 'pdf', label: 'PDF', ext: 'pdf' }
];

export default function ReportsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [downloading, setDownloading] = useState(null); // `${type}-${format}` while in flight

  const handleDownload = async (type, format, ext) => {
    const key = `${type}-${format}`;
    setDownloading(key);
    try {
      await downloadAuthenticated(reportApi.download(type, format), `${type}.${ext}`);
    } catch (err) {
      enqueueSnackbar('Failed to download report', { variant: 'error' });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Reports</Typography>
      <Grid container spacing={2}>
        {REPORTS.map((report) => (
          <Grid item xs={12} md={6} key={report.type}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700}>{report.label}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{report.description}</Typography>
                <Stack direction="row" spacing={1}>
                  {FORMATS.map((f) => (
                    <Button
                      key={f.format}
                      size="small"
                      variant="outlined"
                      startIcon={<FileDownloadIcon />}
                      disabled={downloading === `${report.type}-${f.format}`}
                      onClick={() => handleDownload(report.type, f.format, f.ext)}
                    >
                      {downloading === `${report.type}-${f.format}` ? 'Downloading…' : f.label}
                    </Button>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
