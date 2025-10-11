import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { CalendarIcon } from '@heroicons/react/24/outline';
import { SchoolYearFormData, SchoolYearStatus } from '@/types/academic';
import { schoolYearService } from '@/services/schoolYearService';

const schoolYearSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  startDate: z.date({
    required_error: 'La fecha de inicio es requerida',
    invalid_type_error: 'La fecha de inicio debe ser una fecha válida',
  }),
  endDate: z.date({
    required_error: 'La fecha de fin es requerida',
    invalid_type_error: 'La fecha de fin debe ser una fecha válida',
  }),
  status: z.enum(['Activo', 'Inactivo', 'Finalizado']),
}).refine(data => data.endDate > data.startDate, {
  message: 'La fecha de fin debe ser posterior a la fecha de inicio',
  path: ['endDate'],
});

const statusOptions: { value: SchoolYearStatus; label: string }[] = [
  { value: 'Activo', label: 'Activo' },
  { value: 'Inactivo', label: 'Inactivo' },
  { value: 'Finalizado', label: 'Finalizado' },
];

export default function NewSchoolYearPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<SchoolYearFormData>({
    name: '',
    startDate: new Date(),
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    status: 'Inactivo',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createSchoolYearMutation = useMutation({
    mutationFn: (data: SchoolYearFormData) => schoolYearService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-years'] });
      navigate('/school-years');
    },
    onError: (error: any) => {
      console.error('Error al crear año escolar:', error);
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleDateChange = (name: string, value: string) => {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        setFormData(prev => ({
          ...prev,
          [name]: date,
        }));
        if (errors[name]) {
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[name];
            return newErrors;
          });
        }
      }
    } catch (error) {
      console.error('Error parsing date:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = schoolYearSchema.parse(formData);
      createSchoolYearMutation.mutate(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path) {
            newErrors[err.path[0]] = err.message;
          }
        });
        setErrors(newErrors);
      } else {
        console.error('Error inesperado:', error);
      }
    }
  };

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-lg font-semibold text-gray-900">Nuevo Año Escolar</h1>
          <p className="mt-2 text-sm text-gray-700">
            Crea un nuevo año escolar para la institución
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <Link
            to="/school-years"
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Cancelar
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-gray-200">
        <div className="space-y-8 divide-y divide-gray-200">
          <div className="pt-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-4">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nombre del Año Escolar
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ${errors.name ? 'ring-red-300' : 'ring-gray-300'} placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6`}
                    placeholder="2023-2024"
                  />
                  {errors.name && (
                    <p className="mt-2 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                  Fecha de Inicio
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CalendarIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <input
                    type="date"
                    name="startDate"
                    id="startDate"
                    value={formatDateForInput(formData.startDate)}
                    onChange={(e) => handleDateChange('startDate', e.target.value)}
                    className={`block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 shadow-sm ring-1 ring-inset ${errors.startDate ? 'ring-red-300' : 'ring-gray-300'} placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6`}
                  />
                  {errors.startDate && (
                    <p className="mt-2 text-sm text-red-600">{errors.startDate}</p>
                  )}
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                  Fecha de Fin
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CalendarIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <input
                    type="date"
                    name="endDate"
                    id="endDate"
                    value={formatDateForInput(formData.endDate)}
                    onChange={(e) => handleDateChange('endDate', e.target.value)}
                    className={`block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 shadow-sm ring-1 ring-inset ${errors.endDate ? 'ring-red-300' : 'ring-gray-300'} placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6`}
                  />
                  {errors.endDate && (
                    <p className="mt-2 text-sm text-red-600">{errors.endDate}</p>
                  )}
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                  Estado
                </label>
                <div className="mt-1">
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:max-w-xs sm:text-sm sm:leading-6"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-5">
          <div className="flex justify-end">
            <Link
              to="/school-years"
              className="rounded-md bg-white py-2 px-3 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={createSchoolYearMutation.isPending}
              className="ml-3 inline-flex justify-center rounded-md bg-primary-600 py-2 px-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:opacity-50"
            >
              {createSchoolYearMutation.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}