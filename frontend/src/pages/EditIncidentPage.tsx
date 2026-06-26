import { useState, useEffect } from 'react';
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
import { Link, useNavigate, useParams } from 'react-router-dom';
import { incidentService } from '@/services/incidentService';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { userService } from '@/services/userService';
import {
    INCIDENT_TYPES,
    INCIDENT_STATUSES,
    INCIDENT_LOCATIONS,
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

export default function EditIncidentPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [selectedLocation, setSelectedLocation] = useState<string>('');
    const [customLocation, setCustomLocation] = useState('');
    const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

    const { data: users = [] } = useQuery({
        queryKey: ['users'],
        queryFn: userService.getAll,
    });

    const { data: incident, isLoading, error: fetchError } = useQuery({
        queryKey: ['incident', id],
        queryFn: () => incidentService.getById(id!),
        enabled: !!id,
    });

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
    });

    useEffect(() => {
        if (incident) {
            reset({
                incidentType: incident.incidentType as any,
                incidentDate: incident.incidentDate.split('T')[0],
                reporterName: incident.reporterName,
                victimId: incident.victim?.id || '',
                aggressorId: incident.aggressor?.id || '',
                isViolent: incident.isViolent,
                description: incident.description,
                location: incident.location,
                actionsTaken: incident.actionsTaken,
                status: incident.status as any,
            });

            if (INCIDENT_LOCATIONS.includes(incident.location as any)) {
                setSelectedLocation(incident.location);
            } else {
                setCustomLocation(incident.location);
            }
        }
    }, [incident, reset]);

    const updateIncidentMutation = useMutation({
        mutationFn: (data: IncidentFormData) => incidentService.update(id!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['incidents'] });
            toast.success('Incidencia actualizada correctamente');
            navigate('/incidents');
        },
        onError: (error: any) => {
            setServerErrors({});
            const responseData = error.response?.data;
            if (responseData?.errors && Array.isArray(responseData.errors)) {
                const fieldErrors: Record<string, string> = {};
                responseData.errors.forEach((err: any) => {
                    if (err.path) {
                        fieldErrors[err.path] = err.msg;
                        setError(err.path as keyof IncidentFormData, { type: 'server', message: err.msg });
                    }
                });
                setServerErrors(fieldErrors);
                toast.error('Errores de validación');
            } else {
                toast.error(responseData?.message || 'Error al actualizar la incidencia');
            }
        },
    });

    const handleLocationSelect = (loc: string) => {
        setSelectedLocation(loc);
        setValue('location', loc);
        setCustomLocation('');
        if (serverErrors.location) setServerErrors(prev => ({ ...prev, location: '' }));
    };

    const handleCustomLocationChange = (value: string) => {
        setCustomLocation(value);
        setSelectedLocation('');
        setValue('location', value);
        if (serverErrors.location) setServerErrors(prev => ({ ...prev, location: '' }));
    };

    const onSubmit = (data: IncidentFormData) => {
        setServerErrors({});
        updateIncidentMutation.mutate(data);
    };

    const isViolent = watch('isViolent');

    const getFieldError = (fieldName: keyof IncidentFormData) => {
        return errors[fieldName]?.message || serverErrors[fieldName];
    };

    if (isLoading) return <div className="text-center py-12">Cargando...</div>;
    if (fetchError || !incident) return <div className="text-center py-12 text-red-500">Error al cargar datos</div>;

    return (
        <div className="max-w-4xl mx-auto pb-10 space-y-8 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-[2rem] font-bold text-gray-800 leading-tight">Editar Incidencia Escolar</h1>
                    <p className="text-[15px] font-medium text-gray-500 mt-1">Actualice la información de la incidencia.</p>
                </div>
                <Link to="/incidents" className="inline-flex items-center px-6 py-2.5 bg-white border border-[#EBE8DD] text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
                    Cancelar
                </Link>
            </div>

            <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-8">
                <div className="bg-white border border-[#EBE8DD] rounded-[2rem] p-8 shadow-sm">
                    <h2 className="text-lg font-bold text-gray-800 mb-6">Información General</h2>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Tipo de incidencia <span className="text-[#D24545]">*</span></label>
                            <select className={`block w-full rounded-xl py-3 px-4 bg-[#FAF9F6] border text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#538f65]/40 transition-colors sm:text-sm ${getFieldError('incidentType') ? 'border-red-300' : 'border-[#EBE8DD]'}`} {...register('incidentType')}>
                                {INCIDENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                            </select>
                            {getFieldError('incidentType') && <p className="mt-2 text-[13px] font-bold text-[#D24545]">{getFieldError('incidentType')}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Fecha del incidente <span className="text-[#D24545]">*</span></label>
                            <div className="relative">
                                <CalendarDaysIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                                <input type="date" className={`block w-full pl-12 pr-4 py-3 rounded-xl bg-[#FAF9F6] border text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#538f65]/40 transition-colors sm:text-sm ${getFieldError('incidentDate') ? 'border-red-300' : 'border-[#EBE8DD]'}`} {...register('incidentDate')} />
                            </div>
                            {getFieldError('incidentDate') && <p className="mt-2 text-[13px] font-bold text-[#D24545]">{getFieldError('incidentDate')}</p>}
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-[#EBE8DD] rounded-[2rem] p-8 shadow-sm">
                    <h2 className="text-lg font-bold text-gray-800 mb-6">Personas Involucradas</h2>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Datos del informante <span className="text-[#D24545]">*</span></label>
                            <div className="relative">
                                <UserCircleIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                                <input type="text" className={`block w-full pl-12 pr-4 py-3 rounded-xl bg-[#FAF9F6] border text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#538f65]/40 transition-colors sm:text-sm ${getFieldError('reporterName') ? 'border-red-300' : 'border-[#EBE8DD]'}`} {...register('reporterName')} />
                            </div>
                            {getFieldError('reporterName') && <p className="mt-2 text-[13px] font-bold text-[#D24545]">{getFieldError('reporterName')}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-[#4B79A1] mb-2">Datos del Agredido</label>
                            <select className="block w-full rounded-xl bg-[#F0F7FF] border-[#DCEAFC] py-3 px-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-colors sm:text-sm" {...register('victimId')}>
                                <option value="">Buscar alumno o personal...</option>
                                {users.map((user: any) => <option key={user.id} value={user.id}>{user.firstName} {user.lastName} - {user.dni}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-[#D24545] mb-2">Datos del Agresor</label>
                            <select className="block w-full rounded-xl bg-[#FFF5F5] border-[#FCE8E8] py-3 px-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/40 transition-colors sm:text-sm" {...register('aggressorId')}>
                                <option value="">Buscar alumno o personal...</option>
                                {users.map((user: any) => <option key={user.id} value={user.id}>{user.firstName} {user.lastName} - {user.dni}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-[#EBE8DD] rounded-[2rem] p-8 shadow-sm">
                    <h2 className="text-lg font-bold text-gray-800 mb-6">Descripción del Incidente</h2>
                    <div className="mb-6 p-5 bg-[#FAF9F6] border border-[#EBE8DD] rounded-2xl flex items-center justify-between">
                        <div>
                            <span className="block text-sm font-bold text-gray-800">¿Sucedió acto de violencia?</span>
                            <span className="block text-[13px] font-medium text-gray-500 mt-1">Marque si hubo agresión física o verbal directa</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" {...register('isViolent')} />
                                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D24545]"></div>
                            </label>
                            <span className={`text-sm font-bold w-6 ${isViolent ? 'text-[#D24545]' : 'text-gray-400'}`}>{isViolent ? 'Sí' : 'No'}</span>
                            {isViolent && <ExclamationTriangleIcon className="h-5 w-5 text-[#D24545]" />}
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Descripción de hechos <span className="text-[#D24545]">*</span></label>
                        <div className="relative">
                            <DocumentTextIcon className="absolute top-4 left-4 h-5 w-5 text-gray-400 pointer-events-none" />
                            <textarea rows={4} className={`block w-full pl-12 pr-4 py-4 rounded-xl bg-[#FAF9F6] border text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#538f65]/40 transition-colors sm:text-sm ${getFieldError('description') ? 'border-red-300' : 'border-[#EBE8DD]'}`} {...register('description')} />
                        </div>
                        {getFieldError('description') && <p className="mt-2 text-[13px] font-bold text-[#D24545]">{getFieldError('description')}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-3">Lugar <span className="text-[#D24545]">*</span></label>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {INCIDENT_LOCATIONS.map(loc => (
                                <button key={loc} type="button" onClick={() => handleLocationSelect(loc)} className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${selectedLocation === loc ? 'bg-[#538f65] text-white border-[#538f65]' : 'bg-white text-gray-600 border-[#EBE8DD] hover:bg-gray-50'}`}>
                                    {loc}
                                </button>
                            ))}
                        </div>
                        <div className="relative">
                            <MapPinIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                            <input type="text" placeholder="Otro lugar..." value={customLocation} onChange={(e) => handleCustomLocationChange(e.target.value)} className={`block w-full pl-12 pr-4 py-3 rounded-xl bg-[#FAF9F6] border text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#538f65]/40 transition-colors sm:text-sm ${getFieldError('location') ? 'border-red-300' : 'border-[#EBE8DD]'}`} />
                        </div>
                        {getFieldError('location') && <p className="mt-2 text-[13px] font-bold text-[#D24545]">{getFieldError('location')}</p>}
                    </div>
                </div>

                <div className="bg-white border border-[#EBE8DD] rounded-[2rem] p-8 shadow-sm">
                    <h2 className="text-lg font-bold text-gray-800 mb-6">Acciones y Cierre</h2>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Medidas tomadas <span className="text-[#D24545]">*</span></label>
                            <textarea rows={3} className={`block w-full p-4 rounded-xl bg-[#FAF9F6] border text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#538f65]/40 transition-colors sm:text-sm ${getFieldError('actionsTaken') ? 'border-red-300' : 'border-[#EBE8DD]'}`} {...register('actionsTaken')} />
                            {getFieldError('actionsTaken') && <p className="mt-2 text-[13px] font-bold text-[#D24545]">{getFieldError('actionsTaken')}</p>}
                        </div>

                        <div className="sm:w-1/3">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Estado</label>
                            <div className="relative">
                                <CheckCircleIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                                <select className="block w-full pl-12 pr-4 py-3 rounded-xl bg-[#FAF9F6] border border-[#EBE8DD] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#538f65]/40 transition-colors sm:text-sm" {...register('status')}>
                                    {INCIDENT_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => reset()} className="px-6 py-3 border border-[#EBE8DD] rounded-xl shadow-sm text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                        Restaurar
                    </button>
                    <button type="submit" disabled={updateIncidentMutation.isPending} className="px-8 py-3 rounded-xl shadow-sm text-sm font-bold text-white bg-[#538f65] hover:bg-[#3f7350] transition-colors disabled:opacity-50">
                        {updateIncidentMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </form>
        </div>
    );
}
