import { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Button, Stack, TextField, List, ListItemButton,
  ListItemText, Divider, Skeleton
} from '@mui/material';
import {
  Timeline, TimelineItem, TimelineSeparator, TimelineDot, TimelineConnector, TimelineContent, TimelineOppositeContent
} from '@mui/lab';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import { useSnackbar } from 'notistack';
import { reportApi } from '../api/endpoints';
import { downloadAuthenticated } from '../utils/download';
import { StatusChip } from '../components/StatusChips';
import dayjs from '../utils/dayjs';

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

      <AssetHistoryReport />

      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5, mt: 4 }}>Standard Reports</Typography>
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

function AssetHistoryReport() {
  const { enqueueSnackbar } = useSnackbar();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState(null); // null = no search yet, [] = searched, no matches
  const [selected, setSelected] = useState(null); // the chosen InventoryItem summary
  const [detail, setDetail] = useState(null); // { item, history }
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [downloading, setDownloading] = useState(null);

  const runSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSelected(null);
    setDetail(null);
    try {
      const { data } = await reportApi.searchAssetHistory(query.trim());
      setResults(data.data);
    } catch (err) {
      enqueueSnackbar('Search failed', { variant: 'error' });
    } finally {
      setSearching(false);
    }
  };

  const selectItem = async (item) => {
    setSelected(item);
    setLoadingDetail(true);
    try {
      const { data } = await reportApi.assetHistory(item._id);
      setDetail(data.data);
    } catch (err) {
      enqueueSnackbar('Failed to load asset history', { variant: 'error' });
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDownload = async (format, ext) => {
    setDownloading(format);
    try {
      await downloadAuthenticated(
        reportApi.downloadAssetHistory(selected._id, format),
        `asset-history-${selected.serialNumber}.${ext}`
      );
    } catch (err) {
      enqueueSnackbar('Failed to download asset history', { variant: 'error' });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Card sx={{ mb: 1 }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700}>Asset History</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Find the complete lifecycle of a single asset — every issue, return, repair, transfer, or
          scrap event, from the day it was added to inventory to today. Search by serial number,
          asset tag, brand, or model.
        </Typography>

        <Box component="form" onSubmit={runSearch} sx={{ display: 'flex', gap: 1, mb: 2, maxWidth: 480 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="e.g. serial number 44xxx"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button type="submit" variant="contained" startIcon={<SearchIcon />} disabled={searching}>
            {searching ? 'Searching…' : 'Search'}
          </Button>
        </Box>

        {results && results.length === 0 && (
          <Typography variant="body2" color="text.secondary">No matching assets found.</Typography>
        )}

        {results && results.length > 0 && !selected && (
          <List dense sx={{ maxWidth: 480, bgcolor: 'action.hover', borderRadius: 1 }}>
            {results.map((item) => (
              <ListItemButton key={item._id} onClick={() => selectItem(item)}>
                <ListItemText
                  primary={`${item.serialNumber}${item.assetTag ? ` (${item.assetTag})` : ''}`}
                  secondary={`${item.itemCategory?.name || ''} — ${item.brand || ''} ${item.model || ''} — ${item.status}`}
                />
              </ListItemButton>
            ))}
          </List>
        )}

        {selected && (
          <Box sx={{ mt: 1 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" rowGap={1} sx={{ mb: 1.5 }}>
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>
                  {selected.serialNumber} — {selected.brand} {selected.model}
                </Typography>
                <Typography variant="caption" color="text.secondary">{selected.itemCategory?.name}</Typography>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center">
                {detail && <StatusChip status={detail.item.status} />}
                <Button size="small" onClick={() => { setSelected(null); setDetail(null); }}>Change asset</Button>
              </Stack>
            </Stack>

            {loadingDetail ? (
              <Skeleton variant="rounded" height={160} />
            ) : detail ? (
              <>
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  {FORMATS.map((f) => (
                    <Button
                      key={f.format}
                      size="small"
                      variant="outlined"
                      startIcon={<FileDownloadIcon />}
                      disabled={downloading === f.format}
                      onClick={() => handleDownload(f.format, f.ext)}
                    >
                      {downloading === f.format ? 'Downloading…' : f.label}
                    </Button>
                  ))}
                </Stack>

                <Divider sx={{ mb: 2 }} />

                {detail.history.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No history recorded for this asset yet.</Typography>
                ) : (
                  <Timeline sx={{ p: 0, m: 0 }}>
                    {detail.history.map((h, idx) => (
                      <TimelineItem key={h._id}>
                        <TimelineOppositeContent sx={{ flex: 0.35 }} color="text.secondary" fontSize={12}>
                          {dayjs(h.dateTime).format('DD MMM YYYY, h:mm A')}
                        </TimelineOppositeContent>
                        <TimelineSeparator>
                          <TimelineDot color="primary" />
                          {idx < detail.history.length - 1 && <TimelineConnector />}
                        </TimelineSeparator>
                        <TimelineContent>
                          <Typography variant="body2" fontWeight={600}>{h.action}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            By {h.performedBy?.name}{h.targetUser ? ` → ${h.targetUser.name}` : ''}
                            {h.relatedTicket ? ` • ${h.relatedTicket.ticketNumber}` : ''}
                          </Typography>
                          {h.notes && <Typography variant="caption" display="block" color="text.secondary">{h.notes}</Typography>}
                        </TimelineContent>
                      </TimelineItem>
                    ))}
                  </Timeline>
                )}
              </>
            ) : null}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
