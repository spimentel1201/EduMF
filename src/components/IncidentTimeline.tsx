import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useQuery } from '@tanstack/react-query';
import {
    XMarkIcon,
    ExclamationTriangleIcon,
    AcademicCapIcon,
    HeartIcon,
    UserGroupIcon,
    WrenchScrewdriverIcon,
    QuestionMarkCircleIcon,
    ShieldExclamationIcon
} from '@heroicons/react/24/outline';
import { incidentService } from '@/services/incidentService';
import { getIncidentTypeColor, getIncidentStatusColor, type Incident } from '@/types/incidents';

interface IncidentTimelineProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    userName: string;
}

const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
        'Conductual': <ShieldExclamationIcon className="h-5 w-5" />,
        'Académica': <AcademicCapIcon className="h-5 w-5" />,
        'Salud': <HeartIcon className="h-5 w-5" />,
        'Bullying': <UserGroupIcon className="h-5 w-5" />,
        'Daño a propiedad': <WrenchScrewdriverIcon className="h-5 w-5" />,
        'Otro': <QuestionMarkCircleIcon className="h-5 w-5" />,
    };
    return icons[type] || <QuestionMarkCircleIcon className="h-5 w-5" />;
};

const getRoleLabel = (role: string) => {
    const labels: Record<string, { text: string; color: string }> = {
        'victim': { text: 'Agredido', color: 'bg-blue-100 text-blue-700' },
        'aggressor': { text: 'Agresor', color: 'bg-red-100 text-red-700' },
        'both': { text: 'Ambos roles', color: 'bg-purple-100 text-purple-700' },
    };
    return labels[role] || { text: 'Involucrado', color: 'bg-gray-100 text-gray-700' };
};

export default function IncidentTimeline({ isOpen, onClose, userId, userName }: IncidentTimelineProps) {
    const { data: incidents = [], isLoading, error } = useQuery({
        queryKey: ['incidents-user', userId],
        queryFn: () => incidentService.getByUser(userId),
        enabled: isOpen && !!userId,
    });

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-PE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <Transition.Root show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                                {/* Header */}
                                <div className="bg-primary-600 px-4 py-4 sm:px-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Dialog.Title className="text-lg font-semibold text-white">
                                                Historial de Incidencias
                                            </Dialog.Title>
                                            <p className="mt-1 text-sm text-primary-100">
                                                {userName}
                                            </p>
                                        </div>
                                        <button
                                            onClick={onClose}
                                            className="rounded-md text-primary-200 hover:text-white"
                                        >
                                            <XMarkIcon className="h-6 w-6" />
                                        </button>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="max-h-96 overflow-y-auto px-4 py-4 sm:px-6">
                                    {isLoading ? (
                                        <div className="flex items-center justify-center py-8">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                                        </div>
                                    ) : error ? (
                                        <div className="text-center py-8 text-red-600">
                                            Error al cargar incidencias
                                        </div>
                                    ) : incidents.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-300" />
                                            <p className="mt-2">No hay incidencias registradas</p>
                                        </div>
                                    ) : (
                                        <div className="flow-root">
                                            <ul className="-mb-8">
                                                {incidents.map((incident, idx) => {
                                                    const roleInfo = getRoleLabel((incident as any).userRole);
                                                    return (
                                                        <li key={incident.id}>
                                                            <div className="relative pb-8">
                                                                {idx !== incidents.length - 1 && (
                                                                    <span
                                                                        className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                                                                        aria-hidden="true"
                                                                    />
                                                                )}
                                                                <div className="relative flex space-x-3">
                                                                    <div>
                                                                        <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${getIncidentTypeColor(incident.incidentType)}`}>
                                                                            {getTypeIcon(incident.incidentType)}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex min-w-0 flex-1 justify-between space-x-4">
                                                                        <div className="flex-1">
                                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getIncidentTypeColor(incident.incidentType)}`}>
                                                                                    {incident.incidentType}
                                                                                </span>
                                                                                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getIncidentStatusColor(incident.status)}`}>
                                                                                    {incident.status}
                                                                                </span>
                                                                                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${roleInfo.color}`}>
                                                                                    {roleInfo.text}
                                                                                </span>
                                                                                {incident.isViolent && (
                                                                                    <span className="inline-flex items-center text-red-600">
                                                                                        <ExclamationTriangleIcon className="h-4 w-4" />
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                                                                                {incident.description}
                                                                            </p>
                                                                            <p className="mt-1 text-xs text-gray-400">
                                                                                📍 {incident.location}
                                                                            </p>
                                                                        </div>
                                                                        <div className="whitespace-nowrap text-right text-xs text-gray-500">
                                                                            <time dateTime={incident.incidentDate}>
                                                                                {formatDate(incident.incidentDate)}
                                                                            </time>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="bg-gray-50 px-4 py-3 sm:px-6">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-500">
                                            {incidents.length} incidencia{incidents.length !== 1 ? 's' : ''}
                                        </span>
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                                            onClick={onClose}
                                        >
                                            Cerrar
                                        </button>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
}
