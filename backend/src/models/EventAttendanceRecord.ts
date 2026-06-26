import mongoose, { Schema, Document } from 'mongoose';

export type AttendanceStatus = 'present' | 'absent' | null;
export type TutorPresence = 'padre' | 'madre' | 'apoderado' | null;

export interface IStudentAttendanceEntry {
  studentId: mongoose.Types.ObjectId;
  attendance: AttendanceStatus;
  tutorPresence: TutorPresence;
  tutorName?: string;
  grade?: string;
  section?: string;
}

export interface IEventAttendanceRecord extends Document {
  eventId: mongoose.Types.ObjectId;
  submittedBy: mongoose.Types.ObjectId;
  submittedAt: Date;
  entries: IStudentAttendanceEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const StudentAttendanceEntrySchema = new Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    attendance: {
      type: String,
      enum: ['present', 'absent', null],
      default: null,
    },
    tutorPresence: {
      type: String,
      enum: ['padre', 'madre', 'apoderado', null],
      default: null,
    },
    tutorName: { type: String, trim: true },
    grade:     { type: String, trim: true },
    section:   { type: String, trim: true },
  },
  { _id: false }
);

const EventAttendanceRecordSchema: Schema = new Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      unique: true,   // one record per event (upsert pattern)
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    submittedAt: { type: Date, default: Date.now },
    entries: [StudentAttendanceEntrySchema],
  },
  { timestamps: true }
);

EventAttendanceRecordSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

EventAttendanceRecordSchema.index({ eventId: 1 }, { unique: true });

export default mongoose.model<IEventAttendanceRecord>(
  'EventAttendanceRecord',
  EventAttendanceRecordSchema
);
