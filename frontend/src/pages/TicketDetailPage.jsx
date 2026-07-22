import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent, Stack, Button, TextField, Chip, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete, Checkbox, FormControlLabel, Skeleton
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useTicket, useTicketActions } from '../hooks/useTickets';
import { useAuth } from '../contexts/AuthContext';
import { StatusChip, PriorityChip } from '../components/StatusChips';
import { ticketApi, inventoryApi } from '../api/endpoints';
import dayjs from '../utils/dayjs';

export default function TicketDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const { data: ticket, isLoading, refetch } = useTicket(id);
  const { approve, reject, resolve, close, reopen } = useTicketActions();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [issueOpen, setIssueOpen] = useState(false);
  const [comment, setComment] = useState('');

  const { data: comments, refetch: refetchComments } = useQuery({
    queryKey: ['ticket-comments', id],
    queryFn: () => ticketApi.comments(id).then((r) => r.data.data),
    enabled: !!id
  });

  if (isLoading || !ticket) return <Skeleton variant="rounded" height={300} />;

  const isAdmin = user.role === 'admin';
  const isManagerOfDept = user.role === 'manager' && ticket.department?._id === user.department;
  const isOwner = ticket.user?._id === user._id;

  const act = async (fn, successMsg) => {
    await fn();
    enqueueSnackbar(successMsg, { variant: 'success' });
    refetch();
  };

  const closeRejectDialog = () => {
    setRejectOpen(false);
    setRejectReason('');
  };

  const submitComment = async () => {
    if (!comment.trim()) return;
    await ticketApi.addComment(id, { message: comment });
    setComment('');
    refetchComments();
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>{ticket.ticketNumber}</Typography>
          <Typography variant="body2" color="text.secondary">Requested by {ticket.user?.name} &middot; {dayjs(ticket.createdAt).format('DD MMM YYYY, h:mm A')}</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <PriorityChip priority={ticket.priority} />
          <StatusChip status={ticket.status} />
        </Stack>
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Description</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>{ticket.description}</Typography>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">Item Requested</Typography><Typography variant="body2">{ticket.requestedItemCategory?.name}</Typography></Grid>
                <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">Quantity</Typography><Typography variant="body2">{ticket.quantity}</Typography></Grid>
                <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">Department</Typography><Typography variant="body2">{ticket.department?.name}</Typography></Grid>
              </Grid>
              {ticket.attachments?.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>Attachments</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {ticket.attachments.map((a, i) => (
                      <Chip key={i} label={a.filename} component="a" href={a.path} target="_blank" clickable />
                    ))}
                  </Stack>
                </Box>
              )}

              {ticket.rejectionReason && (
                <Box sx={{ mt: 2, p: 1.5, bgcolor: 'error.main', color: '#fff', borderRadius: 1.5 }}>
                  <Typography variant="body2"><b>Rejection reason:</b> {ticket.rejectionReason}</Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Comments</Typography>
              <Stack spacing={1.5} sx={{ mb: 2 }}>
                {(comments || []).map((c) => (
                  <Box key={c._id} sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1.5 }}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" fontWeight={600}>{c.author?.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{dayjs(c.createdAt).fromNow()}</Typography>
                    </Stack>
                    <Typography variant="body2">{c.message}</Typography>
                  </Box>
                ))}
                {(!comments || comments.length === 0) && (
                  <Typography variant="body2" color="text.secondary">No comments yet.</Typography>
                )}
              </Stack>
              <Stack direction="row" spacing={1}>
                <TextField size="small" fullWidth placeholder="Add a comment..." value={comment} onChange={(e) => setComment(e.target.value)} />
                <Button variant="contained" onClick={submitComment}>Post</Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Actions</Typography>
              <Stack spacing={1}>
                {ticket.status === 'Pending' && (isAdmin || isManagerOfDept) && (
                  <>
                    <Button variant="contained" onClick={() => act(() => approve.mutateAsync(ticket._id), 'Ticket approved')}>Approve</Button>
                    <Button variant="outlined" color="error" onClick={() => setRejectOpen(true)}>Reject</Button>
                  </>
                )}
                {ticket.status === 'Manager Approved' && isAdmin && (
                  <Button variant="contained" onClick={() => setIssueOpen(true)}>Issue Item</Button>
                )}
                {ticket.status === 'Reopened' && isAdmin && (
                  <>
                    <Button variant="contained" onClick={() => setIssueOpen(true)}>Issue Replacement Item</Button>
                    <Button variant="outlined" onClick={() => act(() => resolve.mutateAsync(ticket._id), 'Ticket resolved')}>
                      Mark Resolved (no reissue needed)
                    </Button>
                  </>
                )}
                {ticket.status === 'Issued' && isAdmin && (
                  <Button variant="contained" onClick={() => act(() => resolve.mutateAsync(ticket._id), 'Ticket resolved')}>Mark Resolved</Button>
                )}
                {ticket.status === 'Resolved' && isAdmin && (
                  <Button variant="contained" onClick={() => act(() => close.mutateAsync(ticket._id), 'Ticket closed')}>Close Ticket</Button>
                )}
                {['Resolved', 'Closed'].includes(ticket.status) && (isAdmin || isOwner) && (
                  <Button variant="outlined" onClick={() => act(() => reopen.mutateAsync(ticket._id), 'Ticket reopened')}>Reopen</Button>
                )}
                {!['Pending', 'Manager Approved', 'Issued', 'Resolved', 'Closed', 'Reopened'].includes(ticket.status) && (
                  <Typography variant="body2" color="text.secondary">No actions available for the current status.</Typography>
                )}
              </Stack>
            </CardContent>
          </Card>

          {ticket.assignedItems?.length > 0 && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Issued Asset(s)</Typography>
                {ticket.assignedItems.map((item) => (
                  <Typography key={item._id} variant="body2">{item.serialNumber} — {item.brand} {item.model}</Typography>
                ))}
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      <Dialog open={rejectOpen} onClose={closeRejectDialog} fullWidth maxWidth="xs">
        <DialogTitle>Reject Ticket</DialogTitle>
        <DialogContent>
          <TextField label="Reason for rejection" fullWidth multiline rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRejectDialog}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            disabled={!rejectReason.trim()}
            onClick={async () => {
              await act(() => reject.mutateAsync({ id: ticket._id, reason: rejectReason }), 'Ticket rejected');
              closeRejectDialog();
            }}
          >
            Reject Ticket
          </Button>
        </DialogActions>
      </Dialog>

      {issueOpen && (
        <IssueForTicketDialog open={issueOpen} onClose={() => setIssueOpen(false)} ticket={ticket} onIssued={() => { refetch(); setIssueOpen(false); }} />
      )}
    </Box>
  );
}

function IssueForTicketDialog({ open, onClose, ticket, onIssued }) {
  const { enqueueSnackbar } = useSnackbar();
  const [selectedItem, setSelectedItem] = useState(null);
  const [sendEmail, setSendEmail] = useState(true);

  const { data: availableItems } = useQuery({
    queryKey: ['available-items-for-ticket', ticket?.requestedItemCategory?._id],
    queryFn: () => inventoryApi.list({ status: 'Available', itemCategory: ticket.requestedItemCategory._id, limit: 100 }).then((r) => r.data.data),
    enabled: open && !!ticket
  });

  const handleIssue = async () => {
    if (!selectedItem) return;
    await inventoryApi.issue({ itemId: selectedItem._id, ticketId: ticket._id, userId: ticket.user._id, sendEmail });
    enqueueSnackbar('Item issued and ticket updated', { variant: 'success' });
    onIssued();
    setSelectedItem(null);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Issue Item for {ticket?.ticketNumber}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Autocomplete
            options={availableItems || []}
            getOptionLabel={(o) => `${o.serialNumber} — ${o.brand || ''} ${o.model || ''}`}
            value={selectedItem}
            onChange={(e, val) => setSelectedItem(val)}
            renderInput={(params) => <TextField {...params} label={`Available ${ticket?.requestedItemCategory?.name || 'item'}`} />}
          />
          <FormControlLabel
            control={<Checkbox checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />}
            label="Send email notification to requester"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleIssue} disabled={!selectedItem}>Issue Item</Button>
      </DialogActions>
    </Dialog>
  );
}
