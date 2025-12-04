import mongoose, { Schema, Document } from 'mongoose';

export interface IIncident extends Document {
    incidentType: string;
    incidentDate: Date;
    reporterName: string;
    victimId?: mongoose.Types.ObjectId;
    aggressorId?: mongoose.Types.ObjectId;
    isViolent: boolean;
    description: string;
    location: string;
    actionsTaken: string;
    status: string;
    registeredBy: mongoose.Types.ObjectId;
    closedAt?: Date;
    closedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const IncidentSchema: Schema = new Schema(
    {
        incidentType: {
            type: String,
            enum: ['Conductual', 'Académica', 'Salud', 'Bullying', 'Daño a propiedad', 'Otro'],
            required: [true, 'El tipo de incidencia es requerido'],
        },
        incidentDate: {
            type: Date,
            required: [true, 'La fecha del incidente es requerida'],
        },
        reporterName: {
            type: String,
            required: [true, 'El nombre del informante es requerido'],
            trim: true,
        },
        victimId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        aggressorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        isViolent: {
            type: Boolean,
            default: false,
        },
        description: {
            type: String,
            required: [true, 'La descripción del incidente es requerida'],
            trim: true,
        },
        location: {
            type: String,
            required: [true, 'El lugar del incidente es requerido'],
            trim: true,
        },
        actionsTaken: {
            type: String,
            trim: true,
        },
        status: {
            type: String,
            enum: ['Pendiente', 'En Proceso', 'Resuelto', 'Cerrado'],
            default: 'Pendiente',
        },
        registeredBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'El usuario que registra es requerido'],
        },
        closedAt: {
            type: Date,
        },
        closedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

IncidentSchema.set('toJSON', {
    transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

// Índices para búsquedas eficientes
IncidentSchema.index({ incidentType: 1 });
IncidentSchema.index({ incidentDate: -1 });
IncidentSchema.index({ status: 1 });
IncidentSchema.index({ registeredBy: 1 });
IncidentSchema.index({ isViolent: 1 });

const Incident = mongoose.model<IIncident>('Incident', IncidentSchema);

export default Incident;
