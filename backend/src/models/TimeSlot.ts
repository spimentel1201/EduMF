import mongoose, { Schema, Document } from 'mongoose';

export interface ITimeSlot extends Document {
  name: string;
  startTime: string;
  endTime: string;
  type: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const TimeSlotSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre del horario es requerido'],
      trim: true,
    },
    startTime: {
      type: String,
      required: [true, 'La hora de inicio es requerida'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'],
    },
    endTime: {
      type: String,
      required: [true, 'La hora de fin es requerida'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'],
    },
    type: {
      type: String,
      enum: ['Clase', 'Receso', 'Almuerzo'],
      default: 'Clase',
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

TimeSlotSchema.pre<ITimeSlot>('validate', function (next) {
  const startHour = parseInt(this.startTime.split(':')[0]);
  const startMinute = parseInt(this.startTime.split(':')[1]);
  const endHour = parseInt(this.endTime.split(':')[0]);
  const endMinute = parseInt(this.endTime.split(':')[1]);

  if (endHour < startHour || (endHour === startHour && endMinute <= startMinute)) {
    this.invalidate('endTime', 'La hora de fin debe ser posterior a la hora de inicio');
  }
  next();
});

TimeSlotSchema.pre<ITimeSlot>('save', async function (next) {
  const overlappingSlots = await this.model('TimeSlot').find({
    _id: { $ne: this._id }, // Excluir el propio horario
    type: this.type,
    $or: [
      { startTime: { $lt: this.endTime }, endTime: { $gt: this.startTime } },
    ],
  });

  if (overlappingSlots.length > 0) {
    this.invalidate('startTime', 'El horario superpone con otro existente');
    this.invalidate('endTime', 'El horario superpone con otro existente');
  }
  next();
});

TimeSlotSchema.pre<ITimeSlot>('save', async function (next) {
  const overlappingSlots = await this.model('TimeSlot').find({
    _id: { $ne: this._id },
    $or: [
      { startTime: { $lt: this.endTime }, endTime: { $gt: this.startTime } },
    ],
  });

  if (overlappingSlots.length > 0) {
    this.invalidate('startTime', 'El horario superpone con otro existente para el mismo día');
    this.invalidate('endTime', 'El horario superpone con otro existente para el mismo día');
  }
  next();
});

TimeSlotSchema.pre<ITimeSlot>('save', async function (next) {
  const overlappingSlots = await this.model('TimeSlot').find({
    _id: { $ne: this._id },
    type: this.type,
    $or: [
      { startTime: { $lt: this.endTime }, endTime: { $gt: this.startTime } },
    ],
  });

  if (overlappingSlots.length > 0) {
    this.invalidate('startTime', 'El horario superpone con otro existente para el mismo día y tipo');
    this.invalidate('endTime', 'El horario superpone con otro existente para el mismo día y tipo');
  }
  next();
});

TimeSlotSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

TimeSlotSchema.index({ name: 1 }, { unique: true });
TimeSlotSchema.index({ type: 1 });
TimeSlotSchema.index({ status: 1 });

const TimeSlot = mongoose.model<ITimeSlot>('TimeSlot', TimeSlotSchema);

export default TimeSlot;