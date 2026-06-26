import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ClockIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { TimeSlotFormData, TimeSlotType, TimeSlotStatus, TIME_SLOT_TYPES, TIME_SLOT_STATUSES } from '@/types/academic';
import { timeSlotService } from '@/services/timeSlotService';

const timeSlotSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  startTime: z.string().min(1, 'La hora de inicio es requerida'),
  endTime: z.string().min(1, 'La hora de fin es requerida'),
  type: z.enum(TIME_SLOT_TYPES as [string, ...string[]]),
  status: z.enum(TIME_SLOT_STATUSES as [string, ...string[]])
}).refine((data) => {
  const start = new Date(`2000-01-01T${data.startTime}:00`);
  const end = new Date(`2000-01-01T${data.endTime}:00`);
  return end > start;
}, {
  message: 'La hora de fin debe ser mayor que la de inicio',
  path: ['endTime']
});

type TimeSlotFormDataLocal = z.infer<typeof timeSlotSchema>;

export default function EditTimeSlotPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: timeSlot, isLoading } = useQuery({
    queryKey: ['timeSlot', id],
    queryFn: () => timeSlotService.getById(id!),
    enabled: !!id,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    watch
  } = useForm<TimeSlotFormDataLocal>({
    resolver: zodResolver(timeSlotSchema),
    defaultValues: {
      name: '',
      startTime: '',
      endTime: '',
      type: 'Clase',
      status: 'Activo'
    },
    mode: 'onChange'
  });

  useEffect(() => {
    if (timeSlot) {
      reset({
        name: timeSlot.name,
        startTime: timeSlot.startTime,
        endTime: timeSlot.endTime,
        type: timeSlot.type,
        status: timeSlot.status
      });
    }
  }, [timeSlot, reset]);

  const startTime = watch('startTime');
  const endTime = watch('endTime');
  const selectedType = watch('type');

  const updateTimeSlotMutation = useMutation({
    mutationFn: (data: TimeSlotFormData) => timeSlotService.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeSlots'] });
      navigate('/time-slots');
    },
    onError: (error) => {
      console.error('Error updating time slot:', error);
      alert('Error al actualizar el horario');
    }
  });

  const onSubmit = (data: TimeSlotFormDataLocal) => {
    updateTimeSlotMutation.mutate({
      name: data.name,
      startTime: data.startTime,
      endTime: data.endTime,
      type: data.type as TimeSlotType,
      status: data.status as TimeSlotStatus
    });
  };

  const calculateDuration = () => {
    if (startTime && endTime) {
      const start = new Date(`2000-01-01T${startTime}:00`);
      const end = new Date(`2000-01-01T${endTime}:00`);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';
      const diffMs = end.getTime() - start.getTime();
      const diffMinutes = diffMs / (1000 * 60);

      if (diffMinutes >= 60) {
        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
      } else {
        return `${diffMinutes > 0 ? diffMinutes : 0} minutos`;
      }
    }
    return '';
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Clase': return 'bg-blue-100 text-blue-800';
      case 'Receso': return 'bg-yellow-100 text-yellow-800';
      case 'Almuerzo': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Cargando horario...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900">Editar Horario</h3>
            <p className="mt-2 max-w-4xl text-sm text-gray-500">
              Modifica la información de este horario.
            </p>
          </div>
          <Link
            to="/time-slots"
            className="inline-flex items-center px-4 py-2 bg-gray-100 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Volver a Horarios
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <div className="mb-8">
              <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                <ClockIcon className="h-5 w-5 mr-2 text-[#538f65]" />
                Información del Horario
              </h4>

              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nombre del Horario *</label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="name"
                      className="block w-full border-gray-300 rounded-xl shadow-sm focus:ring-[#538f65] focus:border-[#538f65] sm:text-sm"
                      {...register('name')}
                    />
                  </div>
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700">Tipo *</label>
                  <div className="mt-1">
                    <select
                      id="type"
                      className="block w-full border-gray-300 rounded-xl shadow-sm focus:ring-[#538f65] focus:border-[#538f65] sm:text-sm"
                      {...register('type')}
                    >
                      {TIME_SLOT_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">Hora de Inicio *</label>
                  <div className="mt-1">
                    <input
                      type="time"
                      id="startTime"
                      className="block w-full border-gray-300 rounded-xl shadow-sm focus:ring-[#538f65] focus:border-[#538f65] sm:text-sm"
                      {...register('startTime')}
                    />
                  </div>
                  {errors.startTime && <p className="mt-1 text-sm text-red-600">{errors.startTime.message}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">Hora de Fin *</label>
                  <div className="mt-1">
                    <input
                      type="time"
                      id="endTime"
                      className="block w-full border-gray-300 rounded-xl shadow-sm focus:ring-[#538f65] focus:border-[#538f65] sm:text-sm"
                      {...register('endTime')}
                    />
                  </div>
                  {errors.endTime && <p className="mt-1 text-sm text-red-600">{errors.endTime.message}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700">Estado *</label>
                  <div className="mt-1">
                    <select
                      id="status"
                      className="block w-full border-gray-300 rounded-xl shadow-sm focus:ring-[#538f65] focus:border-[#538f65] sm:text-sm"
                      {...register('status')}
                    >
                      {TIME_SLOT_STATUSES.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                  {errors.status && <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>}
                </div>

                {startTime && endTime && (
                  <div className="sm:col-span-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Horario: {startTime} - {endTime}</p>
                          <p className="text-sm text-gray-500">Duración: {calculateDuration()}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getTypeColor(selectedType)}`}>
                            {selectedType}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-5">
              <button
                type="button"
                className="px-5 py-2.5 bg-gray-100 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-200 transition-colors"
                onClick={() => navigate('/time-slots')}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!isValid || updateTimeSlotMutation.isPending}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ background: '#538f65' }}
              >
                {updateTimeSlotMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
