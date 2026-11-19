import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  title: string;
  body: string;
  imageUrl?: string;
  audience: 'all' | 'section' | 'students';
  sectionId?: mongoose.Types.ObjectId;
  studentIds?: mongoose.Types.ObjectId[];
  senderId: mongoose.Types.ObjectId;
  senderRole: string;
  readBy: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, trim: true },
    imageUrl: { type: String, trim: true },
    audience: { type: String, enum: ['all', 'section', 'students'], required: true, default: 'all' },
    sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
    studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole: { type: String, trim: true, required: true },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Guardian' }],
  },
  { timestamps: true }
);

MessageSchema.index({ audience: 1, createdAt: -1 });
MessageSchema.index({ sectionId: 1, createdAt: -1 });
MessageSchema.index({ studentIds: 1, createdAt: -1 });

MessageSchema.set('toJSON', {
  transform: function (_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const Message = mongoose.model<IMessage>('Message', MessageSchema);
export default Message;
