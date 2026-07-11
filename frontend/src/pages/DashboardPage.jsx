import { Grid, Card, CardContent, Typography, Box, Skeleton } from '@mui/material';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import InventoryIcon from '@mui/icons-material/Inventory2Outlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutline';
import AssignmentIndIcon from '@mui/icons-material/AssignmentIndOutlined';
import BuildIcon from '@mui/icons-material/BuildOutlined';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmptyOutlined';
import TaskAltIcon from '@mui/icons-material/TaskAltOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmberOutlined';
import { useDashboardSummary, useDashboardCharts } from '../hooks/useDashboard';
import { useAuth } from '../contexts/AuthContext';

const COLORS = ['#2B3A67', '#1F8A70', '#D68910', '#C0392B', '#4A5A8F', '#8E44AD', '#16A085', '#7F8C8D'];

const CARD_DEFS = [
  { key: 'totalAssets', label: 'Total Assets', icon: InventoryIcon, color: '#2B3A67' },
  { key: 'availableAssets', label: 'Available Assets', icon: CheckCircleIcon, color: '#1F8A70' },
  { key: 'issuedAssets', label: 'Issued Assets', icon: AssignmentIndIcon, color: '#4A5A8F' },
  { key: 'repairAssets', label: 'Assets in Repair', icon: BuildIcon, color: '#D68910' },
  { key: 'totalTickets', label: 'Total Tickets', icon: ConfirmationNumberIcon, color: '#8E44AD' },
  { key: 'pendingTickets', label: 'Pending Tickets', icon: HourglassEmptyIcon, color: '#C0392B' },
  { key: 'closedTickets', label: 'Closed Tickets', icon: TaskAltIcon, color: '#16A085' },
  { key: 'lowStockItems', label: 'Low Stock Items', icon: WarningAmberIcon, color: '#E67E22' }
];

function StatCard({ label, value, icon: Icon, color, loading }) {
  return (
    <Card>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ width: 46, height: 46, borderRadius: '12px', bgcolor: `${color}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon sx={{ color }} />
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
          {loading ? <Skeleton width={50} height={30} /> : <Typography variant="h5" fontWeight={700}>{value ?? 0}</Typography>}
        </Box>
      </CardContent>
    </Card>
  );
}

function monthLabel(entry) {
  const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[entry._id.m]} ${entry._id.y}`;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: summary, isLoading: loadingSummary } = useDashboardSummary();
  const { data: charts, isLoading: loadingCharts } = useDashboardCharts();

  const visibleCards = CARD_DEFS.filter((c) => user?.role === 'admin' || c.key !== 'lowStockItems');

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>Welcome back, {user?.name?.split(' ')[0]}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Here's what's happening across inventory and support tickets today.
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {visibleCards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.key}>
            <StatCard label={card.label} value={summary?.[card.key]} icon={card.icon} color={card.color} loading={loadingSummary} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Monthly Purchases</Typography>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={(charts?.monthlyPurchases || []).map((d) => ({ month: monthLabel(d), quantity: d.totalQuantity }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="quantity" fill="#2B3A67" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Monthly Tickets</Typography>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={(charts?.monthlyTickets || []).map((d) => ({ month: monthLabel(d), count: d.count }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#1F8A70" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Inventory Distribution</Typography>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={charts?.inventoryDistribution || []} dataKey="count" nameKey="category" innerRadius={60} outerRadius={95} paddingAngle={2}>
                    {(charts?.inventoryDistribution || []).map((entry, index) => (
                      <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Vendor Statistics</Typography>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={charts?.vendorStats || []} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" fontSize={12} allowDecimals={false} />
                  <YAxis type="category" dataKey="vendor" fontSize={12} width={110} />
                  <Tooltip />
                  <Bar dataKey="totalQuantity" fill="#4A5A8F" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
