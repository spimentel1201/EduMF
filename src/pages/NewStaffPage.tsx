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
} from '@heroicons/react/24/outline';
import { Link, useNavigate } from 'react-router-dom';
import { staffService } from '@/services/staffService';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

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

function InputWithIcon({
  icon: Icon,
  ...props
}: { icon: React.ElementType } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <input className={inputCls} {...props} />
    </div>
  );
}

function SelectWithIcon({
  icon: Icon,
  children,
  ...props
}: { icon: React.ElementType } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <select className={selectCls} {...props}>
        {children}
      </select>
    </div>
  );
}

export default function NewStaffPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: { role: 'Docente', level: 'Primaria', status: 'Activo' },
  });

  const createStaffMutation = useMutation({
    mutationFn: staffService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Personal registrado correctamente');
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

      <form onSubmit={handleSubmit((data) => createStaffMutation.mutate(data))}>
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
