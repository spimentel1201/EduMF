// Tipos para el módulo de incidencias

export interface Incident {
    id: string;
    incidentType: IncidentType;
    incidentDate: string;
    reporterName: string;
    victimId?: string;
    victim?: {
        firstName: string;
        lastName: string;
        dni: string;
    };
    aggressorId?: string;
    aggressor?: {
        firstName: string;
        lastName: string;
        dni: string;
    };
    isViolent: boolean;
    description: string;
    location: string;
    actionsTaken?: string;
    status: IncidentStatus;
    registeredBy: {
        firstName: string;
        lastName: string;
        email: string;
    };
    closedAt?: string;
    closedBy?: {
        firstName: string;
        lastName: string;
        email: string;
    };
    createdAt: string;
    updatedAt: string;
}

export type IncidentType =
    | 'Conductual'
    | 'Académica'
    | 'Salud'
    | 'Bullying'
    | 'Daño a propiedad'
    | 'Otro';

export type IncidentStatus =
    | 'Pendiente'
    | 'En Proceso'
    | 'Resuelto'
    | 'Cerrado';

export interface IncidentFormData {
    incidentType: IncidentType;
    incidentDate: string;
    reporterName: string;
    victimId?: string;
    aggressorId?: string;
    isViolent: boolean;
    description: string;
    location: string;
    actionsTaken?: string;
    status?: IncidentStatus;
}

export interface IncidentFilters {
    incidentType?: IncidentType;
    status?: IncidentStatus;
    isViolent?: boolean;
    startDate?: string;
    endDate?: string;
    search?: string;
}

export interface IncidentStats {
    total: number;
    violent: number;
    pending: number;
    resolved: number;
    byType: Array<{ _id: string; count: number }>;
    byMonth: Array<{ _id: { year: number; month: number }; count: number }>;
}

// Constantes
export const INCIDENT_TYPES: IncidentType[] = [
    'Conductual',
    'Académica',
    'Salud',
    'Bullying',
    'Daño a propiedad',
    'Otro'
];

export const INCIDENT_STATUSES: IncidentStatus[] = [
    'Pendiente',
    'En Proceso',
    'Resuelto',
    'Cerrado'
];

export const INCIDENT_LOCATIONS: string[] = [
    'Patio',
    'Aula',
    'Pasillo',
    'Baños',
    'Cafetería',
    'Biblioteca',
    'Laboratorio',
    'Polideportivo'
];

// Helpers
export const getIncidentTypeColor = (type: IncidentType): string => {
    const colors: Record<IncidentType, string> = {
        'Conductual': 'bg-yellow-100 text-yellow-800',
        'Académica': 'bg-blue-100 text-blue-800',
        'Salud': 'bg-green-100 text-green-800',
        'Bullying': 'bg-red-100 text-red-800',
        'Daño a propiedad': 'bg-orange-100 text-orange-800',
        'Otro': 'bg-gray-100 text-gray-800'
    };
    return colors[type];
};

export const getIncidentStatusColor = (status: IncidentStatus): string => {
    const colors: Record<IncidentStatus, string> = {
        'Pendiente': 'bg-yellow-100 text-yellow-800',
        'En Proceso': 'bg-blue-100 text-blue-800',
        'Resuelto': 'bg-green-100 text-green-800',
        'Cerrado': 'bg-gray-100 text-gray-800'
    };
    return colors[status];
};
