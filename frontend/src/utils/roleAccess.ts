// ── Role-Based Access Control ────────────────────────────────────────────────
// Fuente única de verdad para permisos por módulo.
// Los roles reflejan el campo `role` del modelo User/Staff.

export type StaffRole =
  | 'Dirección'
  | 'CIST'
  | 'Psicólogo(a)'
  | 'Docente'
  | 'Auxiliar'
  | 'Mantenimiento'
  | 'admin'
  | 'teacher'
  | 'student';

/**
 * Mapa de módulos → roles con acceso permitido.
 * 'admin' siempre tiene acceso total (legado).
 */
export const ROLE_ACCESS: Record<string, StaffRole[]> = {
  dashboard:   ['Dirección', 'CIST', 'Psicólogo(a)', 'Auxiliar', 'admin', 'teacher'],
  users:       ['Dirección', 'CIST', 'Psicólogo(a)', 'Docente', 'admin'],
  staff:       ['Dirección', 'CIST', 'admin'],
  academic:    ['Dirección', 'CIST', 'admin'],
  attendance:  ['Dirección', 'CIST', 'Docente', 'Auxiliar', 'admin', 'teacher'],
  incidents:   ['Dirección', 'CIST', 'Psicólogo(a)', 'admin'],
  events:      ['Dirección', 'CIST', 'Psicólogo(a)', 'Docente', 'admin', 'teacher'],
  payments:    ['Dirección', 'CIST', 'admin'],
  settings:    ['Dirección', 'CIST', 'admin'],
  enrollments: ['Dirección', 'CIST', 'admin'],
};

/**
 * Retorna true si el rol tiene acceso al módulo dado.
 * Los roles no definidos en el mapa no tienen acceso.
 */
export function canAccess(role: string | undefined, module: string): boolean {
  if (!role) return false;
  return (ROLE_ACCESS[module] as string[] | undefined)?.includes(role) ?? false;
}

/**
 * Retorna los módulos a los que tiene acceso un rol.
 */
export function getAccessibleModules(role: string): string[] {
  return Object.entries(ROLE_ACCESS)
    .filter(([, roles]) => (roles as string[]).includes(role))
    .map(([module]) => module);
}

/**
 * Retorna la ruta de redirección por defecto para un rol dado.
 * Útil tras el login para enviar al usuario a la primera pantalla válida.
 */
export function getDefaultRoute(role: string): string {
  if (canAccess(role, 'dashboard')) return '/';
  if (canAccess(role, 'users'))     return '/users';
  if (canAccess(role, 'attendance'))return '/attendance';
  return '/login';
}
