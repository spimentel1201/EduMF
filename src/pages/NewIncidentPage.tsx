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
    reporterName: z.string().min(1, 'El nombre del informante es requerido'),
    victimId: z.string().optional().or(z.literal('')),
    aggressorId: z.string().optional().or(z.literal('')),
    isViolent: z.boolean().default(false),
    description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
    location: z.string({ required_error: 'El lugar del incidente es requerido' }).min(1, 'El lugar del incidente es requerido'),
    actionsTaken: z.string({ required_error: 'Las medidas tomadas son requeridas' }).min(1, 'Las medidas tomadas son requeridas'),
    status: z.enum(['Pendiente', 'En Proceso', 'Resuelto', 'Cerrado'] as const).default('Pendiente'),
});

type IncidentFormData = z.infer<typeof incidentSchema>;

// Interface para errores del backend
interface BackendValidationError {
    type: string;
    value: string;
    msg: string;
    path: string;
    location: string;
}

export default function NewIncidentPage() {
    const [selectedLocation, setSelectedLocation] = useState<string>('');
    const [customLocation, setCustomLocation] = useState('');
    const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        setValue,
        watch,
        setError,
    } = useForm<IncidentFormData>({
        resolver: zodResolver(incidentSchema) as any,
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

            // Limpiar errores anteriores del servidor
            setServerErrors({});

            const responseData = error.response?.data;

            // Si hay errores de validación del backend
            if (responseData?.errors && Array.isArray(responseData.errors)) {
                const fieldErrors: Record<string, string> = {};
                const errorMessages: string[] = [];

                responseData.errors.forEach((err: BackendValidationError) => {
                    // Mapear el error al campo correspondiente
                    if (err.path) {
                        fieldErrors[err.path] = err.msg;
                        // También setear el error en react-hook-form
                        setError(err.path as keyof IncidentFormData, {
                            type: 'server',
                            message: err.msg
                        });
                    }
                    errorMessages.push(err.msg);
                });

                setServerErrors(fieldErrors);

                // Mostrar toast con lista de errores
                if (errorMessages.length > 0) {
                    toast.error(
                        <div>
                            <strong>Errores de validación:</strong>
                            <ul className="mt-1 list-disc list-inside text-sm">
                                {errorMessages.slice(0, 3).map((msg, idx) => (
                                    <li key={idx}>{msg}</li>
                                ))}
                                {errorMessages.length > 3 && (
                                    <li>...y {errorMessages.length - 3} más</li>
                                )}
                            </ul>
                        </div>,
                        { duration: 5000 }
                    );
                }
            } else {
                // Error general
                const errorMessage = responseData?.message || 'Error al registrar la incidencia';
                toast.error(errorMessage);
            }
        },
    });

    const handleLocationSelect = (loc: string) => {
        setSelectedLocation(loc);
        setValue('location', loc);
        setCustomLocation('');
        // Limpiar error del servidor para este campo
        if (serverErrors.location) {
            setServerErrors(prev => ({ ...prev, location: '' }));
        }
    };

    const handleCustomLocationChange = (value: string) => {
        setCustomLocation(value);
        setSelectedLocation('');
        setValue('location', value);
        // Limpiar error del servidor para este campo
        if (serverErrors.location) {
            setServerErrors(prev => ({ ...prev, location: '' }));
        }
    };

    const onSubmit = (data: IncidentFormData) => {
        setServerErrors({});
        createIncidentMutation.mutate(data);
    };

    const isViolent = watch('isViolent');

    // Helper para obtener el mensaje de error (primero local, luego del servidor)
    const getFieldError = (fieldName: keyof IncidentFormData) => {
        return errors[fieldName]?.message || serverErrors[fieldName];
    };

    return (
        <div className="max-w-4xl mx-auto pb-10 space-y-8 font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-[2rem] font-bold text-gray-800 leading-tight">Registro de Incidencia Escolar</h1>
                    <p className="text-[15px] font-medium text-gray-500 mt-1">
                        Por favor, complete todos los campos requeridos para registrar una nueva incidencia.
                    </p>
                </div>
                <Link
                    to="/incidents"
                    className="inline-flex items-center px-6 py-2.5 bg-white border border-[#EBE8DD] text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                >
                    Cancelar
                </Link>
            </div>

            <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-8">
                {/* Información General */}
                <div className="bg-white border border-[#EBE8DD] rounded-[2rem] p-8 shadow-sm">
                    <h2 className="text-lg font-bold text-gray-800 mb-6">Información General</h2>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div>
                            <label htmlFor="incidentType" className="block text-sm font-bold text-gray-700 mb-2">
                                Tipo de incidencia <span className="text-[#D24545]">*</span>
                            </label>
                            <select
                                id="incidentType"
                                className={`block w-full rounded-xl py-3 px-4 bg-[#FAF9F6] border text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#538f65]/40 transition-colors sm:text-sm ${getFieldError('incidentType')
                                        ? 'border-red-300 focus:border-red-500'
                                        : 'border-[#EBE8DD]'
                                    }`}
                                {...register('incidentType')}
                            >
                                {INCIDENT_TYPES.map((type) => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                            {getFieldError('incidentType') && (
                                <p className="mt-2 text-[13px] font-bold text-[#D24545]">{getFieldError('incidentType')}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="incidentDate" className="block text-sm font-bold text-gray-700 mb-2">
                                Fecha del incidente <span className="text-[#D24545]">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="date"
                                    id="incidentDate"
                                    className={`block w-full pl-12 pr-4 py-3 rounded-xl bg-[#FAF9F6] border text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#538f65]/40 transition-colors sm:text-sm ${getFieldError('incidentDate')
                                            ? 'border-red-300 focus:border-red-500'
                                            : 'border-[#EBE8DD]'
                                        }`}
                                    {...register('incidentDate')}
                                />
                            </div>
                            {getFieldError('incidentDate') && (
                                <p className="mt-2 text-[13px] font-bold text-[#D24545]">{getFieldError('incidentDate')}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Personas Involucradas */}
                <div className="bg-white border border-[#EBE8DD] rounded-[2rem] p-8 shadow-sm">
                    <h2 className="text-lg font-bold text-gray-800 mb-6">Personas Involucradas</h2>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                        <div>
                            <label htmlFor="reporterName" className="block text-sm font-bold text-gray-700 mb-2">
                                Datos del informante <span className="text-[#D24545]">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <UserCircleIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    id="reporterName"
                                    placeholder="Nombre y rol"
                                    className={`block w-full pl-12 pr-4 py-3 rounded-xl bg-[#FAF9F6] border text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#538f65]/40 transition-colors sm:text-sm ${getFieldError('reporterName')
                                            ? 'border-red-300 focus:border-red-500'
                                            : 'border-[#EBE8DD]'
                                        }`}
                                    {...register('reporterName')}
                                />
                            </div>
                            {getFieldError('reporterName') && (
                                <p className="mt-2 text-[13px] font-bold text-[#D24545]">{getFieldError('reporterName')}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="victimId" className="block text-sm font-bold text-[#4B79A1] mb-2">
                                Datos del Agredido
                            </label>
                            <select
                                id="victimId"
                                className="block w-full rounded-xl bg-[#F0F7FF] border-[#DCEAFC] py-3 px-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-colors sm:text-sm"
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
                            <label htmlFor="aggressorId" className="block text-sm font-bold text-[#D24545] mb-2">
                                Datos del Agresor
                            </label>
                            <select
                                id="aggressorId"
                                className="block w-full rounded-xl bg-[#FFF5F5] border-[#FCE8E8] py-3 px-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/40 transition-colors sm:text-sm"
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
                <div className="bg-white border border-[#EBE8DD] rounded-[2rem] p-8 shadow-sm">
                    <h2 className="text-lg font-bold text-gray-800 mb-6">Descripción del Incidente</h2>

                    {/* Toggle de violencia */}
                    <div className="mb-6 p-5 bg-[#FAF9F6] border border-[#EBE8DD] rounded-2xl flex items-center justify-between">
                        <div>
                            <span className="block text-sm font-bold text-gray-800">¿Sucedió acto de violencia?</span>
                            <span className="block text-[13px] font-medium text-gray-500 mt-1">Marque si hubo agresión física o verbal directa</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    {...register('isViolent')}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D24545]"></div>
                            </label>
                            <span className={`text-sm font-bold w-6 ${isViolent ? 'text-[#D24545]' : 'text-gray-400'}`}>
                                {isViolent ? 'Sí' : 'No'}
                            </span>
                            {isViolent && (
                                <ExclamationTriangleIcon className="h-5 w-5 text-[#D24545]" />
                            )}
                        </div>
                    </div>

                    {/* Descripción */}
                    <div className="mb-6">
                        <label htmlFor="description" className="block text-sm font-bold text-gray-700 mb-2">
                            Descripción de hechos <span className="text-[#D24545]">*</span>
                        </label>
                        <div className="relative">
                            <div className="absolute top-4 left-4 pointer-events-none">
                                <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                            </div>
                            <textarea
                                id="description"
                                rows={4}
                                placeholder="Describa detalladamente lo sucedido..."
                                className={`block w-full pl-12 pr-4 py-4 rounded-xl bg-[#FAF9F6] border text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#538f65]/40 transition-colors sm:text-sm ${getFieldError('description')
                                        ? 'border-red-300 focus:border-red-500'
                                        : 'border-[#EBE8DD]'
                                    }`}
                                {...register('description')}
                            />
                        </div>
                        {getFieldError('description') && (
                            <p className="mt-2 text-[13px] font-bold text-[#D24545]">{getFieldError('description')}</p>
                        )}
                    </div>

                    {/* Lugar */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-3">
                            Lugar <span className="text-[#D24545]">*</span>
                        </label>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {INCIDENT_LOCATIONS.map((loc) => (
                                <button
                                    key={loc}
                                    type="button"
                                    onClick={() => handleLocationSelect(loc)}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${selectedLocation === loc
                                        ? 'bg-[#538f65] text-white border-[#538f65]'
                                        : 'bg-white text-gray-600 border-[#EBE8DD] hover:bg-gray-50'
                                        }`}
                                >
                                    {loc}
                                </button>
                            ))}
                        </div>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <MapPinIcon className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Otro lugar..."
                                value={customLocation}
                                onChange={(e) => handleCustomLocationChange(e.target.value)}
                                className={`block w-full pl-12 pr-4 py-3 rounded-xl bg-[#FAF9F6] border text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#538f65]/40 transition-colors sm:text-sm ${getFieldError('location')
                                        ? 'border-red-300 focus:border-red-500'
                                        : 'border-[#EBE8DD]'
                                    }`}
                            />
                        </div>
                        {getFieldError('location') && (
                            <p className="mt-2 text-[13px] font-bold text-[#D24545]">{getFieldError('location')}</p>
                        )}
                    </div>
                </div>

                {/* Acciones y Cierre */}
                <div className="bg-white border border-[#EBE8DD] rounded-[2rem] p-8 shadow-sm">
                    <h2 className="text-lg font-bold text-gray-800 mb-6">Acciones y Cierre</h2>
                    <div className="space-y-6">
                        <div>
                            <label htmlFor="actionsTaken" className="block text-sm font-bold text-gray-700 mb-2">
                                Medidas tomadas <span className="text-[#D24545]">*</span>
                            </label>
                            <textarea
                                id="actionsTaken"
                                rows={3}
                                placeholder="Describa las acciones inmediatas o seguimiento..."
                                className={`block w-full p-4 rounded-xl bg-[#FAF9F6] border text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#538f65]/40 transition-colors sm:text-sm ${getFieldError('actionsTaken')
                                        ? 'border-red-300 focus:border-red-500'
                                        : 'border-[#EBE8DD]'
                                    }`}
                                {...register('actionsTaken')}
                            />
                            {getFieldError('actionsTaken') && (
                                <p className="mt-2 text-[13px] font-bold text-[#D24545]">{getFieldError('actionsTaken')}</p>
                            )}
                        </div>

                        <div className="sm:w-1/3">
                            <label htmlFor="status" className="block text-sm font-bold text-gray-700 mb-2">
                                Estado
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <CheckCircleIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <select
                                    id="status"
                                    className="block w-full pl-12 pr-4 py-3 rounded-xl bg-[#FAF9F6] border border-[#EBE8DD] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#538f65]/40 transition-colors sm:text-sm"
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
                <div className="flex justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={() => reset()}
                        className="px-6 py-3 border border-[#EBE8DD] rounded-xl shadow-sm text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={createIncidentMutation.isPending}
                        className="px-8 py-3 rounded-xl shadow-sm text-sm font-bold text-white bg-[#538f65] hover:bg-[#3f7350] focus:outline-none transition-colors disabled:opacity-50"
                    >
                        {createIncidentMutation.isPending ? 'Registrando...' : 'Registrar Incidencia'}
                    </button>
                </div>
            </form>
        </div>
    );
}
