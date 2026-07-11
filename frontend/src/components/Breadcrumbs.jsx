import { Breadcrumbs as MuiBreadcrumbs, Typography, Link as MuiLink } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';

export default function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return <Typography variant="body2" color="text.secondary">Dashboard</Typography>;
  }

  return (
    <MuiBreadcrumbs separator="›" sx={{ fontSize: 13 }}>
      <MuiLink component={Link} to="/" underline="hover" color="text.secondary">Dashboard</MuiLink>
      {segments.map((seg, idx) => {
        const path = '/' + segments.slice(0, idx + 1).join('/');
        const label = decodeURIComponent(seg).replace(/-/g, ' ');
        const isLast = idx === segments.length - 1;
        return isLast ? (
          <Typography key={path} variant="body2" sx={{ textTransform: 'capitalize', fontWeight: 600 }}>{label}</Typography>
        ) : (
          <MuiLink key={path} component={Link} to={path} underline="hover" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
            {label}
          </MuiLink>
        );
      })}
    </MuiBreadcrumbs>
  );
}
