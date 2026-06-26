import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  IdentificationIcon,
  UserCircleIcon,
  EnvelopeIcon,
  UserGroupIcon,
  PhoneIcon,
  MapPinIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  LockClosedIcon,
  KeyIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { Link, useNavigate } from 'react-router-dom';
import { staffService } from '@/services/staffService';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

// ── Roles con acceso al sistema (pueden tener contraseña) ──────────────────
const ROLES_WITH_ACCESS = ['Dirección', 'CIST', 'Psicólogo(a)', 'Docente', 'Auxiliar'];

const ROLE_BADGES: Record<string, { label: string; color: string }> = {
  'Dirección':    { label: 'Acceso total',                    color: '#7c3aed' },
  'CIST':         { label: 'Acceso total',                    color: '#1d4ed8' },
  'Psicólogo(a)': { label: 'Dashboard, Usuarios, Incidencias, Eventos', color: '#0369a1' },
  'Docente':      { label: 'Usuarios, Asistencia, Eventos',   color: '#15803d' },
  'Auxiliar':     { label: 'Dashboard, Asistencia',           color: '#b45309' },
  'Mantenimiento':{ label: 'Sin acceso al sistema',           color: '#6b7280' },
};

const staffSchema = z.object({
  dni:       z.string().regex(/^\d{8}$/, 'El DNI debe tener exactamente 8 dígitos'),
  firstName: z.string().min(2, 'El nombre es requerido'),
  lastName:  z.string().min(2, 'El apellido es requerido'),
  email:     z.string().email('Email inválido'),
  role:      z.enum(['Psicólogo(a)', 'Mantenimiento', 'CIST', 'Dirección', 'Docente', 'Auxiliar']),
  level:     z.enum(['Inicial', 'Primaria', 'Secundaria', 'General']),
  status:    z.enum(['Activo', 'Inactivo']),
  phone:     z.string().min(9, 'El teléfono debe tener al menos 9 caracteres'),
  address:   z.string().min(10, 'La dirección debe tener al menos 10 caracteres'),
  password:  z.string().min(6, 'Mínimo 6 caracteres').optional().or(z.literal('')),
});

type StaffFormData = z.infer<typeof staffSchema>;

// ── Reusable field wrapper ──────────────────────────────────────────────────
function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

const inputCls =
  'w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 transition-colors';
const selectCls =
  'w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 transition-colors';

const InputWithIcon = React.forwardRef<
  HTMLInputElement,
  { icon: React.ElementType } & React.InputHTMLAttributes<HTMLInputElement>
>(({ icon: Icon, ...props }, ref) => {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <input ref={ref} className={inputCls} {...props} />
    </div>
  );
});
InputWithIcon.displayName = 'InputWithIcon';

const SelectWithIcon = React.forwardRef<
  HTMLSelectElement,
  { icon: React.ElementType } & React.SelectHTMLAttributes<HTMLSelectElement>
>(({ icon: Icon, children, ...props }, ref) => {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <select ref={ref} className={selectCls} {...props}>
        {children}
      </select>
    </div>
  );
});
SelectWithIcon.displayName = 'SelectWithIcon';

// ── Generador de contraseña segura ─────────────────────────────────────────
function generateSecurePassword(): string {
  const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '@#$!';
  const all = upper + lower + digits + special;
  // Asegurar al menos uno de cada tipo
  const pwd = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
    ...Array.from({ length: 6 }, () => all[Math.floor(Math.random() * all.length)]),
  ];
  // Mezclar
  return pwd.sort(() => Math.random() - 0.5).join('');
}

export default function NewStaffPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: { role: 'Docente', level: 'Primaria', status: 'Activo', password: '' },
  });

  const selectedRole = watch('role');
  const passwordValue = watch('password');
  const badge = ROLE_BADGES[selectedRole];
  const roleHasAccess = ROLES_WITH_ACCESS.includes(selectedRole);

  const handleGeneratePassword = () => {
    const pwd = generateSecurePassword();
    setValue('password', pwd, { shouldValidate: true });
    setShowPassword(true);
    toast.success('Contraseña generada. Cópiala antes de guardar.');
  };

  const createStaffMutation = useMutation({
    mutationFn: staffService.create,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      const msg = data?.userCreated
        ? 'Personal registrado con acceso al sistema'
        : 'Personal registrado correctamente';
      toast.success(msg);
      navigate('/staff');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al registrar el personal');
    },
  });

  return (
    <div className="space-y-6 pb-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1a202c' }}>
            Registrar Personal
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#718096' }}>
            Complete el formulario para agregar un nuevo miembro al equipo.
          </p>
        </div>
        <Link
          to="/staff"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Volver
        </Link>
      </div>

      <form onSubmit={handleSubmit((data) => {
        // Limpiar password vacío antes de enviar
        const payload = { ...data, password: data.password || undefined };
        createStaffMutation.mutate(payload as any);
      })}>
        <div className="space-y-5">

          {/* ── Información Personal ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <UserCircleIcon className="w-5 h-5 text-green-600" />
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Información Personal</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Nombres *" error={errors.firstName?.message}>
                <InputWithIcon icon={UserCircleIcon} placeholder="Ej. María" {...register('firstName')} />
              </Field>
              <Field label="Apellidos *" error={errors.lastName?.message}>
                <InputWithIcon icon={UserCircleIcon} placeholder="Ej. González" {...register('lastName')} />
              </Field>
              <Field label="DNI *" error={errors.dni?.message}>
                <InputWithIcon icon={IdentificationIcon} placeholder="12345678" maxLength={8} {...register('dni')} />
              </Field>
              <Field label="Correo electrónico *" error={errors.email?.message}>
                <InputWithIcon icon={EnvelopeIcon} type="email" placeholder="correo@ejemplo.com" {...register('email')} />
              </Field>
              <Field label="Teléfono *" error={errors.phone?.message}>
                <InputWithIcon icon={PhoneIcon} type="tel" placeholder="999 123 456" {...register('phone')} />
              </Field>
              <Field label="Dirección *" error={errors.address?.message}>
                <InputWithIcon icon={MapPinIcon} placeholder="Av. Ejemplo 123" {...register('address')} />
              </Field>
            </div>
          </div>

          {/* ── Información Laboral ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <AcademicCapIcon className="w-5 h-5 text-green-600" />
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Información Laboral</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Rol *" error={errors.role?.message}>
                <SelectWithIcon icon={UserGroupIcon} {...register('role')}>
                  {['Docente', 'Psicólogo(a)', 'Mantenimiento', 'CIST', 'Dirección', 'Auxiliar'].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </SelectWithIcon>
              </Field>
              <Field label="Nivel educativo *" error={errors.level?.message}>
                <SelectWithIcon icon={AcademicCapIcon} {...register('level')}>
                  {['Inicial', 'Primaria', 'Secundaria', 'General'].map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </SelectWithIcon>
              </Field>
              <Field label="Estado *" error={errors.status?.message}>
                <SelectWithIcon icon={CheckCircleIcon} {...register('status')}>
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </SelectWithIcon>
              </Field>
            </div>

            {/* Badge de acceso según rol */}
            {badge && (
              <div
                className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
                style={{ background: `${badge.color}14`, color: badge.color, border: `1px solid ${badge.color}30` }}
              >
                <ShieldCheckIcon className="w-4 h-4 flex-shrink-0" />
                <span>
                  <strong>{selectedRole}:</strong> {badge.label}
                </span>
              </div>
            )}
          </div>

          {/* ── Acceso al Sistema ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-1">
              <LockClosedIcon className="w-5 h-5 text-green-600" />
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Acceso al Sistema</h2>
              <span className="ml-auto text-xs font-normal text-gray-400">Opcional</span>
            </div>
            <p className="text-xs text-gray-400 mb-5">
              Asigna una contraseña si este personal necesita iniciar sesión.
              El inicio de sesión usa el <strong>DNI</strong> como usuario.
              {!roleHasAccess && (
                <span className="ml-1 text-amber-600 font-medium">
                  ⚠ El rol <em>Mantenimiento</em> no tiene acceso al sistema.
                </span>
              )}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Contraseña" error={errors.password?.message}>
                <div className="flex gap-2">
                  {/* Input contraseña con toggle visible/oculto */}
                  <div className="relative flex-1">
                    <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      className={inputCls + ' pr-10'}
                      disabled={!roleHasAccess}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors text-xs"
                      tabIndex={-1}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>

                  {/* Botón generar contraseña */}
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    disabled={!roleHasAccess}
                    title="Generar contraseña segura"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: roleHasAccess ? '#f0fdf4' : '#f9fafb',
                      color: roleHasAccess ? '#15803d' : '#9ca3af',
                      borderColor: roleHasAccess ? '#bbf7d0' : '#e5e7eb',
                    }}
                  >
                    <KeyIcon className="w-3.5 h-3.5" />
                    Generar
                  </button>
                </div>

                {/* Indicador de fuerza si hay contraseña */}
                {passwordValue && passwordValue.length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="h-1 w-8 rounded-full transition-colors"
                          style={{
                            background: passwordValue.length >= i * 3
                              ? i <= 1 ? '#ef4444' : i <= 2 ? '#f59e0b' : i <= 3 ? '#84cc16' : '#22c55e'
                              : '#e5e7eb',
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-400">
                      {passwordValue.length < 6 ? 'Muy corta' : passwordValue.length < 9 ? 'Regular' : passwordValue.length < 12 ? 'Buena' : 'Excelente'}
                    </span>
                  </div>
                )}
              </Field>
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm transition-colors"
            >
              Limpiar
            </button>
            <button
              type="submit"
              disabled={createStaffMutation.isPending}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-50"
              style={{ background: '#538f65' }}
            >
              {createStaffMutation.isPending ? 'Registrando...' : 'Registrar Personal'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
