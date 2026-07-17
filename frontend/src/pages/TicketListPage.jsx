import { useMemo, useState } from 'react';
import { Box, Typography, Button, Stack, TextField, MenuItem, Card, CardContent } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTickets } from '../hooks/useTickets';
import { useAuth } from '../contexts/AuthContext';
import { StatusChip, PriorityChip } from '../components/StatusChips';
import dayjs from '../utils/dayjs';

const STATUS_OPTIONS = ['Pending', 'Manager Approved', 'Manager Rejected', 'Assigned', 'Issued', 'Resolved', 'Closed', 'Reopened'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];

export default function TicketListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({ status: searchParams.get('status') || '', priority: '', search: '' });
  const [scope, setScope] = useState('mine'); // manager-only toggle: 'mine' (own tickets, shown first) or 'team'

  const params = useMemo(() => {
    const p = {};
    if (filters.status) p.status = filters.status;
    if (filters.priority) p.priority = filters.priority;
    if (filters.search) p.search = filters.search;
    if (user?.role === 'manager') p.scope = scope;
    return p;
  }, [filters, scope, user]);

  const { data, isLoading } = useTickets(params);

  const rows = (data?.data || []).map((t) => ({
    id: t._id,
    ticketNumber: t.ticketNumber,
    user: t.user?.name,
    department: t.department?.name,
    priority: t.priority,
    status: t.status,
    created: dayjs(t.createdAt).format('DD MMM YYYY')
  }));

  const columns = [
    { field: 'ticketNumber', headerName: 'Ticket #', width: 130 },
    { field: 'user', headerName: 'Requested By', width: 160 },
    { field: 'department', headerName: 'Department', width: 150 },
    { field: 'priority', headerName: 'Priority', width: 120, renderCell: (p) => <PriorityChip priority={p.value} /> },
    { field: 'status', headerName: 'Status', width: 160, renderCell: (p) => <StatusChip status={p.value} /> },
    { field: 'created', headerName: 'Created', width: 130 }
  ];

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>Tickets</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/tickets/new')}>New Ticket</Button>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        {user?.role === 'manager' && (
          <TextField
            size="small"
            select
            label="Show"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            sx={{ minWidth: 170 }}
          >
            <MenuItem value="mine">My Own Tickets</MenuItem>
            <MenuItem value="team">Team's Tickets</MenuItem>
          </TextField>
        )}
        <TextField size="small" label="Search" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} sx={{ minWidth: 220 }} />
        <TextField size="small" select label="Status" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} sx={{ minWidth: 180 }}>
          <MenuItem value="">All</MenuItem>
          {STATUS_OPTIONS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
        <TextField size="small" select label="Priority" value={filters.priority} onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))} sx={{ minWidth: 150 }}>
          <MenuItem value="">All</MenuItem>
          {PRIORITY_OPTIONS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
        </TextField>
      </Stack>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <DataGrid
            autoHeight
            rows={rows}
            columns={columns}
            loading={isLoading}
            onRowClick={(p) => navigate(`/tickets/${p.id}`)}
            sx={{ cursor: 'pointer', border: 'none' }}
            pageSizeOptions={[10, 20, 50]}
          />
        </CardContent>
      </Card>
    </Box>
  );
}
