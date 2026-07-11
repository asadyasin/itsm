import { Box, Typography, Card, CardContent } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import dayjs from '../utils/dayjs';

export default function AuditLogPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => api.get('/audit-logs', { params: { limit: 100 } }).then((r) => r.data)
  });

  const rows = (data?.data || []).map((log) => ({
    id: log._id,
    actor: log.actor?.name,
    action: log.action,
    module: log.module,
    description: log.description,
    date: dayjs(log.createdAt).format('DD MMM YYYY, h:mm A')
  }));

  const columns = [
    { field: 'date', headerName: 'Date/Time', width: 180 },
    { field: 'actor', headerName: 'Performed By', width: 160 },
    { field: 'action', headerName: 'Action', width: 180 },
    { field: 'module', headerName: 'Module', width: 120 },
    { field: 'description', headerName: 'Details', flex: 1, minWidth: 220 }
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Audit Log</Typography>
      <Card>
        <CardContent sx={{ p: 0 }}>
          <DataGrid autoHeight rows={rows} columns={columns} loading={isLoading} sx={{ border: 'none' }} pageSizeOptions={[25, 50, 100]} />
        </CardContent>
      </Card>
    </Box>
  );
}
