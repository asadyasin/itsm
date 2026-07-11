import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent, Stack, Button, TextField, Autocomplete, Skeleton,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
  Timeline, TimelineItem, TimelineSeparator, TimelineDot, TimelineConnector, TimelineContent, TimelineOppositeContent
} from '@mui/lab';
import { useQuery } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { inventoryApi, userApi } from '../api/endpoints';
import { useInventoryItem, useInventoryActions } from '../hooks/useInventory';
import { useAuth } from '../contexts/AuthContext';
import { StatusChip } from '../components/StatusChips';
import dayjs from '../utils/dayjs';

export default function InventoryDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading, refetch } = useInventoryItem(id);
  const { returnItem, scrap, transfer } = useInventoryActions();

  const [transferOpen, setTransferOpen] = useState(false);
  const [transferUser, setTransferUser] = useState(null);

  const { data: qrData } = useQuery({
    queryKey: ['qrcode', id],
    queryFn: () => inventoryApi.qrCode(id).then((r) => r.data.data),
    enabled: !!id
  });
  const { data: users } = useQuery({
    queryKey: ['users-for-transfer'],
    queryFn: () => userApi.list({ limit: 100 }).then((r) => r.data.data),
    enabled: transferOpen
  });

  if (isLoading) return <Skeleton variant="rounded" height={300} />;

  const item = data?.item;
  const history = data?.history || [];

  const handleReturn = async () => {
    await returnItem.mutateAsync({ itemId: item._id });
    enqueueSnackbar('Item returned to inventory', { variant: 'success' });
    refetch();
  };

  const handleScrap = async () => {
    await scrap.mutateAsync({ id: item._id, notes: 'Retired via asset detail page' });
    enqueueSnackbar('Item marked as scrapped', { variant: 'success' });
    refetch();
  };

  const handleTransfer = async () => {
    if (!transferUser) return;
    await transfer.mutateAsync({ id: item._id, toUserId: transferUser._id });
    enqueueSnackbar('Item transferred', { variant: 'success' });
    setTransferOpen(false);
    refetch();
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>{item.serialNumber}</Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>{item.brand} {item.model}</Typography>
                  <Typography variant="body2" color="text.secondary">{item.itemCategory?.name}</Typography>
                </Box>
                <StatusChip status={item.status} />
              </Stack>

              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">Asset Tag</Typography><Typography variant="body2">{item.assetTag || '—'}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">Vendor</Typography><Typography variant="body2">{item.purchase?.vendor?.name || '—'}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">Issued To</Typography><Typography variant="body2">{item.currentUser?.name || '—'}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">Warranty Expiry</Typography><Typography variant="body2">{item.warrantyExpiry ? dayjs(item.warrantyExpiry).format('DD MMM YYYY') : '—'}</Typography></Grid>
              </Grid>

              {user?.role === 'admin' && (
                <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
                  {item.status === 'Issued' && (
                    <>
                      <Button variant="contained" onClick={handleReturn}>Return</Button>
                      <Button variant="outlined" onClick={() => setTransferOpen(true)}>Transfer</Button>
                    </>
                  )}
                  {item.status !== 'Scrapped' && (
                    <Button variant="outlined" color="error" onClick={handleScrap}>Scrap</Button>
                  )}
                </Stack>
              )}
            </CardContent>
          </Card>

          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Asset Timeline</Typography>
              <Timeline sx={{ p: 0, m: 0 }}>
                {history.map((h, idx) => (
                  <TimelineItem key={h._id}>
                    <TimelineOppositeContent sx={{ flex: 0.35 }} color="text.secondary" fontSize={12}>
                      {dayjs(h.dateTime).format('DD MMM YYYY, h:mm A')}
                    </TimelineOppositeContent>
                    <TimelineSeparator>
                      <TimelineDot color="primary" />
                      {idx < history.length - 1 && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent>
                      <Typography variant="body2" fontWeight={600}>{h.action}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        By {h.performedBy?.name}{h.targetUser ? ` → ${h.targetUser.name}` : ''}
                      </Typography>
                      {h.notes && <Typography variant="caption" display="block" color="text.secondary">{h.notes}</Typography>}
                    </TimelineContent>
                  </TimelineItem>
                ))}
              </Timeline>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Asset QR Code</Typography>
              {qrData?.qrCodeImage ? (
                <img src={qrData.qrCodeImage} alt="Asset QR code" width={200} height={200} />
              ) : (
                <Skeleton variant="rectangular" width={200} height={200} sx={{ mx: 'auto' }} />
              )}
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                Scan to quickly issue or return this asset.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={transferOpen} onClose={() => setTransferOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Transfer Asset</DialogTitle>
        <DialogContent>
          <Autocomplete
            options={users || []}
            getOptionLabel={(o) => `${o.name} (${o.email})`}
            value={transferUser}
            onChange={(e, val) => setTransferUser(val)}
            renderInput={(params) => <TextField {...params} label="Transfer to" sx={{ mt: 1 }} />}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleTransfer}>Transfer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
