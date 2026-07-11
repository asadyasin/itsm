import { Popover, Box, Typography, List, ListItemButton, ListItemText, Divider, Button } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../api/endpoints';
import { useSocket } from '../contexts/SocketContext';
import dayjs from '../utils/dayjs';

export default function NotificationPanel({ anchorEl, onClose }) {
  const open = Boolean(anchorEl);
  const qc = useQueryClient();
  const socket = useSocket();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.list().then((r) => r.data),
    enabled: open
  });

  const markAllRead = async () => {
    await notificationApi.markAllRead();
    qc.invalidateQueries({ queryKey: ['notifications'] });
  };

  const items = data?.data || [];
  const live = socket?.liveNotifications || [];

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Box sx={{ width: 340 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={700}>Notifications</Typography>
          <Button size="small" onClick={markAllRead}>Mark all read</Button>
        </Box>
        <Divider />
        <List sx={{ maxHeight: 360, overflowY: 'auto', py: 0 }}>
          {live.map((n, i) => (
            <ListItemButton key={`live-${i}`} divider>
              <ListItemText
                primary={n.title}
                secondary={n.message}
                primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }}
                secondaryTypographyProps={{ fontSize: 12 }}
              />
            </ListItemButton>
          ))}
          {items.map((n) => (
            <ListItemButton key={n._id} divider selected={!n.isRead}>
              <ListItemText
                primary={n.title}
                secondary={`${n.message} \u2022 ${dayjs(n.createdAt).fromNow()}`}
                primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }}
                secondaryTypographyProps={{ fontSize: 12 }}
              />
            </ListItemButton>
          ))}
          {items.length === 0 && live.length === 0 && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">No notifications yet</Typography>
            </Box>
          )}
        </List>
      </Box>
    </Popover>
  );
}
