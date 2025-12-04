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
        <div className="space-y-6">
            {/* Header */}
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-bold text-gray-900">Incidencias Escolares</h1>
                    <p className="mt-2 text-sm text-gray-700">
                        Registro y seguimiento de incidencias en la institución educativa
                    </p>
                </div>
                <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
                    <Link
                        to="/incidents/new"
                        className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
                        Nueva Incidencia
                    </Link>
                </div>
            </div>

            {/* Search and Filter Toggle */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full rounded-md border-0 py-2 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm"
                        placeholder="Buscar por descripción, ubicación o informante..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                    />
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                    <FunnelIcon className="h-5 w-5 mr-1.5 text-gray-400" />
                    Filtros
                </button>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="bg-white p-4 rounded-lg shadow ring-1 ring-gray-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                            <select
                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary-600 sm:text-sm"
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                            <select
                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary-600 sm:text-sm"
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
                            <input
                                type="date"
                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary-600 sm:text-sm"
                                value={startDate}
                                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
                            <input
                                type="date"
                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary-600 sm:text-sm"
                                value={endDate}
                                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                            />
                        </div>
                        <div className="flex items-end">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-600"
                                    checked={showViolentOnly}
                                    onChange={(e) => { setShowViolentOnly(e.target.checked); setPage(1); }}
                                />
                                <span className="ml-2 text-sm text-gray-700">Solo violentas</span>
                            </label>
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={clearFilters}
                            className="text-sm text-gray-600 hover:text-gray-900"
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
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                                Fecha
                            </th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                Tipo
                            </th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                Ubicación
                            </th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                Informante
                            </th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                Violencia
                            </th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                Estado
                            </th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {incidents.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="py-12 text-center text-gray-500">
                                    No se encontraron incidencias
                                </td>
                            </tr>
                        ) : (
                            incidents.map((incident) => (
                                <tr key={incident.id} className="hover:bg-gray-50">
                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-6">
                                        {formatDate(incident.incidentDate)}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getIncidentTypeColor(incident.incidentType)}`}>
                                            {incident.incidentType}
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                        {incident.location}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                        {incident.reporterName}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                                        {incident.isViolent ? (
                                            <span className="inline-flex items-center text-red-600">
                                                <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                                                Sí
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">No</span>
                                        )}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                                        <select
                                            value={incident.status}
                                            onChange={(e) => handleStatusChange(incident.id, e.target.value as IncidentStatus)}
                                            disabled={updateStatusMutation.isPending}
                                            className={`rounded-md border-0 py-1 pl-2 pr-8 text-xs font-semibold ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary-600 ${getIncidentStatusColor(incident.status)} cursor-pointer disabled:opacity-50`}
                                        >
                                            {INCIDENT_STATUSES.map((status) => (
                                                <option key={status} value={status}>{status}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                                        <button
                                            onClick={() => openDetails(incident)}
                                            className="text-primary-600 hover:text-primary-900 inline-flex items-center gap-1"
                                            title="Ver detalles"
                                        >
                                            <EyeIcon className="h-5 w-5" />
                                            <span className="sr-only">Ver detalles</span>
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
                                        <div className="bg-primary-600 px-4 py-6 sm:px-6">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h2 className="text-lg font-semibold text-white">
                                                        Detalles de Incidencia
                                                    </h2>
                                                    <p className="mt-1 text-sm text-primary-100">
                                                        {formatDate(selectedIncident.incidentDate)}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={closeDetails}
                                                    className="rounded-md text-primary-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
                                                >
                                                    <XMarkIcon className="h-6 w-6" />
                                                </button>
                                            </div>
                                            {/* Status and Type badges */}
                                            <div className="mt-4 flex gap-2">
                                                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getIncidentTypeColor(selectedIncident.incidentType)}`}>
                                                    {selectedIncident.incidentType}
                                                </span>
                                                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getIncidentStatusColor(selectedIncident.status)}`}>
                                                    {selectedIncident.status}
                                                </span>
                                                {selectedIncident.isViolent && (
                                                    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
                                                        <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                                                        Violencia
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 px-4 py-6 sm:px-6 space-y-6">
                                            {/* Ubicación */}
                                            <div className="flex items-start gap-3">
                                                <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                                                <div>
                                                    <h3 className="text-sm font-medium text-gray-500">Ubicación</h3>
                                                    <p className="text-sm text-gray-900">{selectedIncident.location}</p>
                                                </div>
                                            </div>

                                            {/* Informante */}
                                            <div className="flex items-start gap-3">
                                                <UserIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                                                <div>
                                                    <h3 className="text-sm font-medium text-gray-500">Informante</h3>
                                                    <p className="text-sm text-gray-900">{selectedIncident.reporterName}</p>
                                                </div>
                                            </div>

                                            {/* Personas involucradas */}
                                            {(selectedIncident.victim || selectedIncident.aggressor) && (
                                                <div className="border-t border-gray-200 pt-4">
                                                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Personas Involucradas</h3>
                                                    <div className="space-y-3">
                                                        {selectedIncident.victim && (
                                                            <div className="bg-blue-50 rounded-lg p-3">
                                                                <span className="text-xs font-medium text-blue-600">Agredido</span>
                                                                <p className="text-sm text-gray-900">
                                                                    {selectedIncident.victim.firstName} {selectedIncident.victim.lastName}
                                                                </p>
                                                                <p className="text-xs text-gray-500">DNI: {selectedIncident.victim.dni}</p>
                                                            </div>
                                                        )}
                                                        {selectedIncident.aggressor && (
                                                            <div className="bg-red-50 rounded-lg p-3">
                                                                <span className="text-xs font-medium text-red-600">Agresor</span>
                                                                <p className="text-sm text-gray-900">
                                                                    {selectedIncident.aggressor.firstName} {selectedIncident.aggressor.lastName}
                                                                </p>
                                                                <p className="text-xs text-gray-500">DNI: {selectedIncident.aggressor.dni}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Descripción */}
                                            <div className="border-t border-gray-200 pt-4">
                                                <div className="flex items-start gap-3">
                                                    <DocumentTextIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                                                    <div className="flex-1">
                                                        <h3 className="text-sm font-medium text-gray-500">Descripción de los hechos</h3>
                                                        <p className="mt-2 text-sm text-gray-900 whitespace-pre-wrap">
                                                            {selectedIncident.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Acciones tomadas */}
                                            {selectedIncident.actionsTaken && (
                                                <div className="border-t border-gray-200 pt-4">
                                                    <h3 className="text-sm font-medium text-gray-500">Medidas tomadas</h3>
                                                    <p className="mt-2 text-sm text-gray-900 whitespace-pre-wrap">
                                                        {selectedIncident.actionsTaken}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Información de cierre */}
                                            {selectedIncident.closedAt && selectedIncident.closedBy && (
                                                <div className="border-t border-gray-200 pt-4">
                                                    <div className="bg-gray-50 rounded-lg p-3">
                                                        <h3 className="text-sm font-medium text-gray-700">Información de cierre</h3>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            Cerrado el {formatDateTime(selectedIncident.closedAt)}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            Por: {selectedIncident.closedBy.firstName} {selectedIncident.closedBy.lastName}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Metadatos */}
                                            <div className="border-t border-gray-200 pt-4">
                                                <div className="flex items-start gap-3">
                                                    <CalendarDaysIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                                                    <div className="text-xs text-gray-500 space-y-1">
                                                        <p>Registrado: {formatDateTime(selectedIncident.createdAt)}</p>
                                                        <p>Por: {selectedIncident.registeredBy.firstName} {selectedIncident.registeredBy.lastName}</p>
                                                        {selectedIncident.updatedAt !== selectedIncident.createdAt && (
                                                            <p>Última actualización: {formatDateTime(selectedIncident.updatedAt)}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Footer */}
                                        <div className="border-t border-gray-200 px-4 py-4 sm:px-6">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-500">Cambiar estado:</span>
                                                <select
                                                    value={selectedIncident.status}
                                                    onChange={(e) => handleStatusChange(selectedIncident.id, e.target.value as IncidentStatus)}
                                                    disabled={updateStatusMutation.isPending}
                                                    className="rounded-md border-gray-300 py-1.5 text-sm focus:ring-primary-600 focus:border-primary-600"
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
    );
}
