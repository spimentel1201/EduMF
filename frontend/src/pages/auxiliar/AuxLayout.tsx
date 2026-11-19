import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AuxBottomNav from '@/components/auxiliar/AuxBottomNav';

const ALLOWED = ['Auxiliar', 'admin', 'Dirección', 'CIST'];

export default function AuxLayout() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 rounded-full border-4 border-[#538f65] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user || !ALLOWED.includes(user.role)) {
    return <Navigate to="/aux/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Outlet />
      <AuxBottomNav />
    </div>
  );
}
