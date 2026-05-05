import mongoose, { Schema, Document } from 'mongoose';

export type EventCategory = 'Académico' | 'Artes' | 'Deportes' | 'Cultura' | 'Otro';
export type EventScope = 'general' | 'specific';

export interface IEvent extends Document {
  title: string;
  description?: string;
  category: EventCategory;
  date: Date;
  timeStart: string;   // HH:MM format
  timeEnd: string;     // HH:MM format
  location: string;
  imageUrl?: string;
  featured: boolean;
  scope: EventScope;
  targetGrade?: string;
  targetSection?: string;
  capacity?: number;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: {
      type: String,
      enum: ['Académico', 'Artes', 'Deportes', 'Cultura', 'Otro'],
      required: true,
    },
    date: { type: Date, required: true },
    timeStart: { type: String, required: true },
    timeEnd: { type: String, required: true },
    location: { type: String, required: true, trim: true },
    imageUrl: { type: String, trim: true },
    featured: { type: Boolean, default: false },
    scope: {
      type: String,
      enum: ['general', 'specific'],
      default: 'general',
    },
    targetGrade: { type: String, trim: true },
    targetSection: { type: String, trim: true },
    capacity: { type: Number, min: 1 },
  },
  { timestamps: true }
);

// Validate that targetGrade and targetSection are present when scope is 'specific'
EventSchema.pre('validate', function (next) {
  if (this.scope === 'specific') {
    if (!this.targetGrade) {
      this.invalidate('targetGrade', 'targetGrade is required when scope is specific');
    }
    if (!this.targetSection) {
      this.invalidate('targetSection', 'targetSection is required when scope is specific');
    }
  }
  next();
});

// Expose _id as id, omit _id and __v
EventSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

EventSchema.index({ date: 1 });
EventSchema.index({ category: 1 });
EventSchema.index({ featured: 1 });
EventSchema.index({ scope: 1, targetGrade: 1, targetSection: 1 });

export default mongoose.model<IEvent>('Event', EventSchema);
