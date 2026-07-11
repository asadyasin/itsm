import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <Box sx={{ textAlign: 'center', mt: 10 }}>
      <Typography variant="h2" fontWeight={800} color="primary.main">404</Typography>
      <Typography variant="h6" sx={{ mb: 3 }}>Page not found</Typography>
      <Button variant="contained" onClick={() => navigate('/')}>Back to Dashboard</Button>
    </Box>
  );
}
