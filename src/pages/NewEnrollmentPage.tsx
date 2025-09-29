import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { enrollmentService } from '../services/enrollmentService';
import { userService } from '../services/userService';
import { sectionService } from '../services/sectionService';
import { schoolYearService } from '../services/schoolYearService';
import BulkEnrollment from '../components/BulkEnrollment';
import { toast } from 'sonner';

const enrollmentSchema = z.object({
  studentId: z.string().min(1, 'El estudiante es requerido'),
  sectionId: z.string().min(1, 'La sección es requerida'),
  schoolYearId: z.string().min(1, 'El año escolar es requerido'),
  enrollmentDate: z.string().optional(),
});

type EnrollmentFormData = z.infer<typeof enrollmentSchema>;

export default function NewEnrollmentPage() {
  const queryClient = useQueryClient();

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<EnrollmentFormData>({
    resolver: zodResolver(enrollmentSchema),
  });

  const sectionIdValue = watch('sectionId');
  const schoolYearIdValue = watch('schoolYearId');

  const { data: students, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['users', { role: 'student' }],
    queryFn: () => userService.getAll(),
  });

  const { data: sections, isLoading: isLoadingSections } = useQuery({
    queryKey: ['sections'],
    queryFn: sectionService.getAll,
  });

  const { data: schoolYears, isLoading: isLoadingSchoolYears } = useQuery({
    queryKey: ['schoolYears'],
    queryFn: schoolYearService.getAll,
  });

  const createEnrollmentMutation = useMutation({
    mutationFn: enrollmentService.createEnrollment,
    onSuccess: () => {
      toast.success('Estudiante matriculado exitosamente!');
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al matricular estudiante.');
    },
  });

  const onSubmit = (data: EnrollmentFormData) => {
    createEnrollmentMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-lg font-semibold text-gray-900">Matricular Estudiantes</h1>
          <p className="mt-2 text-sm text-gray-700">
            Matricular estudiantes individualmente o cargar masivamente vía CSV/Excel.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario de Matrícula Individual */}
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Matrícula Individual</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="studentId" className="block text-sm font-medium leading-6 text-gray-900">
                Estudiante *
              </label>
              <div className="mt-2">
                {isLoadingStudents ? (
                  <p>Cargando estudiantes...</p>
                ) : (
                  <select
                    id="studentId"
                    {...register('studentId')}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                  >
                    <option value="">Seleccione un estudiante</option>
                    {students?.map((student: any) => (
                      <option key={student._id.toString()} value={student._id.toString()}>
                        {student.firstName} {student.lastName} ({student.dni})
                      </option>
                    ))}
                  </select>
                )}
                {errors.studentId && <p className="mt-1 text-sm text-red-600">{errors.studentId.message}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="sectionId" className="block text-sm font-medium leading-6 text-gray-900">
                Sección *
              </label>
              <div className="mt-2">
                {isLoadingSections ? (
                  <p>Cargando secciones...</p>
                ) : (
                  <select
                    id="sectionId"
                    {...register('sectionId')}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                  >
                    <option value="">Seleccione una sección</option>
                    {sections?.map((section: any) => (
                      <option key={section.id.toString()} value={section.id.toString()}>
                        {section.name} - {section.level}
                      </option>
                    ))}
                  </select>
                )}
                {errors.sectionId && <p className="mt-1 text-sm text-red-600">{errors.sectionId.message}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="schoolYearId" className="block text-sm font-medium leading-6 text-gray-900">
                Año Escolar *
              </label>
              <div className="mt-2">
                {isLoadingSchoolYears ? (
                  <p>Cargando años escolares...</p>
                ) : (
                  <select
                    id="schoolYearId"
                    {...register('schoolYearId')}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                  >
                    <option value="">Seleccione un año escolar</option>
                    {schoolYears?.map((year: any) => (
                      <option key={year.id.toString()} value={year.id.toString()}>
                        {year.name}
                      </option>
                    ))}
                  </select>
                )}
                {errors.schoolYearId && <p className="mt-1 text-sm text-red-600">{errors.schoolYearId.message}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="enrollmentDate" className="block text-sm font-medium leading-6 text-gray-900">
                Fecha de Matrícula
              </label>
              <div className="mt-2">
                <input
                  type="date"
                  id="enrollmentDate"
                  {...register('enrollmentDate')}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
              >
                Matricular Estudiante
              </button>
            </div>
          </form>
        </div>

        {/* Sección de Carga Masiva */}
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Carga Masiva de Matrículas</h2>
          <BulkEnrollment />
        </div>
      </div>
    </div>
  );
}