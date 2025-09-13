import mongoose, { Schema, Document } from 'mongoose';

export interface ITimeSlot extends Document {
  name: string;
  startTime: string;
  endTime: string;
  //dayOfWeek: number; // Añadido
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
    /*dayOfWeek: { // Añadido
      type: Number,
      required: [true, 'El día de la semana es requerido'],
      min: 1,
      max: 7,
    },¨*/
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

// Validación para asegurar que la hora de fin sea posterior a la hora de inicio
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

// Validación para asegurar que no haya superposición de horarios
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

// Validación para asegurar que no haya superposición de horarios para el mismo día
TimeSlotSchema.pre<ITimeSlot>('save', async function (next) {
  const overlappingSlots = await this.model('TimeSlot').find({
    _id: { $ne: this._id }, // Excluir el propio horario
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

// Validación para asegurar que no haya superposición de horarios para el mismo día y tipo
TimeSlotSchema.pre<ITimeSlot>('save', async function (next) {
  const overlappingSlots = await this.model('TimeSlot').find({
    _id: { $ne: this._id }, // Excluir el propio horario
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

// Transform para convertir _id a id
TimeSlotSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// Índices para búsquedas eficientes
TimeSlotSchema.index({ name: 1 }, { unique: true });
TimeSlotSchema.index({ type: 1 });
TimeSlotSchema.index({ status: 1 });

const TimeSlot = mongoose.model<ITimeSlot>('TimeSlot', TimeSlotSchema);

export default TimeSlot;