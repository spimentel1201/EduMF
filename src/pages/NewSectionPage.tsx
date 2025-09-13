import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { EducationalLevel } from '@/types/staff';
import { schoolYearService } from '@/services/schoolYearService';
import { sectionService } from '@/services/sectionService';

export default function NewSectionPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
    name: '',
    grade: 1,
    level: 'Primaria' as EducationalLevel,
    schoolYearId: '',
    section: '',
    maxStudents: 30,
  });

  const sectionSchema = z.object({
    name: z.string().min(1, 'El nombre de la sección es requerido'),
    grade: z.number().min(1, 'El grado debe ser al menos 1').max(6, 'El grado no puede ser mayor a 6'),
    level: z.enum(['Inicial', 'Primaria', 'Secundaria']),
    section: z.string().min(1, 'La sección es requerida').max(1, 'Solo una letra'),
    maxStudents: z.number().min(1, 'Debe haber al menos 1 estudiante').max(50, 'Máximo 50 estudiantes'),
    schoolYearId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID de año escolar inválido'),
  });

  const { data: schoolYears = [], isLoading: isLoadingSchoolYears, error: schoolYearsError } = useQuery({
    queryKey: ['schoolYears'],
    queryFn: schoolYearService.getAll,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (schoolYears && schoolYears.length > 0 && !formData.schoolYearId) {
      setFormData(prev => ({
        ...prev,
        schoolYearId: String(schoolYears[0].id)
      }));
    }
  }, [schoolYears]);

  const createSectionMutation = useMutation({
    mutationFn: sectionService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      navigate('/sections');
    },
    onError: (error) => {
      console.error('Error creating section:', error);
      setErrors({ submit: 'Error al crear la sección. Por favor, intenta de nuevo.' });
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'grade' || name === 'maxStudents') {
      setFormData(prev => ({
        ...prev,
        [name]: parseInt(value) || 0,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }

    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // En handleSubmit, asegurar que se envíen todos los campos
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      sectionSchema.parse(formData);
      
      const backendData = {
        name: formData.name,
        grade: formData.grade,
        level: formData.level,
        section: formData.section.toUpperCase(),
        maxStudents: formData.maxStudents,
        schoolYearId: formData.schoolYearId,
        status: 'Activo',
      };
      
      createSectionMutation.mutate({
        ...backendData,
        status: 'Activo' as const
      });
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path) {
            newErrors[err.path[0]] = err.message;
          }
        });
        setErrors(newErrors);
      }
    }
  };

  if (isLoadingSchoolYears) {
    return (
      <div className="space-y-6">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-lg font-semibold text-gray-900">Nueva Sección</h1>
            <p className="mt-2 text-sm text-gray-700">Cargando años escolares...</p>
          </div>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-10 bg-gray-200 rounded mb-2"></div>
        </div>
      </div>
    );
  }

  if (schoolYearsError) {
    return (
      <div className="space-y-6">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-lg font-semibold text-gray-900">Nueva Sección</h1>
            <p className="mt-2 text-sm text-red-600">
              Error al cargar los años escolares. Por favor, intenta de nuevo.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-lg font-semibold text-gray-900">Nueva Sección</h1>
          <p className="mt-2 text-sm text-gray-700">
            Crea una nueva sección para un grado y año escolar
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <Link
            to="/sections"
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Cancelar
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white px-4 py-5 shadow sm:rounded-lg sm:p-6">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            
            {/* Nombre de la Sección */}
            <div className="sm:col-span-6">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nombre de la Sección
              </label>
              <input
                type="text"
                name="name"
                id="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ej: Sección A - 5° Primaria"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
              {errors.name && <p className="mt-2 text-sm text-red-600">{errors.name}</p>}
            </div>

            {/* Grado */}
            <div className="sm:col-span-2">
              <label htmlFor="grade" className="block text-sm font-medium text-gray-700">
                Grado
              </label>
              <select
                id="grade"
                name="grade"
                value={formData.grade}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="">Selecciona</option>
                {[1, 2, 3, 4, 5, 6].map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}° Grado
                  </option>
                ))}
              </select>
              {errors.grade && <p className="mt-2 text-sm text-red-600">{errors.grade}</p>}
            </div>

            {/* Nivel */}
            <div className="sm:col-span-2">
              <label htmlFor="level" className="block text-sm font-medium text-gray-700">
                Nivel
              </label>
              <select
                id="level"
                name="level"
                value={formData.level}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="">Selecciona</option>
                <option value="Inicial">Inicial</option>
                <option value="Primaria">Primaria</option>
                <option value="Secundaria">Secundaria</option>
              </select>
              {errors.level && <p className="mt-2 text-sm text-red-600">{errors.level}</p>}
            </div>

            {/* Sección (letra) */}
            <div className="sm:col-span-2">
              <label htmlFor="section" className="block text-sm font-medium text-gray-700">
                Sección
              </label>
              <input
                type="text"
                name="section"
                id="section"
                value={formData.section}
                onChange={handleChange}
                placeholder="A, B, C..."
                maxLength={1}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
              {errors.section && <p className="mt-2 text-sm text-red-600">{errors.section}</p>}
            </div>

            {/* Año Escolar */}
            <div className="sm:col-span-3">
              <label htmlFor="schoolYearId" className="block text-sm font-medium text-gray-700">
                Año Escolar
              </label>
              <select
                id="schoolYearId"
                name="schoolYearId"
                value={formData.schoolYearId || ''}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="">Selecciona un año escolar</option>
                {Array.isArray(schoolYears) && schoolYears.length > 0 ? (
                  schoolYears.map((year) => (
                    <option key={year.id} value={String(year.id)}>
                      {year.name}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>No hay años escolares disponibles</option>
                )}
              </select>
              {errors.schoolYearId && <p className="mt-2 text-sm text-red-600">{errors.schoolYearId}</p>}
            </div>

            {/* Máximo de Estudiantes */}
            <div className="sm:col-span-3">
              <label htmlFor="maxStudents" className="block text-sm font-medium text-gray-700">
                Máximo de Estudiantes
              </label>
              <input
                type="number"
                name="maxStudents"
                id="maxStudents"
                value={formData.maxStudents}
                onChange={handleChange}
                min="1"
                max="50"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
              {errors.maxStudents && <p className="mt-2 text-sm text-red-600">{errors.maxStudents}</p>}
            </div>
          </div>
        </div>

        {errors.submit && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{errors.submit}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={createSectionMutation.isPending}
            className="ml-3 inline-flex justify-center rounded-md bg-primary-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {createSectionMutation.isPending ? 'Creando...' : 'Crear Sección'}
          </button>
        </div>
      </form>
    </div>
  );
}