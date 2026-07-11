import { Chip } from '@mui/material';

const STATUS_COLORS = {
  Available: 'success',
  Issued: 'info',
  Repair: 'warning',
  Lost: 'error',
  Scrapped: 'default',
  Reserved: 'secondary',
  Pending: 'warning',
  'Manager Approved': 'info',
  'Manager Rejected': 'error',
  Assigned: 'secondary',
  Resolved: 'success',
  Closed: 'default',
  Reopened: 'warning'
};

const PRIORITY_COLORS = {
  Low: 'default',
  Medium: 'info',
  High: 'warning',
  Critical: 'error'
};

export function StatusChip({ status }) {
  return <Chip size="small" label={status} color={STATUS_COLORS[status] || 'default'} sx={{ fontWeight: 600 }} />;
}

export function PriorityChip({ priority }) {
  return <Chip size="small" label={priority} color={PRIORITY_COLORS[priority] || 'default'} variant="outlined" sx={{ fontWeight: 600 }} />;
}
