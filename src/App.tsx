import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AttendanceRecordsPage from './pages/AttendanceRecordsPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { canAccess, getDefaultRoute } from '@/utils/roleAccess';
import LoginPage from '@/pages/LoginPage';
import DashboardLayout from '@/layouts/DashboardLayout';
import DashboardPage from '@/pages/DashboardPage';
import UsersPage from '@/pages/UsersPage';
import StaffPage from '@/pages/StaffPage';
import NewStaffPage from '@/pages/NewStaffPage';
import EditStaffPage from '@/pages/EditStaffPage';
import SchedulesPage from '@/pages/SchedulesPage';
import NewSchedulePage from '@/pages/NewSchedulePage';
import TakeAttendancePage from '@/pages/TakeAttendancePage';
import AttendancePage from '@/pages/AttendancePage';
import SchoolYearPage from '@/pages/SchoolYearPage';
import NewSchoolYearPage from '@/pages/NewSchoolYearPage';
import SectionsPage from '@/pages/SectionsPage';
import NewSectionPage from '@/pages/NewSectionPage';
import TimeSlotsPage from '@/pages/TimeSlotsPage';
import NewTimeSlotPage from '@/pages/NewTimeSlotPage';
import EditTimeSlotPage from '@/pages/EditTimeSlotPage';
import NewEnrollmentPage from '@/pages/NewEnrollmentPage'; // Importar NewEnrollmentPage
import BulkEnrollmentPage from '@/pages/BulkEnrollmentPage'; // Importar BulkEnrollmentPage
import NewUserPage from './pages/NewUserPage';
import MonthlyAttendanceReportPage from './pages/MonthlyAttendanceReportPage';
import QRGeneratorPage from './pages/QRGeneratorPage';
import IncidentsPage from '@/pages/IncidentsPage';
import NewIncidentPage from '@/pages/NewIncidentPage';
import EditIncidentPage from '@/pages/EditIncidentPage';
import EventsPage from '@/pages/EventsPage';
import EventAttendancePage from './pages/EventAttendancePage';
import NewEventPage from '@/pages/NewEventPage';
import PaymentsPage from '@/pages/PaymentsPage';
import NewChargePage from '@/pages/NewChargePage';
import DefaultersReportPage from './pages/DefaultersReportPage';
import InstitutionSettingsPage from '@/pages/InstitutionSettingsPage';
import DebtsByGradePage from './pages/DebtsByGradePage';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="users" element={<RoleRoute module="users"><UsersPage /></RoleRoute>} />
              <Route path="users/new" element={<RoleRoute module="users"><NewUserPage /></RoleRoute>} />
              <Route path="staff" element={<RoleRoute module="staff"><StaffPage /></RoleRoute>} />
              <Route path="staff/new" element={<RoleRoute module="staff"><NewStaffPage /></RoleRoute>} />
              <Route path="staff/:id/edit" element={<RoleRoute module="staff"><EditStaffPage /></RoleRoute>} />
              <Route path="schedules" element={<RoleRoute module="academic"><SchedulesPage /></RoleRoute>} />
              <Route path="schedules/new" element={<RoleRoute module="academic"><NewSchedulePage /></RoleRoute>} />
              <Route path="attendance/take" element={<RoleRoute module="attendance"><TakeAttendancePage /></RoleRoute>} />
              <Route path="attendance" element={<RoleRoute module="attendance"><AttendancePage /></RoleRoute>} />
              <Route path="school-years" element={<RoleRoute module="academic"><SchoolYearPage /></RoleRoute>} />
              <Route path="school-years/new" element={<RoleRoute module="academic"><NewSchoolYearPage /></RoleRoute>} />
              <Route path="sections" element={<RoleRoute module="academic"><SectionsPage /></RoleRoute>} />
              <Route path="sections/new" element={<RoleRoute module="academic"><NewSectionPage /></RoleRoute>} />
              <Route path="time-slots" element={<RoleRoute module="academic"><TimeSlotsPage /></RoleRoute>} />
              <Route path="time-slots/new" element={<RoleRoute module="academic"><NewTimeSlotPage /></RoleRoute>} />
              <Route path="time-slots/:id/edit" element={<RoleRoute module="academic"><EditTimeSlotPage /></RoleRoute>} />
              <Route path="enrollments/new" element={<RoleRoute module="enrollments"><NewEnrollmentPage /></RoleRoute>} />
              <Route path="enrollments/bulk" element={<RoleRoute module="enrollments"><BulkEnrollmentPage /></RoleRoute>} />
              <Route path="/attendance-records" element={<RoleRoute module="attendance"><AttendanceRecordsPage /></RoleRoute>} />
              <Route path="/monthly-attendance-report" element={<RoleRoute module="attendance"><MonthlyAttendanceReportPage /></RoleRoute>} />
              <Route path="/attendance-qr" element={<RoleRoute module="attendance"><QRGeneratorPage /></RoleRoute>} />
              <Route path="incidents" element={<RoleRoute module="incidents"><IncidentsPage /></RoleRoute>} />
              <Route path="incidents/new" element={<RoleRoute module="incidents"><NewIncidentPage /></RoleRoute>} />
              <Route path="incidents/:id/edit" element={<RoleRoute module="incidents"><EditIncidentPage /></RoleRoute>} />
              <Route path="events" element={<RoleRoute module="events"><EventsPage /></RoleRoute>} />
              <Route path="events/new" element={<RoleRoute module="events"><NewEventPage /></RoleRoute>} />
              <Route path="events/:eventId/attendance" element={<RoleRoute module="events"><EventAttendancePage /></RoleRoute>} />
              <Route path="payments" element={<RoleRoute module="payments"><PaymentsPage /></RoleRoute>} />
              <Route path="payments/new" element={<RoleRoute module="payments"><NewChargePage /></RoleRoute>} />
              <Route path="payments/defaulters" element={<RoleRoute module="payments"><DefaultersReportPage /></RoleRoute>} />
              <Route path="payments/by-grade" element={<RoleRoute module="payments"><DebtsByGradePage /></RoleRoute>} />
              <Route path="settings" element={<RoleRoute module="settings"><InstitutionSettingsPage /></RoleRoute>} />
            </Route>
          </Routes>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si el usuario no tiene acceso al dashboard, redirigir a su primera ruta válida
  if (user && !canAccess(user.role, 'dashboard')) {
    const defaultRoute = getDefaultRoute(user.role);
    if (window.location.pathname === '/') {
      return <Navigate to={defaultRoute} replace />;
    }
  }

  return <>{children}</>;
}

/**
 * Protege una ruta según el módulo requerido.
 * Si el usuario no tiene acceso, lo redirige al dashboard o su ruta por defecto.
 */
function RoleRoute({ module, children }: { module: string; children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!user || !canAccess(user.role, module)) {
    const fallback = getDefaultRoute(user?.role ?? '');
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}

export default App;
