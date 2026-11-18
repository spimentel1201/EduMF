import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  CreditCardIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

const items = [
  { to: '/portal', label: 'Inicio', icon: HomeIcon, end: true },
  { to: '/portal/asistencia', label: 'Asistencia', icon: CalendarDaysIcon },
  { to: '/portal/incidencias', label: 'Incidencias', icon: ExclamationTriangleIcon },
  { to: '/portal/pagos', label: 'Pagos', icon: CreditCardIcon },
  { to: '/portal/perfil', label: 'Perfil', icon: UserCircleIcon },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#1e2433] border-t border-white/10">
      <div className="max-w-lg mx-auto flex items-stretch justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-[#538f65]' : 'text-gray-400 hover:text-gray-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-6 h-6 ${isActive ? 'text-[#538f65]' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
