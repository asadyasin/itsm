import { Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Box, Typography, Divider } from '@mui/material';
import { NavLink, useLocation } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/DashboardOutlined';
import InventoryIcon from '@mui/icons-material/Inventory2Outlined';
import CategoryIcon from '@mui/icons-material/CategoryOutlined';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCartOutlined';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import PeopleIcon from '@mui/icons-material/PeopleOutlined';
import ApartmentIcon from '@mui/icons-material/ApartmentOutlined';
import BusinessIcon from '@mui/icons-material/BusinessOutlined';
import StorefrontIcon from '@mui/icons-material/StorefrontOutlined';
import AssessmentIcon from '@mui/icons-material/AssessmentOutlined';
import HistoryIcon from '@mui/icons-material/HistoryOutlined';
import UploadFileIcon from '@mui/icons-material/UploadFileOutlined';
import { useAuth } from '../contexts/AuthContext';

export const DRAWER_WIDTH = 248;

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/', icon: <DashboardIcon />, roles: ['admin', 'manager', 'user'] },
  { label: 'Inventory', to: '/inventory', icon: <InventoryIcon />, roles: ['admin', 'manager', 'user'] },
  { label: 'Purchases', to: '/purchases', icon: <ShoppingCartIcon />, roles: ['admin'] },
  { label: 'Categories', to: '/categories', icon: <CategoryIcon />, roles: ['admin'] },
  { label: 'Tickets', to: '/tickets', icon: <ConfirmationNumberIcon />, roles: ['admin', 'manager', 'user'] },
  { label: 'Users', to: '/users', icon: <PeopleIcon />, roles: ['admin'] },
  { label: 'Company & Offices', to: '/company-setup', icon: <BusinessIcon />, roles: ['admin'] },
  { label: 'Departments', to: '/departments', icon: <ApartmentIcon />, roles: ['admin'] },
  { label: 'Vendors', to: '/vendors', icon: <StorefrontIcon />, roles: ['admin'] },
  { label: 'Reports', to: '/reports', icon: <AssessmentIcon />, roles: ['admin'] },
  { label: 'Data Import', to: '/data-import', icon: <UploadFileIcon />, roles: ['admin'] },
  { label: 'Audit Log', to: '/audit-log', icon: <HistoryIcon />, roles: ['admin'] }
];

export default function Sidebar({ mobileOpen, onClose, variant }) {
  const { user } = useAuth();
  const location = useLocation();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(user?.role));

  const content = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ px: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box
            component="img"
            src="/logo.png"
            alt="10xE logo"
            sx={{ width: 36, height: 36, objectFit: 'contain' }}
          />
          <Box>
            <Typography variant="subtitle1" fontWeight={700} lineHeight={1.1}>10xE Inventory</Typography>
            <Typography variant="caption" color="text.secondary">IT Help Desk</Typography>
          </Box>
        </Box>
      </Toolbar>
      <Divider />
      <List sx={{ px: 1.5, py: 2, flex: 1 }}>
        {items.map((item) => {
          const active = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
          return (
            <ListItemButton
              key={item.to}
              component={NavLink}
              to={item.to}
              onClick={onClose}
              selected={active}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                '&.Mui-selected': { bgcolor: 'primary.main', color: '#fff', '& .MuiListItemIcon-root': { color: '#fff' }, '&:hover': { bgcolor: 'primary.dark' } }
              }}
            >
              <ListItemIcon sx={{ minWidth: 38 }}>{item.icon}</ListItemIcon>
              <ListItemText primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }}>{item.label}</ListItemText>
            </ListItemButton>
          );
        })}
      </List>
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary">v1.0.0 &middot; Enterprise Edition</Typography>
      </Box>
    </Box>
  );

  if (variant === 'permanent') {
    return (
      <Drawer variant="permanent" sx={{ width: DRAWER_WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, borderRight: '1px solid rgba(0,0,0,0.06)' } }}>
        {content}
      </Drawer>
    );
  }

  return (
    <Drawer variant="temporary" open={mobileOpen} onClose={onClose} ModalProps={{ keepMounted: true }} sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}>
      {content}
    </Drawer>
  );
}
