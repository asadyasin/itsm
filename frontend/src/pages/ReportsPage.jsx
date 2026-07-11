import { Box, Typography, Card, CardContent, Grid, Button, Stack } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { reportApi } from '../api/endpoints';

const REPORTS = [
  { type: 'issued-assets', label: 'Issued Assets', description: 'All currently issued inventory items and their holders.' },
  { type: 'returned-assets', label: 'Returned Assets', description: 'History of items returned to inventory.' },
  { type: 'vendor-purchases', label: 'Vendor Purchases', description: 'Purchase records grouped by vendor.' },
  { type: 'user-inventory', label: 'User Inventory', description: 'Assets currently issued, broken down by user.' },
  { type: 'tickets', label: 'Ticket Report', description: 'All help desk tickets with status and priority.' }
];

const FORMATS = [
  { format: 'excel', label: 'Excel' },
  { format: 'csv', label: 'CSV' },
  { format: 'pdf', label: 'PDF' }
];

export default function ReportsPage() {
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
                      href={reportApi.downloadUrl(report.type, f.format)}
                      target="_blank"
                    >
                      {f.label}
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
