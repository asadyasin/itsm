import { Routes, Route } from 'react-router-dom';
import { RequireAuth, RequireRole } from './routes/RequireAuth';
import DashboardLayout from './layouts/DashboardLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import InventoryListPage from './pages/InventoryListPage';
import InventoryDetailPage from './pages/InventoryDetailPage';
import PurchasesPage from './pages/PurchasesPage';
import CategoriesPage from './pages/CategoriesPage';
import TicketListPage from './pages/TicketListPage';
import TicketCreatePage from './pages/TicketCreatePage';
import TicketDetailPage from './pages/TicketDetailPage';
import UsersPage from './pages/UsersPage';
import DepartmentsPage from './pages/DepartmentsPage';
import VendorsPage from './pages/VendorsPage';
import ReportsPage from './pages/ReportsPage';
import AuditLogPage from './pages/AuditLogPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import SearchResultsPage from './pages/SearchResultsPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/inventory" element={<InventoryListPage />} />
          <Route path="/inventory/:id" element={<InventoryDetailPage />} />
          <Route path="/purchases" element={<RequireRole roles={['admin']}><PurchasesPage /></RequireRole>} />
          <Route path="/categories" element={<RequireRole roles={['admin']}><CategoriesPage /></RequireRole>} />
          <Route path="/tickets" element={<TicketListPage />} />
          <Route path="/tickets/new" element={<TicketCreatePage />} />
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
          <Route path="/users" element={<RequireRole roles={['admin']}><UsersPage /></RequireRole>} />
          <Route path="/departments" element={<RequireRole roles={['admin']}><DepartmentsPage /></RequireRole>} />
          <Route path="/vendors" element={<RequireRole roles={['admin']}><VendorsPage /></RequireRole>} />
          <Route path="/reports" element={<RequireRole roles={['admin']}><ReportsPage /></RequireRole>} />
          <Route path="/audit-log" element={<RequireRole roles={['admin']}><AuditLogPage /></RequireRole>} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="/search" element={<SearchResultsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
