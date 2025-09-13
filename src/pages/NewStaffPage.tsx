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
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { staffService } from '@/services/staffService';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

const staffSchema = z.object({
  dni: z.string()
    .regex(/^\d{8}$/, 'El DNI debe tener exactamente 8 dígitos'),
  firstName: z.string().min(2, 'El nombre es requerido'),
  lastName: z.string().min(2, 'El apellido es requerido'),
  email: z.string().email('Email inválido'),
  role: z.enum(['Psicólogo(a)', 'Mantenimiento', 'CIST', 'Dirección', 'Docente', 'Auxiliar']),
  level: z.enum(['Inicial', 'Primaria', 'Secundaria', 'General']),
  status: z.enum(['Activo', 'Inactivo']).default('Activo'),
  phone: z.string().min(9, 'El teléfono debe tener al menos 9 caracteres'),
  address: z.string().min(10, 'La dirección debe tener al menos 10 caracteres'),
});

type StaffFormData = z.infer<typeof staffSchema>;

// Mapeo de roles para mostrar en UI
const ROLE_DISPLAY_MAP = {
  'Psicólogo(a)': 'Psicólogo(a)', 
  'Mantenimiento': 'Mantenimiento', 
  'CIST': 'CIST',
  'Dirección': 'Dirección',
  'Docente': 'Docente',
  'Auxiliar': 'Auxiliar'
};

// Mapeo de niveles para mostrar en UI
const LEVEL_DISPLAY_MAP = {
  'Inicial': 'Inicial',
  'Primaria': 'Primaria',
  'Secundaria': 'Secundaria',
  'Todos': 'General'
};

export default function NewStaffPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      role: 'Docente',
      level: 'Primaria',
      status: 'Activo'
    }
  });

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createStaffMutation = useMutation({
    mutationFn: staffService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      navigate('/staff');
    },
    onError: (error: any) => {
      console.error('Error creating staff:', error);
      const errorMessage = error.response?.data?.message || 'Error al registrar el personal';
      alert(errorMessage);
    },
  });

  const onSubmit = (data: StaffFormData) => {
    createStaffMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900">Registrar Nuevo Personal</h3>
            <p className="mt-2 max-w-4xl text-sm text-gray-500">
              Complete el formulario para registrar un nuevo miembro del personal en el sistema.
            </p>
          </div>
          <Link
            to="/staff"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Volver al Personal
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            
            {/* Información Personal */}
            <div className="mb-8">
              <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                <UserCircleIcon className="h-5 w-5 mr-2 text-primary-600" />
                Información Personal
              </h4>
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                    Nombres *
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserCircleIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <input
                      type="text"
                      id="firstName"
                      className="block w-full pl-10 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      {...register('firstName')}
                    />
                  </div>
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                  )}
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                    Apellidos *
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserCircleIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <input
                      type="text"
                      id="lastName"
                      className="block w-full pl-10 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      {...register('lastName')}
                    />
                  </div>
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                  )}
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="dni" className="block text-sm font-medium text-gray-700">
                    DNI *
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <IdentificationIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <input
                      type="text"
                      id="dni"
                      className="block w-full pl-10 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      {...register('dni')}
                    />
                  </div>
                  {errors.dni && (
                    <p className="mt-1 text-sm text-red-600">{errors.dni.message}</p>
                  )}
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Correo Electrónico *
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <EnvelopeIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <input
                      type="email"
                      id="email"
                      className="block w-full pl-10 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      {...register('email')}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Teléfono *
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <PhoneIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <input
                      type="tel"
                      id="phone"
                      className="block w-full pl-10 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      placeholder="999123456"
                      {...register('phone')}
                    />
                  </div>
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                  )}
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                    Dirección *
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPinIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <input
                      type="text"
                      id="address"
                      className="block w-full pl-10 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      {...register('address')}
                    />
                  </div>
                  {errors.address && (
                    <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Información Laboral */}
            <div className="mb-8">
              <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                <AcademicCapIcon className="h-5 w-5 mr-2 text-primary-600" />
                Información Laboral
              </h4>
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                    Rol *
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserGroupIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <select
                      id="role"
                      className="block w-full pl-10 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      {...register('role')}
                    >
                      {['Psicólogo(a)', 'Mantenimiento', 'CIST', 'Dirección', 'Docente', 'Auxiliar'].map((role) => (
                        <option key={role} value={role}>
                          {ROLE_DISPLAY_MAP[role as keyof typeof ROLE_DISPLAY_MAP] || role}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="level" className="block text-sm font-medium text-gray-700">
                    Nivel Educativo *
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <AcademicCapIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <select
                      id="level"
                      className="block w-full pl-10 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      {...register('level')}
                    >
                      {['Inicial', 'Primaria', 'Secundaria', 'Todos'].map((level) => (
                        <option key={level} value={level}>
                          {LEVEL_DISPLAY_MAP[level as keyof typeof LEVEL_DISPLAY_MAP] || level}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                    Estado *
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <CheckCircleIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <select
                      id="status"
                      className="block w-full pl-10 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      {...register('status')}
                    >
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                onClick={() => reset()}
              >
                Limpiar
              </button>
              <button
                type="submit"
                disabled={createStaffMutation.isPending}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {createStaffMutation.isPending ? 'Registrando...' : 'Registrar Personal'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
