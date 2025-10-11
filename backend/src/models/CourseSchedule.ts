import mongoose, { Schema, Document } from 'mongoose';

export interface ICourseSchedule extends Document {
  courseId: mongoose.Types.ObjectId;
  sectionId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  timeSlotId: mongoose.Types.ObjectId;
  schoolYearId: mongoose.Types.ObjectId;
  dayOfWeek: string;  
  classroom: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const CourseScheduleSchema: Schema = new Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'El curso es requerido'],
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: [true, 'La sección es requerida'],
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: [true, 'El docente es requerido'],
    },
    timeSlotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TimeSlot',
      required: [true, 'La franja horaria es requerida'],
    },
    schoolYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SchoolYear',
      required: [true, 'El año escolar es requerido'],
    },
    dayOfWeek: {
      type: String,
      enum: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
      required: [true, 'El día de la semana es requerido'],
    },
    classroom: {
      type: String,
      required: [true, 'El aula es requerida'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['Activo', 'Inactivo'],
      default: 'Activo',
    },
  },
  {
    timestamps: true,
  }
);

CourseScheduleSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

CourseScheduleSchema.index({ 
  teacherId: 1, 
  dayOfWeek: 1, 
  timeSlotId: 1 
}, { unique: true });

CourseScheduleSchema.index({ 
  sectionId: 1, 
  dayOfWeek: 1, 
  timeSlotId: 1 
}, { unique: true });

const CourseSchedule = mongoose.model<ICourseSchedule>('CourseSchedule', CourseScheduleSchema);

export default CourseSchedule;