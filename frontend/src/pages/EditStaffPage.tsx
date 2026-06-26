import React, { useEffect } from 'react';
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
import { Link, useNavigate, useParams } from 'react-router-dom';
import { staffService } from '@/services/staffService';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

// ── Roles con acceso al sistema ──────────────────────────────────────────────
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

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

const inputCls = 'w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 transition-colors';

const InputWithIcon = React.forwardRef<HTMLInputElement, { icon: React.ElementType } & React.InputHTMLAttributes<HTMLInputElement>>(({ icon: Icon, ...props }, ref) => (
  <div className="relative">
    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    <input ref={ref} className={inputCls} {...props} />
  </div>
));
InputWithIcon.displayName = 'InputWithIcon';

const SelectWithIcon = React.forwardRef<HTMLSelectElement, { icon: React.ElementType } & React.SelectHTMLAttributes<HTMLSelectElement>>(({ icon: Icon, children, ...props }, ref) => (
  <div className="relative">
    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    <select ref={ref} className={inputCls} {...props}>{children}</select>
  </div>
));
SelectWithIcon.displayName = 'SelectWithIcon';

function generateSecurePassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function EditStaffPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = React.useState(false);

  const { data: staffData, isLoading, error } = useQuery({
    queryKey: ['staff', id],
    queryFn: () => staffService.getById(id!),
    enabled: !!id,
  });

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: { password: '' },
  });

  useEffect(() => {
    if (staffData) {
      reset({
        dni: staffData.dni,
        firstName: staffData.firstName,
        lastName: staffData.lastName,
        email: staffData.email,
        role: staffData.role as any,
        level: staffData.level as any,
        status: staffData.status as any,
        phone: staffData.phone,
        address: staffData.address,
        password: '',
      });
    }
  }, [staffData, reset]);

  const selectedRole = watch('role');
  const passwordValue = watch('password');
  const badge = ROLE_BADGES[selectedRole];
  const roleHasAccess = selectedRole && ROLES_WITH_ACCESS.includes(selectedRole);

  const handleGeneratePassword = () => {
    const pwd = generateSecurePassword();
    setValue('password', pwd, { shouldValidate: true });
    setShowPassword(true);
    toast.success('Contraseña generada. Cópiala antes de guardar.');
  };

  const updateStaffMutation = useMutation({
    mutationFn: (data: Partial<StaffFormData>) => staffService.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Personal actualizado correctamente');
      navigate('/staff');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Error al actualizar');
    },
  });

  if (isLoading) return <div className="text-center py-10">Cargando...</div>;
  if (error || !staffData) return <div className="text-center py-10 text-red-500">Error al cargar datos</div>;

  return (
    <div className="space-y-6 pb-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1a202c' }}>Editar Personal</h1>
          <p className="text-sm mt-0.5" style={{ color: '#718096' }}>Actualiza la información o asigna contraseña.</p>
        </div>
        <Link to="/staff" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
          <ArrowLeftIcon className="w-4 h-4" /> Volver
        </Link>
      </div>

      <form onSubmit={handleSubmit((data) => {
        const payload = { ...data, password: data.password || undefined };
        updateStaffMutation.mutate(payload);
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
                <InputWithIcon icon={IdentificationIcon} maxLength={8} {...register('dni')} />
              </Field>
              <Field label="Correo electrónico *" error={errors.email?.message}>
                <InputWithIcon icon={EnvelopeIcon} type="email" {...register('email')} />
              </Field>
              <Field label="Teléfono *" error={errors.phone?.message}>
                <InputWithIcon icon={PhoneIcon} type="tel" {...register('phone')} />
              </Field>
              <Field label="Dirección *" error={errors.address?.message}>
                <InputWithIcon icon={MapPinIcon} {...register('address')} />
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
            {badge && (
              <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium" style={{ background: `${badge.color}14`, color: badge.color, border: `1px solid ${badge.color}30` }}>
                <ShieldCheckIcon className="w-4 h-4 shrink-0" />
                <span><strong>{selectedRole}:</strong> {badge.label}</span>
              </div>
            )}
          </div>

          {/* ── Acceso al Sistema ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-1">
              <LockClosedIcon className="w-5 h-5 text-green-600" />
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Acceso al Sistema</h2>
            </div>
            <p className="text-xs text-gray-400 mb-5">
              Si llenas este campo, asignarás o cambiarás la contraseña actual. Si lo dejas vacío, el acceso del usuario permanecerá sin cambios.
              {!roleHasAccess && <span className="ml-1 text-amber-600 font-medium">⚠ El rol Mantenimiento no tiene acceso al sistema.</span>}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nueva Contraseña (Opcional)" error={errors.password?.message}>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      className={inputCls + ' pr-10'}
                      disabled={!roleHasAccess}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs" tabIndex={-1}>
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                  <button type="button" onClick={handleGeneratePassword} disabled={!roleHasAccess} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border" style={{ background: roleHasAccess ? '#f0fdf4' : '#f9fafb', color: roleHasAccess ? '#15803d' : '#9ca3af' }}>
                    <KeyIcon className="w-3.5 h-3.5" /> Generar
                  </button>
                </div>
                {passwordValue && passwordValue.length > 0 && (
                  <div className="mt-2 text-xs text-green-600 font-medium">Contraseña lista para ser guardada.</div>
                )}
              </Field>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button type="submit" disabled={updateStaffMutation.isPending} className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50" style={{ background: '#538f65' }}>
              {updateStaffMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
