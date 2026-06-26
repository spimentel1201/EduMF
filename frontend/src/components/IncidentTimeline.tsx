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
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <Dialog.Panel className="relative transform overflow-hidden rounded-[2rem] bg-white text-left shadow-2xl transition-all sm:my-8 w-full max-w-2xl flex flex-col max-h-[90vh]">
                                {/* Header */}
                                <div className="flex items-center justify-between px-8 py-6 border-b border-[#EBE8DD] shrink-0">
                                    <div>
                                        <Dialog.Title className="text-xl font-bold text-gray-800">
                                            Historial de Incidencias
                                        </Dialog.Title>
                                        <p className="mt-0.5 text-sm text-gray-500">
                                            Alumno: {userName}
                                        </p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                    >
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="flex-1 overflow-y-auto px-8 py-6">
                                    {isLoading ? (
                                        <div className="flex items-center justify-center py-12">
                                            <div className="w-8 h-8 border-2 border-gray-200 border-t-[#538f65] rounded-full animate-spin"></div>
                                        </div>
                                    ) : error ? (
                                        <div className="text-center py-12 text-sm font-medium text-red-500">
                                            Error al cargar incidencias.
                                        </div>
                                    ) : incidents.length === 0 ? (
                                        <div className="text-center py-16">
                                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <ExclamationTriangleIcon className="h-8 w-8 text-gray-400" />
                                            </div>
                                            <p className="text-sm font-bold text-gray-800">No hay incidencias</p>
                                            <p className="text-sm text-gray-500 mt-1">Este alumno no tiene registros disciplinarios.</p>
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
                                                                        className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-[#EBE8DD]"
                                                                        aria-hidden="true"
                                                                    />
                                                                )}
                                                                <div className="relative flex items-start space-x-4">
                                                                    <div className="relative">
                                                                        <span className={`h-10 w-10 rounded-full flex items-center justify-center ring-8 ring-white ${getIncidentTypeColor(incident.incidentType)}`}>
                                                                            {getTypeIcon(incident.incidentType)}
                                                                        </span>
                                                                    </div>
                                                                    <div className="min-w-0 flex-1 pt-1.5">
                                                                        <div className="flex items-center justify-between gap-4 mb-2">
                                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                                <span className={`inline-flex rounded-lg px-2.5 py-1 text-[11px] font-bold ${getIncidentTypeColor(incident.incidentType)}`}>
                                                                                    {incident.incidentType}
                                                                                </span>
                                                                                <span className={`inline-flex rounded-lg px-2.5 py-1 text-[11px] font-bold ${getIncidentStatusColor(incident.status)}`}>
                                                                                    {incident.status}
                                                                                </span>
                                                                                <span className={`inline-flex rounded-lg px-2.5 py-1 text-[11px] font-bold ${roleInfo.color}`}>
                                                                                    {roleInfo.text}
                                                                                </span>
                                                                                {incident.isViolent && (
                                                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-lg">
                                                                                        <ExclamationTriangleIcon className="h-3.5 w-3.5" />
                                                                                        Violencia
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <time dateTime={incident.incidentDate} className="text-xs font-bold text-gray-400 shrink-0">
                                                                                {formatDate(incident.incidentDate)}
                                                                            </time>
                                                                        </div>
                                                                        <div className="bg-[#FAF9F6] border border-[#EBE8DD] rounded-2xl p-4">
                                                                            <p className="text-sm font-medium text-gray-800 leading-relaxed">
                                                                                {incident.description}
                                                                            </p>
                                                                            <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                                                                <span>📍</span> {incident.location}
                                                                            </p>
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
                                <div className="px-8 py-5 border-t border-[#EBE8DD] flex items-center justify-between shrink-0">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                        {incidents.length} registro{incidents.length !== 1 ? 's' : ''} en total
                                    </span>
                                    <button
                                        type="button"
                                        className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
                                        onClick={onClose}
                                    >
                                        Cerrar historial
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
}
