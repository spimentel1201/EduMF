import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { authService } from '@/services/authService';
import toast from 'react-hot-toast';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (dni: string, password: string, onSuccessRedirect?: string) => Promise<void>;
  loginWithQR: (qrData: string, onSuccessRedirect?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await authService.getCurrentUser();
          setUser(response.user);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (dni: string, password: string, onSuccessRedirect: string = '/') => {
    try {
      setIsLoading(true);
      const response = await authService.login({ dni, password });
      
      localStorage.setItem('token', response.token);
      setUser(response.user);
      
      toast.success('Inicio de sesión exitoso');
      window.location.href = onSuccessRedirect;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al iniciar sesión');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithQR = async (qrData: string, onSuccessRedirect: string = '/') => {
    try {
      setIsLoading(true);
      const response = await authService.loginWithQR(qrData);
      
      localStorage.setItem('token', response.token);
      setUser(response.user);
      
      toast.success('Inicio de sesión con QR exitoso');
      window.location.href = onSuccessRedirect;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al iniciar sesión con QR');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginWithQR,
        logout,
      }}
    >
      {!isLoading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
