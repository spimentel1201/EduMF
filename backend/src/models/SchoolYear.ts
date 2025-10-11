import mongoose, { Schema, Document } from 'mongoose';

export interface ISchoolYear extends Document {
  name: string;
  startDate: Date;
  endDate: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const SchoolYearSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre del año escolar es requerido'],
      trim: true,
      unique: true,
    },
    startDate: {
      type: Date,
      required: [true, 'La fecha de inicio es requerida'],
    },
    endDate: {
      type: Date,
      required: [true, 'La fecha de fin es requerida'],
    },
    status: {
      type: String,
      enum: ['Activo', 'Inactivo', 'Finalizado'],
      default: 'Activo',
    },
  },
  {
    timestamps: true,
  }
);

SchoolYearSchema.pre<ISchoolYear>('validate', function (next) {
  if (this.endDate <= this.startDate) {
    this.invalidate('endDate', 'La fecha de fin debe ser posterior a la fecha de inicio');
  }
  next();
});

SchoolYearSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

SchoolYearSchema.index({ name: 1 });
SchoolYearSchema.index({ status: 1 });
SchoolYearSchema.index({ startDate: 1, endDate: 1 });

const SchoolYear = mongoose.model<ISchoolYear>('SchoolYear', SchoolYearSchema);

export default SchoolYear;