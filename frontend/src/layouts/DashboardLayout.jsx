import { useState } from 'react';
import { Box, Toolbar, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Outlet } from 'react-router-dom';
import Sidebar, { DRAWER_WIDTH } from '../components/Sidebar';
import Navbar from '../components/Navbar';
import Breadcrumbs from '../components/Breadcrumbs';

export default function DashboardLayout() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar variant={isDesktop ? 'permanent' : 'temporary'} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <Navbar onMenuClick={() => setMobileOpen(true)} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: isDesktop ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%',
          minHeight: '100vh',
          bgcolor: 'background.default'
        }}
      >
        <Toolbar />
        <Box sx={{ px: { xs: 2, md: 3 }, pt: 2, pb: 1 }}>
          <Breadcrumbs />
        </Box>
        <Box sx={{ px: { xs: 2, md: 3 }, pb: 4 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
