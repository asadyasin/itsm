import { useSearchParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Card, CardContent, List, ListItemButton, ListItemText, Divider } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { searchApi } from '../api/endpoints';

export default function SearchResultsPage() {
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['global-search', q],
    queryFn: () => searchApi.global(q).then((r) => r.data.data),
    enabled: !!q
  });

  const sections = [
    { key: 'assets', label: 'Assets', onClick: (item) => navigate(`/inventory/${item._id}`), render: (i) => `${i.serialNumber} — ${i.brand || ''} ${i.model || ''}` },
    { key: 'tickets', label: 'Tickets', onClick: (item) => navigate(`/tickets/${item._id}`), render: (i) => `${i.ticketNumber} — ${i.description?.slice(0, 60)}` },
    { key: 'users', label: 'Users', onClick: (item) => navigate(`/users`), render: (i) => `${i.name} (${i.email})` },
    { key: 'vendors', label: 'Vendors', onClick: (item) => navigate(`/vendors`), render: (i) => i.name }
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Search results for "{q}"</Typography>
      {isLoading && <Typography color="text.secondary">Searching…</Typography>}
      {sections.map((section) => {
        const items = data?.[section.key] || [];
        if (items.length === 0) return null;
        return (
          <Card key={section.key} sx={{ mb: 2 }}>
            <CardContent sx={{ p: 0 }}>
              <Typography variant="subtitle2" sx={{ px: 2, pt: 2, pb: 1 }}>{section.label}</Typography>
              <Divider />
              <List sx={{ py: 0 }}>
                {items.map((item) => (
                  <ListItemButton key={item._id} onClick={() => section.onClick(item)}>
                    <ListItemText primary={section.render(item)} />
                  </ListItemButton>
                ))}
              </List>
            </CardContent>
          </Card>
        );
      })}
      {data && sections.every((s) => (data[s.key] || []).length === 0) && (
        <Typography color="text.secondary">No results found.</Typography>
      )}
    </Box>
  );
}
