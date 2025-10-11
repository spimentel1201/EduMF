import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AttendanceRecordsPage from './pages/AttendanceRecordsPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import LoginPage from '@/pages/LoginPage';
import DashboardLayout from '@/layouts/DashboardLayout';
import DashboardPage from '@/pages/DashboardPage';
import UsersPage from '@/pages/UsersPage';
import StaffPage from '@/pages/StaffPage';
import NewStaffPage from '@/pages/NewStaffPage';
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
import NewEnrollmentPage from '@/pages/NewEnrollmentPage'; // Importar NewEnrollmentPage
import BulkEnrollmentPage from '@/pages/BulkEnrollmentPage'; // Importar BulkEnrollmentPage
import NewUserPage from './pages/NewUserPage';
import MonthlyAttendanceReportPage from './pages/MonthlyAttendanceReportPage';


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
              <Route path="users" element={<UsersPage />} />
              <Route path="users/new" element={<NewUserPage />} /> {/* Añadir esta línea */}
              <Route path="staff" element={<StaffPage />} />
              <Route path="staff/new" element={<NewStaffPage />} />
              <Route path="schedules" element={<SchedulesPage />} />
              <Route path="schedules/new" element={<NewSchedulePage />} />
              <Route path="attendance/take" element={<TakeAttendancePage />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="school-years" element={<SchoolYearPage />} />
              <Route path="school-years/new" element={<NewSchoolYearPage />} />
              <Route path="sections" element={<SectionsPage />} />
              <Route path="sections/new" element={<NewSectionPage />} />
              <Route path="time-slots" element={<TimeSlotsPage />} />
              <Route path="time-slots/new" element={<NewTimeSlotPage />} />
              <Route path="enrollments/new" element={<NewEnrollmentPage />} /> {/* Añadir esta línea */}
              <Route path="enrollments/bulk" element={<BulkEnrollmentPage />} /> {/* Añadir esta línea */}
              <Route path="/attendance-records" element={<AttendanceRecordsPage />} />
              <Route path="/monthly-attendance-report" element={<MonthlyAttendanceReportPage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  
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
  
  return <>{children}</>;
}

export default App;
