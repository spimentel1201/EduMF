import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import Incident from '../models/Incident';
import { ApiError } from '../middleware/errorHandler';

/**
 * @desc    Obtener todas las incidencias
 * @route   GET /api/incidents
 * @access  Private/Admin,Teacher
 */
export const getAllIncidents = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const startIndex = (page - 1) * limit;
        const incidentType = req.query.incidentType as string;
        const status = req.query.status as string;
        const isViolent = req.query.isViolent as string;
        const searchTerm = req.query.search as string;
        const startDate = req.query.startDate as string;
        const endDate = req.query.endDate as string;

        // Construir query
        let query: any = {};

        // Filtrar por tipo de incidencia
        if (incidentType) {
            query.incidentType = incidentType;
        }

        // Filtrar por estado
        if (status) {
            query.status = status;
        }

        // Filtrar por violencia
        if (isViolent !== undefined && isViolent !== '') {
            query.isViolent = isViolent === 'true';
        }

        // Filtrar por rango de fechas
        if (startDate || endDate) {
            query.incidentDate = {};
            if (startDate) {
                query.incidentDate.$gte = new Date(startDate);
            }
            if (endDate) {
                query.incidentDate.$lte = new Date(endDate);
            }
        }

        // Buscar por descripción, ubicación o nombre del informante
        if (searchTerm) {
            query.$or = [
                { description: { $regex: searchTerm, $options: 'i' } },
                { location: { $regex: searchTerm, $options: 'i' } },
                { reporterName: { $regex: searchTerm, $options: 'i' } },
            ];
        }

        const total = await Incident.countDocuments(query);
        const incidents = await Incident.find(query)
            .populate('victimId', 'firstName lastName dni')
            .populate('aggressorId', 'firstName lastName dni')
            .populate('registeredBy', 'firstName lastName email')
            .sort({ incidentDate: -1 })
            .skip(startIndex)
            .limit(limit);

        res.status(200).json({
            success: true,
            count: incidents.length,
            total,
            pagination: {
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
            data: incidents,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Obtener una incidencia por ID
 * @route   GET /api/incidents/:id
 * @access  Private/Admin,Teacher
 */
export const getIncidentById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const incident = await Incident.findById(req.params.id)
            .populate('victimId', 'firstName lastName dni email')
            .populate('aggressorId', 'firstName lastName dni email')
            .populate('registeredBy', 'firstName lastName email');

        if (!incident) {
            return next(ApiError.notFound('Incidencia no encontrada'));
        }

        res.status(200).json({
            success: true,
            data: incident,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Crear una nueva incidencia
 * @route   POST /api/incidents
 * @access  Private/Admin,Teacher
 */
export const createIncident = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(ApiError.badRequest('Error de validación', errors.array()));
        }

        const {
            incidentType,
            incidentDate,
            reporterName,
            victimId,
            aggressorId,
            isViolent,
            description,
            location,
            actionsTaken,
            status,
        } = req.body;

        // Obtener el usuario que registra desde el token
        const registeredBy = (req as any).user?.id;

        if (!registeredBy) {
            return next(ApiError.unauthorized('Usuario no autenticado'));
        }

        // Crear nueva incidencia
        const incident = await Incident.create({
            incidentType,
            incidentDate,
            reporterName,
            victimId: victimId || undefined,
            aggressorId: aggressorId || undefined,
            isViolent: isViolent || false,
            description,
            location,
            actionsTaken,
            status: status || 'Pendiente',
            registeredBy,
        });

        // Poblar referencias para la respuesta
        await incident.populate([
            { path: 'victimId', select: 'firstName lastName dni' },
            { path: 'aggressorId', select: 'firstName lastName dni' },
            { path: 'registeredBy', select: 'firstName lastName email' },
        ]);

        res.status(201).json({
            success: true,
            data: incident,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Actualizar una incidencia
 * @route   PUT /api/incidents/:id
 * @access  Private/Admin,Teacher
 */
export const updateIncident = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(ApiError.badRequest('Error de validación', errors.array()));
        }

        const {
            incidentType,
            incidentDate,
            reporterName,
            victimId,
            aggressorId,
            isViolent,
            description,
            location,
            actionsTaken,
            status,
        } = req.body;

        // Verificar si la incidencia existe
        let incident = await Incident.findById(req.params.id);
        if (!incident) {
            return next(ApiError.notFound('Incidencia no encontrada'));
        }

        // Actualizar incidencia
        incident = await Incident.findByIdAndUpdate(
            req.params.id,
            {
                incidentType,
                incidentDate,
                reporterName,
                victimId: victimId || undefined,
                aggressorId: aggressorId || undefined,
                isViolent,
                description,
                location,
                actionsTaken,
                status,
            },
            { new: true, runValidators: true }
        )
            .populate('victimId', 'firstName lastName dni')
            .populate('aggressorId', 'firstName lastName dni')
            .populate('registeredBy', 'firstName lastName email');

        res.status(200).json({
            success: true,
            data: incident,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Eliminar una incidencia
 * @route   DELETE /api/incidents/:id
 * @access  Private/Admin
 */
export const deleteIncident = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Verificar si la incidencia existe
        const incident = await Incident.findById(req.params.id);
        if (!incident) {
            return next(ApiError.notFound('Incidencia no encontrada'));
        }

        // Eliminar incidencia
        await incident.deleteOne();

        res.status(200).json({
            success: true,
            data: {},
            message: 'Incidencia eliminada correctamente',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Obtener estadísticas de incidencias
 * @route   GET /api/incidents/stats
 * @access  Private/Admin,Teacher
 */
export const getIncidentStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const totalIncidents = await Incident.countDocuments();
        const violentIncidents = await Incident.countDocuments({ isViolent: true });
        const pendingIncidents = await Incident.countDocuments({ status: 'Pendiente' });
        const resolvedIncidents = await Incident.countDocuments({ status: 'Resuelto' });

        // Incidencias por tipo
        const byType = await Incident.aggregate([
            { $group: { _id: '$incidentType', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // Incidencias por mes (últimos 6 meses)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const byMonth = await Incident.aggregate([
            { $match: { incidentDate: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: {
                        year: { $year: '$incidentDate' },
                        month: { $month: '$incidentDate' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                total: totalIncidents,
                violent: violentIncidents,
                pending: pendingIncidents,
                resolved: resolvedIncidents,
                byType,
                byMonth,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Cambiar estado de una incidencia
 * @route   PATCH /api/incidents/:id/status
 * @access  Private/Admin,Teacher
 */
export const updateIncidentStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { status } = req.body;
        const userId = (req as any).user?.id;

        if (!status) {
            return next(ApiError.badRequest('El estado es requerido'));
        }

        const validStatuses = ['Pendiente', 'En Proceso', 'Resuelto', 'Cerrado'];
        if (!validStatuses.includes(status)) {
            return next(ApiError.badRequest('Estado inválido'));
        }

        // Verificar si la incidencia existe
        let incident = await Incident.findById(req.params.id);
        if (!incident) {
            return next(ApiError.notFound('Incidencia no encontrada'));
        }

        // Preparar datos de actualización
        const updateData: any = { status };

        // Si se está cerrando, guardar fecha y usuario de cierre
        if (status === 'Cerrado') {
            updateData.closedAt = new Date();
            updateData.closedBy = userId;
        } else {
            // Si se reabre, limpiar datos de cierre
            updateData.closedAt = null;
            updateData.closedBy = null;
        }

        // Actualizar incidencia
        incident = await Incident.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        )
            .populate('victimId', 'firstName lastName dni')
            .populate('aggressorId', 'firstName lastName dni')
            .populate('registeredBy', 'firstName lastName email')
            .populate('closedBy', 'firstName lastName email');

        res.status(200).json({
            success: true,
            data: incident,
            message: `Estado actualizado a "${status}"`,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Obtener incidencias de un usuario (como víctima o agresor)
 * @route   GET /api/incidents/user/:userId
 * @access  Private/Admin,Teacher
 */
export const getIncidentsByUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId } = req.params;

        // Buscar incidencias donde el usuario es víctima o agresor
        const incidents = await Incident.find({
            $or: [
                { victimId: userId },
                { aggressorId: userId }
            ]
        })
            .sort({ incidentDate: -1 })
            .populate('victimId', 'firstName lastName dni')
            .populate('aggressorId', 'firstName lastName dni')
            .populate('registeredBy', 'firstName lastName email')
            .populate('closedBy', 'firstName lastName email');

        // Agregar campo para indicar el rol del usuario en cada incidencia
        const incidentsWithRole = incidents.map(incident => {
            const incidentObj = incident.toJSON();
            let role = 'none';
            if (incident.victimId?.toString() === userId) role = 'victim';
            if (incident.aggressorId?.toString() === userId) role = 'aggressor';
            if (incident.victimId?.toString() === userId && incident.aggressorId?.toString() === userId) role = 'both';
            return { ...incidentObj, userRole: role };
        });

        res.status(200).json({
            success: true,
            count: incidentsWithRole.length,
            data: incidentsWithRole,
        });
    } catch (error) {
        next(error);
    }
};
