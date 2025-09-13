import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
    ClockIcon,
    PlusIcon,
    PencilIcon,
    TrashIcon,
    EyeIcon
} from '@heroicons/react/24/outline';
import { timeSlotService } from '@/services/timeSlotService';
import type { TimeSlot } from '@/types/academic';

export default function TimeSlotsPage() {
    const queryClient = useQueryClient();

    const { data: timeSlots, isLoading, error } = useQuery({
        queryKey: ['timeSlots'],
        queryFn: timeSlotService.getAll,
    });

    const deleteTimeSlotMutation = useMutation({
        mutationFn: (id: string) => timeSlotService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timeSlots'] });
        },
        onError: (error) => {
            console.error('Error deleting time slot:', error);
            alert('Error al eliminar el horario');
        }
    });

    const handleDelete = (timeSlot: TimeSlot) => {
        if (window.confirm(`¿Estás seguro de que quieres eliminar el horario "${timeSlot.name}"?`)) {
            deleteTimeSlotMutation.mutate(timeSlot.id);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Activo':
                return 'bg-green-100 text-green-800';
            case 'Inactivo':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'Clase':
                return 'bg-blue-100 text-blue-800';
            case 'Receso':
                return 'bg-yellow-100 text-yellow-800';
            case 'Almuerzo':
                return 'bg-orange-100 text-orange-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="border-b border-gray-200 pb-5">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">Horarios</h3>
                </div>
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <div className="animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                            <div className="space-y-3">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="h-16 bg-gray-200 rounded"></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <div className="border-b border-gray-200 pb-5">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">Horarios</h3>
                </div>
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <div className="text-center">
                            <p className="text-red-600">Error al cargar los horarios</p>
                            <button
                                onClick={() => queryClient.invalidateQueries({ queryKey: ['timeSlots'] })}
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

    const availableTimeSlots = timeSlots || [];

    return (
        <div className="space-y-6">
            <div className="border-b border-gray-200 pb-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-medium leading-6 text-gray-900">Horarios</h3>
                        <p className="mt-2 max-w-4xl text-sm text-gray-500">
                            Gestiona los horarios disponibles para las clases
                        </p>
                    </div>
                    <Link
                        to="/time-slots/new"
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Nuevo Horario
                    </Link>
                </div>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                    {availableTimeSlots.length === 0 ? (
                        <div className="text-center py-12">
                            <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay horarios</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Comienza creando un nuevo horario.
                            </p>
                            <div className="mt-6">
                                <Link
                                    to="/time-slots/new"
                                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                                >
                                    <PlusIcon className="h-4 w-4 mr-2" />
                                    Nuevo Horario
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Nombre
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Horario
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Tipo
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Estado
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {availableTimeSlots.map((timeSlot) => (
                                        <tr key={timeSlot.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0">
                                                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                                                            <ClockIcon className="h-5 w-5 text-primary-600" />
                                                        </div>
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {timeSlot.name}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">
                                                    {timeSlot.startTime} - {timeSlot.endTime}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(timeSlot.type)}`}>
                                                    {timeSlot.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(timeSlot.status)}`}>
                                                    {timeSlot.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <Link
                                                        to={`/time-slots/${timeSlot.id}`}
                                                        className="text-primary-600 hover:text-primary-900"
                                                        title="Ver detalles"
                                                    >
                                                        <EyeIcon className="h-4 w-4" />
                                                    </Link>
                                                    <Link
                                                        to={`/time-slots/${timeSlot.id}/edit`}
                                                        className="text-indigo-600 hover:text-indigo-900"
                                                        title="Editar"
                                                    >
                                                        <PencilIcon className="h-4 w-4" />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(timeSlot)}
                                                        className="text-red-600 hover:text-red-900"
                                                        title="Eliminar"
                                                        disabled={deleteTimeSlotMutation.isPending}
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}