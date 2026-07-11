import { useState } from 'react';
import {
  AppBar, Toolbar, IconButton, InputBase, Box, Badge, Menu, MenuItem, Avatar,
  Typography, ListItemIcon, Divider, useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import LogoutIcon from '@mui/icons-material/Logout';
import LockResetIcon from '@mui/icons-material/LockReset';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useColorMode } from '../contexts/ColorModeContext';
import { DRAWER_WIDTH } from './Sidebar';
import NotificationPanel from './NotificationPanel';

export default function Navbar({ onMenuClick }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const { user, logout } = useAuth();
  const { mode, toggleColorMode } = useColorMode();
  const navigate = useNavigate();

  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [notifAnchor, setNotifAnchor] = useState(null);
  const [search, setSearch] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/search?q=${encodeURIComponent(search.trim())}`);
  };

  return (
    <AppBar
      position="fixed"
      color="inherit"
      sx={{
        bgcolor: 'background.paper',
        width: isDesktop ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%',
        ml: isDesktop ? `${DRAWER_WIDTH}px` : 0
      }}
    >
      <Toolbar sx={{ gap: 1 }}>
        {!isDesktop && (
          <IconButton edge="start" onClick={onMenuClick}>
            <MenuIcon />
          </IconButton>
        )}

        <Box
          component="form"
          onSubmit={handleSearchSubmit}
          sx={{
            display: 'flex',
            alignItems: 'center',
            bgcolor: 'action.hover',
            borderRadius: 2,
            px: 1.5,
            py: 0.5,
            flex: 1,
            maxWidth: 420
          }}
        >
          <SearchIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
          <InputBase
            placeholder="Search assets, tickets, users, vendors..."
            fullWidth
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ fontSize: 14 }}
          />
        </Box>

        <Box sx={{ flex: 1 }} />

        <IconButton onClick={toggleColorMode} aria-label="Toggle dark mode">
          {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
        </IconButton>

        <IconButton onClick={(e) => setNotifAnchor(e.currentTarget)} aria-label="Notifications">
          <Badge color="error" variant="dot" invisible={false}>
            <NotificationsNoneIcon />
          </Badge>
        </IconButton>
        <NotificationPanel anchorEl={notifAnchor} onClose={() => setNotifAnchor(null)} />

        <IconButton onClick={(e) => setUserMenuAnchor(e.currentTarget)}>
          <Avatar sx={{ width: 34, height: 34, bgcolor: 'secondary.main', fontSize: 14 }}>
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </Avatar>
        </IconButton>
        <Menu anchorEl={userMenuAnchor} open={!!userMenuAnchor} onClose={() => setUserMenuAnchor(null)}>
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle2">{user?.name}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
              {user?.role}
            </Typography>
          </Box>
          <Divider />
          <MenuItem onClick={() => { setUserMenuAnchor(null); navigate('/change-password'); }}>
            <ListItemIcon><LockResetIcon fontSize="small" /></ListItemIcon>
            Change password
          </MenuItem>
          <MenuItem onClick={logout}>
            <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
            Log out
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
