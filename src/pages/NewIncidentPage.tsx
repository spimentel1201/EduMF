import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    UserCircleIcon,
    CalendarDaysIcon,
    MapPinIcon,
    DocumentTextIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';
import { Link, useNavigate } from 'react-router-dom';
import { incidentService } from '@/services/incidentService';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { userService } from '@/services/userService';
import {
    INCIDENT_TYPES,
    INCIDENT_STATUSES,
    INCIDENT_LOCATIONS,
    type IncidentType,
    type IncidentStatus
} from '@/types/incidents';
import toast from 'react-hot-toast';

const incidentSchema = z.object({
    incidentType: z.enum(['Conductual', 'Académica', 'Salud', 'Bullying', 'Daño a propiedad', 'Otro'] as const),
    incidentDate: z.string().min(1, 'La fecha del incidente es requerida'),
    reporterName: z.string().min(2, 'El nombre del informante es requerido'),
    victimId: z.string().optional(),
    aggressorId: z.string().optional(),
    isViolent: z.boolean().default(false),
    description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
    location: z.string().min(2, 'El lugar del incidente es requerido'),
    actionsTaken: z.string().optional(),
    status: z.enum(['Pendiente', 'En Proceso', 'Resuelto', 'Cerrado'] as const).default('Pendiente'),
});

type IncidentFormData = z.infer<typeof incidentSchema>;

export default function NewIncidentPage() {
    const [selectedLocation, setSelectedLocation] = useState<string>('');
    const [customLocation, setCustomLocation] = useState('');

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        setValue,
        watch,
    } = useForm<IncidentFormData>({
        resolver: zodResolver(incidentSchema),
        defaultValues: {
            incidentType: 'Conductual',
            status: 'Pendiente',
            isViolent: false,
            incidentDate: new Date().toISOString().split('T')[0],
        }
    });

    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Cargar usuarios para seleccionar víctima y agresor
    const { data: users = [] } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const response = await userService.getAll();
            return response;
        },
    });

    const createIncidentMutation = useMutation({
        mutationFn: incidentService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['incidents'] });
            toast.success('Incidencia registrada correctamente');
            navigate('/incidents');
        },
        onError: (error: any) => {
            console.error('Error creating incident:', error);
            const errorMessage = error.response?.data?.message || 'Error al registrar la incidencia';
            toast.error(errorMessage);
        },
    });

    const handleLocationSelect = (loc: string) => {
        setSelectedLocation(loc);
        setValue('location', loc);
        setCustomLocation('');
    };

    const handleCustomLocationChange = (value: string) => {
        setCustomLocation(value);
        setSelectedLocation('');
        setValue('location', value);
    };

    const onSubmit = (data: IncidentFormData) => {
        createIncidentMutation.mutate(data);
    };

    const isViolent = watch('isViolent');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="border-b border-gray-200 pb-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Registro de Incidencia Escolar</h1>
                        <p className="mt-2 text-sm text-gray-500">
                            Por favor, complete todos los campos requeridos para registrar una nueva incidencia.
                        </p>
                    </div>
                    <Link
                        to="/incidents"
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                        Cancelar
                    </Link>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                {/* Información General */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Información General</h2>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div>
                            <label htmlFor="incidentType" className="block text-sm font-medium text-gray-700">
                                Tipo de incidencia *
                            </label>
                            <select
                                id="incidentType"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                {...register('incidentType')}
                            >
                                {INCIDENT_TYPES.map((type) => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                            {errors.incidentType && (
                                <p className="mt-1 text-sm text-red-600">{errors.incidentType.message}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="incidentDate" className="block text-sm font-medium text-gray-700">
                                Fecha del incidente *
                            </label>
                            <div className="mt-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="date"
                                    id="incidentDate"
                                    className="block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                    {...register('incidentDate')}
                                />
                            </div>
                            {errors.incidentDate && (
                                <p className="mt-1 text-sm text-red-600">{errors.incidentDate.message}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Personas Involucradas */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Personas Involucradas</h2>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                        <div>
                            <label htmlFor="reporterName" className="block text-sm font-medium text-gray-700">
                                Datos del informante *
                            </label>
                            <div className="mt-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <UserCircleIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    id="reporterName"
                                    placeholder="Nombre y rol"
                                    className="block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                    {...register('reporterName')}
                                />
                            </div>
                            {errors.reporterName && (
                                <p className="mt-1 text-sm text-red-600">{errors.reporterName.message}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="victimId" className="block text-sm font-medium text-gray-700">
                                Datos del Agredido
                            </label>
                            <select
                                id="victimId"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                {...register('victimId')}
                            >
                                <option value="">Buscar alumno o personal...</option>
                                {users.map((user: any) => (
                                    <option key={user.id} value={user.id}>
                                        {user.firstName} {user.lastName} - {user.dni}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="aggressorId" className="block text-sm font-medium text-gray-700">
                                Datos del Agresor
                            </label>
                            <select
                                id="aggressorId"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                {...register('aggressorId')}
                            >
                                <option value="">Buscar alumno o personal...</option>
                                {users.map((user: any) => (
                                    <option key={user.id} value={user.id}>
                                        {user.firstName} {user.lastName} - {user.dni}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Descripción del Incidente */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Descripción del Incidente</h2>

                    {/* Toggle de violencia */}
                    <div className="mb-6">
                        <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-700 mr-4">¿Sucedió acto de violencia?</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    {...register('isViolent')}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                                <span className="ml-3 text-sm font-medium text-gray-700">
                                    {isViolent ? 'Sí' : 'No'}
                                </span>
                            </label>
                            {isViolent && (
                                <ExclamationTriangleIcon className="h-5 w-5 text-red-500 ml-2" />
                            )}
                        </div>
                    </div>

                    {/* Descripción */}
                    <div className="mb-6">
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                            Descripción de hechos *
                        </label>
                        <div className="mt-1 relative">
                            <div className="absolute top-3 left-3 pointer-events-none">
                                <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                            </div>
                            <textarea
                                id="description"
                                rows={4}
                                placeholder="Describa detalladamente lo sucedido..."
                                className="block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                {...register('description')}
                            />
                        </div>
                        {errors.description && (
                            <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                        )}
                    </div>

                    {/* Lugar */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Lugar *
                        </label>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {INCIDENT_LOCATIONS.map((loc) => (
                                <button
                                    key={loc}
                                    type="button"
                                    onClick={() => handleLocationSelect(loc)}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${selectedLocation === loc
                                            ? 'bg-primary-600 text-white border-primary-600'
                                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    {loc}
                                </button>
                            ))}
                        </div>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <MapPinIcon className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Otro lugar..."
                                value={customLocation}
                                onChange={(e) => handleCustomLocationChange(e.target.value)}
                                className="block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            />
                        </div>
                        {errors.location && (
                            <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>
                        )}
                    </div>
                </div>

                {/* Acciones y Cierre */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones y Cierre</h2>
                    <div className="space-y-6">
                        <div>
                            <label htmlFor="actionsTaken" className="block text-sm font-medium text-gray-700">
                                Medidas tomadas
                            </label>
                            <textarea
                                id="actionsTaken"
                                rows={3}
                                placeholder="Describa las acciones inmediatas o seguimiento..."
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                {...register('actionsTaken')}
                            />
                        </div>

                        <div className="sm:w-1/3">
                            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                                Estado
                            </label>
                            <div className="mt-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <CheckCircleIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <select
                                    id="status"
                                    className="block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                    {...register('status')}
                                >
                                    {INCIDENT_STATUSES.map((status) => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Botones de acción */}
                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => reset()}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={createIncidentMutation.isPending}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                    >
                        {createIncidentMutation.isPending ? 'Registrando...' : 'Registrar Incidencia'}
                    </button>
                </div>
            </form>
        </div>
    );
}
