import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  UserPlusIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import { enrollmentService } from '../services/enrollmentService';
import { userService } from '../services/userService';
import { sectionService } from '../services/sectionService';
import { schoolYearService } from '../services/schoolYearService';
import BulkEnrollment from '../components/BulkEnrollment';
import { toast } from 'sonner';

const enrollmentSchema = z.object({
  studentId:      z.string().min(1, 'El estudiante es requerido'),
  sectionId:      z.string().min(1, 'La sección es requerida'),
  schoolYearId:   z.string().min(1, 'El año escolar es requerido'),
  enrollmentDate: z.string().optional(),
});

type EnrollmentFormData = z.infer<typeof enrollmentSchema>;

const FIELD_CLASS =
  'w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 transition-colors text-gray-700';
const LABEL_CLASS = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5';

export default function NewEnrollmentPage() {
  const queryClient = useQueryClient();

  const { register, handleSubmit, formState: { errors }, reset } = useForm<EnrollmentFormData>({
    resolver: zodResolver(enrollmentSchema),
  });

  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['users', { role: 'student' }],
    queryFn: () => userService.getAll(),
  });

  const { data: sections = [], isLoading: loadingSections } = useQuery({
    queryKey: ['sections'],
    queryFn: sectionService.getAll,
  });

  const { data: schoolYears = [], isLoading: loadingYears } = useQuery({
    queryKey: ['schoolYears'],
    queryFn: schoolYearService.getAll,
  });

  const mutation = useMutation({
    mutationFn: enrollmentService.createEnrollment,
    onSuccess: () => {
      toast.success('Estudiante matriculado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      reset();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? 'Error al matricular estudiante');
    },
  });

  return (
    <div className="space-y-6 pb-8">
      {/* ── Header ── */}
      <div className="flex items-start gap-3">
        <Link
          to="/enrollments"
          className="mt-1 p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 shadow-sm transition-colors flex-shrink-0"
        >
          <ArrowLeftIcon className="w-4 h-4 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1a202c' }}>Matricular Estudiantes</h1>
          <p className="text-sm mt-0.5" style={{ color: '#718096' }}>
            Matrícula individual o carga masiva vía CSV/Excel.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Individual enrollment ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-1.5 rounded-lg bg-green-100 text-green-700">
              <UserPlusIcon className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-gray-900">Matrícula Individual</h2>
          </div>

          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            {/* Student */}
            <div>
              <label className={LABEL_CLASS}>Estudiante *</label>
              {loadingStudents ? (
                <p className="text-sm text-gray-400">Cargando…</p>
              ) : (
                <select {...register('studentId')} className={FIELD_CLASS}>
                  <option value="">Seleccione un estudiante</option>
                  {(students as any[])
                    .filter((u: any) => u.role === 'student')
                    .map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} — {u.dni}
                      </option>
                    ))}
                </select>
              )}
              {errors.studentId && <p className="mt-1 text-xs text-red-500">{errors.studentId.message}</p>}
            </div>

            {/* Section */}
            <div>
              <label className={LABEL_CLASS}>Sección *</label>
              {loadingSections ? (
                <p className="text-sm text-gray-400">Cargando…</p>
              ) : (
                <select {...register('sectionId')} className={FIELD_CLASS}>
                  <option value="">Seleccione una sección</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}
              {errors.sectionId && <p className="mt-1 text-xs text-red-500">{errors.sectionId.message}</p>}
            </div>

            {/* School year */}
            <div>
              <label className={LABEL_CLASS}>Año Escolar *</label>
              {loadingYears ? (
                <p className="text-sm text-gray-400">Cargando…</p>
              ) : (
                <select {...register('schoolYearId')} className={FIELD_CLASS}>
                  <option value="">Seleccione un año escolar</option>
                  {(schoolYears as any[]).map((y: any) => (
                    <option key={y.id} value={y.id}>{y.name}</option>
                  ))}
                </select>
              )}
              {errors.schoolYearId && <p className="mt-1 text-xs text-red-500">{errors.schoolYearId.message}</p>}
            </div>

            {/* Date */}
            <div>
              <label className={LABEL_CLASS}>Fecha de Matrícula</label>
              <input type="date" {...register('enrollmentDate')} className={FIELD_CLASS} />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={mutation.isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-60"
                style={{ background: '#538f65' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#47795a')}
                onMouseLeave={e => (e.currentTarget.style.background = '#538f65')}
              >
                <UserPlusIcon className="w-4 h-4" />
                {mutation.isPending ? 'Matriculando…' : 'Matricular Estudiante'}
              </button>
            </div>
          </form>
        </div>

        {/* ── Bulk enrollment ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
              <ArrowUpTrayIcon className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-gray-900">Carga Masiva</h2>
          </div>
          <BulkEnrollment />
        </div>
      </div>
    </div>
  );
}
