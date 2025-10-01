import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ClockIcon,
  UserGroupIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import {
  CourseScheduleFormData,
  CourseScheduleStatus,
} from '@/types/academic';
import { DayOfWeek } from '@/types/staff';
import { courseScheduleService } from '@/services/courseScheduleService';
import { staffService } from '@/services/staffService';
import { courseService } from '@/services/courseService';
import { sectionService } from '@/services/sectionService';
import { schoolYearService } from '@/services/schoolYearService';
import { timeSlotService } from '@/services/timeSlotService';

// Solo días laborables (lunes a viernes)
const WORK_DAYS: DayOfWeek[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const SCHEDULE_STATUSES: CourseScheduleStatus[] = ['Activo', 'Inactivo'];

const scheduleSchema = z.object({
  courseId: z.string().min(1, 'Debe seleccionar un curso'),
  sectionId: z.string().min(1, 'Debe seleccionar una sección'),
  staffId: z.string().min(1, 'Debe seleccionar un miembro del personal'),
  dayOfWeek: z.enum(WORK_DAYS as [string, ...string[]]),
  timeSlotId: z.string().min(1, 'Debe seleccionar un horario'),
  schoolYearId: z.string().min(1, 'Debe seleccionar un año escolar'),
  classroom: z.string().min(1, 'Debe especificar el aula'),
  status: z.enum(SCHEDULE_STATUSES as [string, ...string[]])
});

type ScheduleFormDataLocal = z.infer<typeof scheduleSchema>;

export default function NewSchedulePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    watch
  } = useForm<ScheduleFormDataLocal>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      courseId: '',
      sectionId: '',
      staffId: '',
      dayOfWeek: '',
      timeSlotId: '',
      schoolYearId: '',
      classroom: '',
      status: 'Activo'
    },
    mode: 'onChange'
  });

  

  const selectedStaffId = watch('staffId');
  const selectedTimeSlotId = watch('timeSlotId');
  const selectedDay = watch('dayOfWeek');
  const selectedClassroom = watch('classroom');

  // Queries para obtener datos
  const { data: staffData, isLoading: isLoadingStaff, error: staffError } = useQuery({
    queryKey: ['staff'],
    queryFn: staffService.getAll,
  });

  const { data: coursesData, isLoading: isLoadingCourses } = useQuery({
    queryKey: ['courses'],
    queryFn: courseService.getAll,
  });

  const { data: sectionsData, isLoading: isLoadingSections } = useQuery({
    queryKey: ['sections'],
    queryFn: sectionService.getAll,
  });

  const { data: schoolYearsData, isLoading: isLoadingSchoolYears } = useQuery({
    queryKey: ['schoolYears'],
    queryFn: schoolYearService.getAll,
  });

  const { data: timeSlotsData, isLoading: isLoadingTimeSlots } = useQuery({
    queryKey: ['timeSlots'],
    queryFn: timeSlotService.getAll,
  });

  const createScheduleMutation = useMutation({
    mutationFn: (data: CourseScheduleFormData) => courseScheduleService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      navigate('/schedules');
    },
    onError: (error) => {
      console.error('Error creating schedule:', error);
      alert('Error al crear el horario');
    }
  });

  const onSubmit = (data: ScheduleFormDataLocal) => {

    // Validate that we have actual IDs, not display names
    const validateId = (id: string, fieldName: string) => {
      if (!id || id.length < 10) { // ObjectIds are typically 24 characters, but at least should be longer than display names
        console.error(`Invalid ${fieldName} ID:`, id);
        alert(`Error: ${fieldName} no válido. Por favor, seleccione una opción válida.`);
        return false;
      }
      return true;
    };

    // Validate all ID fields
    if (!validateId(data.courseId, 'Curso') ||
      !validateId(data.sectionId, 'Sección') ||
      !validateId(data.staffId, 'Personal') ||
      !validateId(data.timeSlotId, 'Horario') ||
      !validateId(data.schoolYearId, 'Año Escolar')) {
      return;
    }

    const backendData: CourseScheduleFormData = {
      courseId: data.courseId,
      sectionId: data.sectionId,
      teacherId: data.staffId,
      dayOfWeek: data.dayOfWeek as DayOfWeek,
      timeSlotId: data.timeSlotId,
      schoolYearId: data.schoolYearId,
      classroom: data.classroom,
      status: data.status as CourseScheduleStatus
    };
    createScheduleMutation.mutate(backendData);
  };



  const getDayColor = (day: string) => {
    const colors: { [key: string]: string } = {
      'Lunes': 'bg-blue-100 text-blue-800',
      'Martes': 'bg-green-100 text-green-800',
      'Miércoles': 'bg-yellow-100 text-yellow-800',
      'Jueves': 'bg-purple-100 text-purple-800',
      'Viernes': 'bg-red-100 text-red-800'
    };
    return colors[day] || 'bg-gray-100 text-gray-800';
  };

  const isLoading = isLoadingStaff || isLoadingCourses || isLoadingSections || isLoadingSchoolYears || isLoadingTimeSlots;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-5">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Crear Nuevo Horario</h3>
        </div>
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (staffError) {
    return (
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-5">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Crear Nuevo Horario</h3>
        </div>
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="text-center">
              <p className="text-red-600">Error al cargar el personal</p>
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['staff'] })}
                className="mt-2 text-primary-600 hover:text-primary-500"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const availableStaff = staffData || [];
  const availableCourses = coursesData || [];
  const availableSections = sectionsData || [];
  const availableSchoolYears = schoolYearsData || [];
  const availableTimeSlots = timeSlotsData || [];

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900">Crear Nuevo Horario</h3>
            <p className="mt-2 max-w-4xl text-sm text-gray-500">
              Asigna horarios de trabajo al personal (Lunes a Viernes)
            </p>
          </div>
          <Link
            to="/schedules"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Volver a Horarios
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">

            {/* Información Básica */}
            <div className="mb-8">
              <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                <UserGroupIcon className="h-5 w-5 mr-2 text-primary-600" />
                Información Básica
              </h4>
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">

                {/* Año Escolar */}
                <div className="sm:col-span-2">
                  <label htmlFor="schoolYearId" className="block text-sm font-medium text-gray-700">
                    Año Escolar *
                  </label>
                  <div className="mt-1">
                    <select
                      id="schoolYearId"
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      {...register('schoolYearId')}
                    >
                      <option value="">Seleccionar año escolar</option>
                      {availableSchoolYears.map((year) => (
                        <option key={year.id} value={year.id}>
                          {year.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.schoolYearId && (
                    <p className="mt-1 text-sm text-red-600">{errors.schoolYearId.message}</p>
                  )}
                </div>

                {/* Curso */}
                <div className="sm:col-span-2">
                  <label htmlFor="courseId" className="block text-sm font-medium text-gray-700">
                    Curso *
                  </label>
                  <div className="mt-1">
                    <select
                      id="courseId"
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      {...register('courseId')}
                    >
                      <option value="">Seleccionar curso</option>
                      {availableCourses.map((course) => (
                        <option key={course.id } value={course.id }>
                          {course.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.courseId && (
                    <p className="mt-1 text-sm text-red-600">{errors.courseId.message}</p>
                  )}
                </div>

                {/* Sección */}
                <div className="sm:col-span-2">
                  <label htmlFor="sectionId" className="block text-sm font-medium text-gray-700">
                    Sección *
                  </label>
                  <div className="mt-1">
                    <select
                      id="sectionId"
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      {...register('sectionId')}
                    >
                      <option value="">Seleccionar sección</option>
                      {availableSections.map((section) => (
                        <option key={section._id} value={section._id}>
                          {section.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.sectionId && (
                    <p className="mt-1 text-sm text-red-600">{errors.sectionId.message}</p>
                  )}
                </div>

                {/* Personal */}
                <div className="sm:col-span-6">
                  <label htmlFor="staffId" className="block text-sm font-medium text-gray-700">
                    Personal Asignado *
                  </label>
                  <div className="mt-1">
                    <select
                      id="staffId"
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      {...register('staffId')}
                    >
                      <option value="">Seleccionar personal</option>
                      {availableStaff.map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.firstName} {staff.lastName} - {staff.role}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.staffId && (
                    <p className="mt-1 text-sm text-red-600">{errors.staffId.message}</p>
                  )}

                  {/* Vista previa del personal seleccionado */}
                  {selectedStaffId && (
                    <div className="mt-3">
                      {(() => {
                        const selectedStaff = availableStaff.find(staff => (staff.id) === selectedStaffId);
                        return selectedStaff ? (
                          <div className="flex items-center p-3 border border-primary-200 bg-primary-50 rounded-md">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                                <span className="text-xs font-medium text-primary-700">
                                  {selectedStaff.firstName.charAt(0)}{selectedStaff.lastName.charAt(0)}
                                </span>
                              </div>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">
                                {selectedStaff.firstName} {selectedStaff.lastName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {selectedStaff.role} • {selectedStaff.level}
                              </p>
                            </div>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Configuración del Horario */}
            <div className="mb-8">
              <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                <ClockIcon className="h-5 w-5 mr-2 text-primary-600" />
                Configuración del Horario
              </h4>
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">

                <div className="sm:col-span-2">
                  <label htmlFor="dayOfWeek" className="block text-sm font-medium text-gray-700">
                    Día de la Semana *
                  </label>
                  <div className="mt-1">
                    <select
                      id="dayOfWeek"
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      {...register('dayOfWeek')}
                    >
                      <option value="">Seleccionar día</option>
                      {WORK_DAYS.map((day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.dayOfWeek && (
                    <p className="mt-1 text-sm text-red-600">{errors.dayOfWeek.message}</p>
                  )}
                </div>

                <div className="sm:col-span-4">
                  <label htmlFor="timeSlotId" className="block text-sm font-medium text-gray-700">
                    Horario *
                  </label>
                  <div className="mt-1">
                    <select
                      id="timeSlotId"
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      {...register('timeSlotId')}
                    >
                      <option value="">Seleccionar horario</option>
                      {availableTimeSlots.map((timeSlot) => (
                        <option key={timeSlot.id} value={timeSlot.id}>
                          {timeSlot.name} ({timeSlot.startTime} - {timeSlot.endTime})
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.timeSlotId && (
                    <p className="mt-1 text-sm text-red-600">{errors.timeSlotId.message}</p>
                  )}
                </div>

                {/* Resumen del horario seleccionado */}
                {selectedTimeSlotId && (
                  <div className="sm:col-span-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          {(() => {
                            const selectedTimeSlot = availableTimeSlots.find(slot => slot.id === selectedTimeSlotId);
                            return selectedTimeSlot ? (
                              <>
                                <p className="text-sm font-medium text-gray-700">
                                  {selectedTimeSlot.name}: {selectedTimeSlot.startTime} - {selectedTimeSlot.endTime}
                                </p>
                                <p className="text-sm text-gray-500">
                                  Tipo: {selectedTimeSlot.type}
                                  {selectedClassroom && ` • Aula: ${selectedClassroom}`}
                                </p>
                              </>
                            ) : null;
                          })()}
                        </div>
                        {selectedDay && (
                          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${getDayColor(selectedDay)}`}>
                            {selectedDay}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}



                <div className="sm:col-span-3">
                  <label htmlFor="classroom" className="block text-sm font-medium text-gray-700">
                    Aula *
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="classroom"
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      placeholder="Ej: Aula 101, Lab. Ciencias, etc."
                      {...register('classroom')}
                    />
                  </div>
                  {errors.classroom && (
                    <p className="mt-1 text-sm text-red-600">{errors.classroom.message}</p>
                  )}
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                    Estado *
                  </label>
                  <div className="mt-1">
                    <select
                      id="status"
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      {...register('status')}
                    >
                      {SCHEDULE_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Debug section - Remove in production */}
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <h5 className="text-sm font-medium text-yellow-800 mb-2">Debug Info (Remove in production)</h5>
              <div className="text-xs text-yellow-700 space-y-1">
                <div>Selected Course ID: {watch('courseId')}</div>
                <div>Selected Section ID: {watch('sectionId')}</div>
                <div>Selected Staff ID: {watch('staffId')}</div>
                <div>Selected TimeSlot ID: {watch('timeSlotId')}</div>
                <div>Selected SchoolYear ID: {watch('schoolYearId')}</div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                onClick={() => {
                  reset();
                }}
              >
                Limpiar
              </button>
              <button
                type="submit"
                disabled={!isValid || createScheduleMutation.isPending}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createScheduleMutation.isPending ? 'Creando...' : 'Crear Horario'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}