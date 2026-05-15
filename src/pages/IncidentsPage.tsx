import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    PlusIcon,
    MagnifyingGlassIcon,
    ExclamationTriangleIcon,
    FunnelIcon,
    EyeIcon,
    XMarkIcon,
    UserIcon,
    MapPinIcon,
    CalendarDaysIcon,
    DocumentTextIcon
} from '@heroicons/react/24/outline';
import { incidentService } from '../services/incidentService';
import {
    INCIDENT_TYPES,
    INCIDENT_STATUSES,
    getIncidentTypeColor,
    getIncidentStatusColor,
    type IncidentFilters,
    type IncidentStatus,
    type Incident
} from '@/types/incidents';
import toast from 'react-hot-toast';

export default function IncidentsPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [showViolentOnly, setShowViolentOnly] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [page, setPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
    const [showDetails, setShowDetails] = useState(false);

    const queryClient = useQueryClient();

    const filters: IncidentFilters = {
        ...(selectedType && { incidentType: selectedType as any }),
        ...(selectedStatus && { status: selectedStatus as any }),
        ...(showViolentOnly && { isViolent: true }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(searchTerm && { search: searchTerm }),
    };

    const { data, isLoading, error } = useQuery({
        queryKey: ['incidents', filters, page],
        queryFn: () => incidentService.getAll(filters, page, 10),
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            incidentService.updateStatus(id, status),
        onSuccess: (updatedIncident) => {
            queryClient.invalidateQueries({ queryKey: ['incidents'] });
            toast.success('Estado actualizado correctamente');
            // Actualizar el incidente seleccionado si está abierto
            if (selectedIncident?.id === updatedIncident.id) {
                setSelectedIncident(updatedIncident);
            }
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Error al actualizar estado');
        },
    });

    const incidents = data?.data || [];
    const pagination = data?.pagination;

    const clearFilters = () => {
        setSelectedType('');
        setSelectedStatus('');
        setShowViolentOnly(false);
        setStartDate('');
        setEndDate('');
        setSearchTerm('');
        setPage(1);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-PE', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-PE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleStatusChange = (incidentId: string, newStatus: IncidentStatus) => {
        updateStatusMutation.mutate({ id: incidentId, status: newStatus });
    };

    const openDetails = (incident: Incident) => {
        setSelectedIncident(incident);
        setShowDetails(true);
    };

    const closeDetails = () => {
        setShowDetails(false);
        setTimeout(() => setSelectedIncident(null), 300);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-red-600">Error al cargar incidencias: {(error as Error).message}</p>
            </div>
        );
    }

    return (
        <div className="pb-10 space-y-6 font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-[2rem] font-bold text-gray-800 leading-tight">Incidencias Escolares</h1>
                    <p className="text-[15px] font-medium text-gray-500 mt-1">
                        Registro y seguimiento de incidencias en la institución educativa.
                    </p>
                </div>
                <Link
                    to="/incidents/new"
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#538f65] text-white text-sm font-bold rounded-xl shadow-sm hover:bg-[#3f7350] transition-colors"
                >
                    <PlusIcon className="w-5 h-5" />
                    Nueva Incidencia
                </Link>
            </div>

            {/* Search and Filter Toggle */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        className="block w-full rounded-2xl py-3 pl-12 pr-4 bg-white border border-[#EBE8DD] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#538f65]/40 transition-colors sm:text-sm"
                        placeholder="Buscar por descripción, ubicación o informante..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                    />
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-[#EBE8DD] text-gray-700 font-bold text-sm rounded-2xl hover:bg-gray-50 transition-colors shadow-sm"
                >
                    <FunnelIcon className="h-5 w-5 text-gray-400" />
                    Filtros
                </button>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="bg-[#FAF9F6] border border-[#EBE8DD] rounded-[2rem] p-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-2">Tipo</label>
                            <select
                                className="block w-full rounded-xl py-2.5 px-3 bg-white border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#538f65]/40 sm:text-sm shadow-sm"
                                value={selectedType}
                                onChange={(e) => { setSelectedType(e.target.value); setPage(1); }}
                            >
                                <option value="">Todos los tipos</option>
                                {INCIDENT_TYPES.map((type) => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-2">Estado</label>
                            <select
                                className="block w-full rounded-xl py-2.5 px-3 bg-white border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#538f65]/40 sm:text-sm shadow-sm"
                                value={selectedStatus}
                                onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
                            >
                                <option value="">Todos los estados</option>
                                {INCIDENT_STATUSES.map((status) => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-2">Desde</label>
                            <input
                                type="date"
                                className="block w-full rounded-xl py-2.5 px-3 bg-white border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#538f65]/40 sm:text-sm shadow-sm"
                                value={startDate}
                                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-2">Hasta</label>
                            <input
                                type="date"
                                className="block w-full rounded-xl py-2.5 px-3 bg-white border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#538f65]/40 sm:text-sm shadow-sm"
                                value={endDate}
                                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                            />
                        </div>
                        <div className="flex items-end">
                            <label className="flex items-center cursor-pointer pb-2">
                                <input
                                    type="checkbox"
                                    className="h-5 w-5 rounded border-gray-300 text-[#538f65] focus:ring-[#538f65]"
                                    checked={showViolentOnly}
                                    onChange={(e) => { setShowViolentOnly(e.target.checked); setPage(1); }}
                                />
                                <span className="ml-2 text-sm font-medium text-gray-700">Solo violentas</span>
                            </label>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={clearFilters}
                            className="text-sm font-bold text-[#538f65] hover:text-[#3f7350] transition-colors"
                        >
                            Limpiar filtros
                        </button>
                    </div>
                </div>
            )}

            {/* Stats Summary */}
            {data && (
                <div className="text-sm text-gray-600">
                    Mostrando {incidents.length} de {data.total} incidencias
                </div>
            )}

            {/* Incidents Table */}
            <div className="bg-white rounded-[2rem] border border-[#EBE8DD] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[#EBE8DD] bg-white">
                                <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-wider">Fecha</th>
                                <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-wider">Tipo</th>
                                <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-wider">Ubicación</th>
                                <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-wider">Informante</th>
                                <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-wider">Violencia</th>
                                <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F4F2EC]">
                        {incidents.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="py-12 text-center text-gray-500">
                                    No se encontraron incidencias
                                </td>
                            </tr>
                        ) : (
                            incidents.map((incident) => (
                                <tr key={incident.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="whitespace-nowrap px-6 py-5 text-sm font-bold text-gray-900">
                                        {formatDate(incident.incidentDate)}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-5 text-sm">
                                        <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${getIncidentTypeColor(incident.incidentType)}`}>
                                            {incident.incidentType}
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-5 text-sm font-medium text-gray-600">
                                        {incident.location}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-5 text-sm font-medium text-gray-600">
                                        {incident.reporterName}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-5 text-sm">
                                        {incident.isViolent ? (
                                            <span className="inline-flex items-center font-bold text-[#D24545] text-xs">
                                                <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                                                Sí
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 font-medium text-xs">No</span>
                                        )}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-5 text-sm">
                                        <select
                                            value={incident.status}
                                            onChange={(e) => handleStatusChange(incident.id, e.target.value as IncidentStatus)}
                                            disabled={updateStatusMutation.isPending}
                                            className={`rounded-lg border-0 py-1.5 pl-3 pr-8 text-xs font-bold focus:ring-2 focus:ring-[#538f65] ${getIncidentStatusColor(incident.status)} cursor-pointer disabled:opacity-50`}
                                        >
                                            {INCIDENT_STATUSES.map((status) => (
                                                <option key={status} value={status}>{status}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-5 text-right">
                                        <button
                                            onClick={() => openDetails(incident)}
                                            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#538f65] hover:text-[#3f7350] transition-colors"
                                            title="Ver detalles"
                                        >
                                            <EyeIcon className="h-5 w-5" />
                                            Ver detalle
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                    <div className="flex flex-1 justify-between sm:hidden">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Anterior
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                            disabled={page === pagination.totalPages}
                            className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Siguiente
                        </button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700">
                                Página <span className="font-medium">{page}</span> de{' '}
                                <span className="font-medium">{pagination.totalPages}</span>
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Anterior
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                disabled={page === pagination.totalPages}
                                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Details Slide-over Modal */}
            {showDetails && selectedIncident && (
                <div className="relative z-50">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                        onClick={closeDetails}
                    />

                    {/* Panel */}
                    <div className="fixed inset-0 overflow-hidden">
                        <div className="absolute inset-0 overflow-hidden">
                            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                                <div className="pointer-events-auto w-screen max-w-md">
                                    <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-xl">
                                        {/* Header */}
                                        <div className="bg-[#1C1F1E] px-8 py-8">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h2 className="text-xl font-bold text-white">
                                                        Detalles de Incidencia
                                                    </h2>
                                                    <p className="mt-1 text-sm font-medium text-gray-400">
                                                        {formatDate(selectedIncident.incidentDate)}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={closeDetails}
                                                    className="rounded-full p-2 bg-white/10 text-gray-300 hover:text-white hover:bg-white/20 transition-colors"
                                                >
                                                    <XMarkIcon className="h-6 w-6" />
                                                </button>
                                            </div>
                                            {/* Status and Type badges */}
                                            <div className="mt-6 flex flex-wrap gap-2">
                                                <span className={`inline-flex rounded-md px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${getIncidentTypeColor(selectedIncident.incidentType)}`}>
                                                    {selectedIncident.incidentType}
                                                </span>
                                                <span className={`inline-flex rounded-md px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${getIncidentStatusColor(selectedIncident.status)}`}>
                                                    {selectedIncident.status}
                                                </span>
                                                {selectedIncident.isViolent && (
                                                    <span className="inline-flex items-center rounded-md bg-[#FFEBEB] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#D24545]">
                                                        <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                                                        Violencia
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 px-8 py-8 bg-[#FAF9F6] space-y-8">
                                            {/* Ubicación */}
                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-white border border-[#EBE8DD] flex items-center justify-center shrink-0">
                                                    <MapPinIcon className="h-5 w-5 text-[#538f65]" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Ubicación</h3>
                                                    <p className="text-sm font-bold text-gray-900">{selectedIncident.location}</p>
                                                </div>
                                            </div>

                                            {/* Informante */}
                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-white border border-[#EBE8DD] flex items-center justify-center shrink-0">
                                                    <UserIcon className="h-5 w-5 text-[#538f65]" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Informante</h3>
                                                    <p className="text-sm font-bold text-gray-900">{selectedIncident.reporterName}</p>
                                                </div>
                                            </div>

                                            {/* Personas involucradas */}
                                            {(selectedIncident.victim || selectedIncident.aggressor) && (
                                                <div className="pt-2">
                                                    <h3 className="text-sm font-bold text-gray-900 mb-4">Personas Involucradas</h3>
                                                    <div className="space-y-3">
                                                        {selectedIncident.victim && (
                                                            <div className="bg-white border border-[#EBE8DD] rounded-xl p-4">
                                                                <span className="inline-block text-[10px] font-black uppercase text-blue-600 mb-1">Agredido</span>
                                                                <p className="text-sm font-bold text-gray-900">
                                                                    {selectedIncident.victim.firstName} {selectedIncident.victim.lastName}
                                                                </p>
                                                                <p className="text-xs font-medium text-gray-500">DNI: {selectedIncident.victim.dni}</p>
                                                            </div>
                                                        )}
                                                        {selectedIncident.aggressor && (
                                                            <div className="bg-white border border-[#EBE8DD] rounded-xl p-4">
                                                                <span className="inline-block text-[10px] font-black uppercase text-[#D24545] mb-1">Agresor</span>
                                                                <p className="text-sm font-bold text-gray-900">
                                                                    {selectedIncident.aggressor.firstName} {selectedIncident.aggressor.lastName}
                                                                </p>
                                                                <p className="text-xs font-medium text-gray-500">DNI: {selectedIncident.aggressor.dni}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Descripción */}
                                            <div className="border-t border-[#EBE8DD] pt-8">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-white border border-[#EBE8DD] flex items-center justify-center shrink-0">
                                                        <DocumentTextIcon className="h-5 w-5 text-[#538f65]" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Descripción de los hechos</h3>
                                                        <div className="bg-white border border-[#EBE8DD] rounded-xl p-4">
                                                            <p className="text-sm font-medium text-gray-700 whitespace-pre-wrap leading-relaxed">
                                                                {selectedIncident.description}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Acciones tomadas */}
                                            {selectedIncident.actionsTaken && (
                                                <div className="pt-2">
                                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Medidas tomadas</h3>
                                                    <div className="bg-white border border-[#EBE8DD] rounded-xl p-4">
                                                        <p className="text-sm font-medium text-gray-700 whitespace-pre-wrap leading-relaxed">
                                                            {selectedIncident.actionsTaken}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Información de cierre */}
                                            {selectedIncident.closedAt && selectedIncident.closedBy && (
                                                <div className="pt-2">
                                                    <div className="bg-[#EAE4D9] rounded-xl p-4">
                                                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Información de cierre</h3>
                                                        <p className="text-[13px] font-medium text-gray-600 mt-1">
                                                            Cerrado el {formatDateTime(selectedIncident.closedAt)}
                                                        </p>
                                                        <p className="text-[13px] font-bold text-gray-800 mt-1">
                                                            Por: {selectedIncident.closedBy.firstName} {selectedIncident.closedBy.lastName}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Metadatos */}
                                            <div className="border-t border-[#EBE8DD] pt-8">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-white border border-[#EBE8DD] flex items-center justify-center shrink-0">
                                                        <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
                                                    </div>
                                                    <div className="text-[13px] text-gray-500 space-y-1.5 font-medium">
                                                        <p>Registrado: <span className="text-gray-700 font-bold">{formatDateTime(selectedIncident.createdAt)}</span></p>
                                                        <p>Por: <span className="text-gray-700 font-bold">{selectedIncident.registeredBy.firstName} {selectedIncident.registeredBy.lastName}</span></p>
                                                        {selectedIncident.updatedAt !== selectedIncident.createdAt && (
                                                            <p>Última actualización: <span className="text-gray-700 font-bold">{formatDateTime(selectedIncident.updatedAt)}</span></p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Footer */}
                                        <div className="border-t border-[#EBE8DD] px-8 py-6 bg-white">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-bold text-gray-700">Cambiar estado:</span>
                                                <select
                                                    value={selectedIncident.status}
                                                    onChange={(e) => handleStatusChange(selectedIncident.id, e.target.value as IncidentStatus)}
                                                    disabled={updateStatusMutation.isPending}
                                                    className="rounded-xl border border-gray-200 py-2.5 pl-3 pr-8 text-sm font-bold focus:ring-2 focus:ring-[#538f65] focus:outline-none"
                                                >
                                                    {INCIDENT_STATUSES.map((status) => (
                                                        <option key={status} value={status}>{status}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </div>
    );
}
