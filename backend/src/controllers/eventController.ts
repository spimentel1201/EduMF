import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Event, { EventCategory } from '../models/Event';
import EventAttendanceRecord from '../models/EventAttendanceRecord';
import ApiError from '../middleware/ApiError';
import {
  getStudentsForEvent as serviceGetStudentsForEvent,
  upsertAttendanceRecord,
  computeSummary,
} from '../services/eventAttendanceService';

const VALID_CATEGORIES: EventCategory[] = ['Académico', 'Artes', 'Deportes', 'Cultura', 'Otro'];

// @desc    Get all events (paginated, with filters)
// @route   GET /api/events
// @access  Public
export const getEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const { search, category, featured } = req.query;

    // Build filter
    const filter: any = {};

    if (search) {
      const regex = new RegExp(search as string, 'i');
      filter.$or = [{ title: regex }, { description: regex }];
    }

    if (category) {
      if (!VALID_CATEGORIES.includes(category as EventCategory)) {
        return next(ApiError.badRequest(`Categoría inválida: ${category}. Debe ser una de: ${VALID_CATEGORIES.join(', ')}`));
      }
      filter.category = category;
    }

    if (featured === 'true') {
      filter.featured = true;
    }

    // Count total matching docs
    const total = await Event.countDocuments(filter);

    // Fetch paginated results sorted by date ascending
    const events = await Event.find(filter)
      .sort({ date: 1 })
      .skip(skip)
      .limit(limit);

    // Compute attendeesCount for each event using a single aggregation
    const eventIds = events.map((e) => e._id);
    const counts = await EventAttendanceRecord.aggregate([
      { $match: { eventId: { $in: eventIds } } },
      { $unwind: '$entries' },
      { $match: { 'entries.attendance': 'present' } },
      { $group: { _id: '$eventId', count: { $sum: 1 } } },
    ]);

    // Build a map of eventId -> count
    const countMap: Record<string, number> = {};
    for (const c of counts) {
      countMap[c._id.toString()] = c.count;
    }

    // Merge counts into event DTOs
    const eventDTOs = events.map((event) => {
      const obj = event.toJSON() as any;
      obj.attendeesCount = countMap[event._id.toString()] ?? 0;
      return obj;
    });

    res.status(200).json({
      success: true,
      data: eventDTOs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new event
// @route   POST /api/events
// @access  Private (admin, teacher)
export const createEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, category, date, timeStart, timeEnd, location } = req.body;

    // Validate required fields
    if (!title || !category || !date || !timeStart || !timeEnd || !location) {
      return next(ApiError.badRequest('Los campos title, category, date, timeStart, timeEnd y location son requeridos'));
    }

    const event = await Event.create(req.body);

    res.status(201).json({
      success: true,
      data: event,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single event by ID
// @route   GET /api/events/:id
// @access  Public
export const getEventById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return next(ApiError.notFound('Evento no encontrado'));
    }

    res.status(200).json({
      success: true,
      data: event,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update an event
// @route   PUT /api/events/:id
// @access  Private (admin, teacher)
export const updateEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!event) {
      return next(ApiError.notFound('Evento no encontrado'));
    }

    res.status(200).json({
      success: true,
      data: event,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an event
// @route   DELETE /api/events/:id
// @access  Private (admin)
export const deleteEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return next(ApiError.notFound('Evento no encontrado'));
    }

    await event.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get students for event attendance
// @route   GET /api/events/:eventId/attendance/students
// @access  Private
export const getStudentsForEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params;
    const { grade, section } = req.query;

    const students = await serviceGetStudentsForEvent(eventId, {
      grade: grade as string | undefined,
      section: section as string | undefined,
    });

    res.status(200).json({
      success: true,
      data: students,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get event attendance record with populated entries and summary
// @route   GET /api/events/:eventId/attendance
// @access  Private
export const getEventAttendance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params;

    const record = await EventAttendanceRecord.findOne({
      eventId: new mongoose.Types.ObjectId(eventId),
    }).populate('entries.studentId', 'firstName lastName dni');

    if (!record) {
      return next(ApiError.notFound('Registro de asistencia no encontrado'));
    }

    const summary = computeSummary(record.entries);

    res.status(200).json({
      success: true,
      data: { record, summary },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get event attendance summary (zero-counts if no record)
// @route   GET /api/events/:eventId/attendance/summary
// @access  Private
export const getEventAttendanceSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params;

    const record = await EventAttendanceRecord.findOne({
      eventId: new mongoose.Types.ObjectId(eventId),
    });

    if (!record) {
      // Return zero-counts summary when no record exists
      return res.status(200).json({
        success: true,
        data: {
          totalStudents: 0,
          presentCount: 0,
          absentCount: 0,
          notRecordedCount: 0,
          tutorCount: 0,
          attendanceRate: 0,
        },
      });
    }

    const summary = computeSummary(record.entries);

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Save (create or replace) event attendance
// @route   POST /api/events/:eventId/attendance
// @access  Private (admin, teacher)
export const saveEventAttendance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params;
    const { entries } = req.body;
    const userId = req.user.id;

    const record = await upsertAttendanceRecord(eventId, entries, userId);

    res.status(201).json({
      success: true,
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update event attendance
// @route   PUT /api/events/:eventId/attendance
// @access  Private (admin, teacher)
export const updateEventAttendance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params;
    const { entries } = req.body;
    const userId = req.user.id;

    const record = await upsertAttendanceRecord(eventId, entries, userId);

    res.status(200).json({
      success: true,
      data: record,
    });
  } catch (error) {
    next(error);
  }
};
