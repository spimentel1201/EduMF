import mongoose, { Schema, Document } from 'mongoose';

export interface IInstitutionConfig extends Document {
  name: string;
  address: string;
  phone: string;
  email: string;
  logoBase64: string;
  bgImageBase64: string;
  bgOpacity: number;
  /** Hora oficial de ingreso (HH:MM, 24 h). */
  horaIngreso: string;
  /** Hora oficial de salida (HH:MM, 24 h). */
  horaSalida: string;
  /** Minutos de tolerancia después de la hora de ingreso para marcar Tardanza. */
  toleranciaMinutos: number;
  /** Horas a las que se cierra el turno y se avisa la falta (HH:MM). */
  horasCierreTurno: string[];
  /** Si true, el job de cierre avisa a los tutores cuando el alumno no tiene registro. */
  avisarFaltaSinRegistro: boolean;
  /** Tardanzas en el mes para considerar reincidencia. */
  umbralTardanzas: number;
  /** Faltas en el mes para considerar reincidencia. */
  umbralFaltas: number;
  /** Texto editable del aviso de privacidad (Ley 29733). */
  avisoPrivacidad: string;
  /** Interruptor general del portal de padres. */
  portalHabilitado: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const HORA_REGEX = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

export const AVISO_PRIVACIDAD_POR_DEFECTO =
  'La información de asistencia de su hijo(a) es de uso personal y familiar. ' +
  'No comparta sus credenciales con terceros. Para consultas sobre datos personales, ' +
  'comuníquese con la institución educativa.';

/**
 * Defaults de la configuración institucional.
 *
 * Mongoose los aplica al hidratar, pero no los guarda en el documento existente:
 * una lectura `.lean()` o con proyección devuelve `undefined`. `conValoresPorDefecto`
 * evita que el job de cierre o el portal interpreten esos campos como apagados.
 */
export const CONFIG_POR_DEFECTO = {
  horaIngreso: '08:00',
  horaSalida: '13:00',
  toleranciaMinutos: 10,
  horasCierreTurno: ['12:30', '17:30'],
  avisarFaltaSinRegistro: true,
  umbralTardanzas: 3,
  umbralFaltas: 3,
  avisoPrivacidad: AVISO_PRIVACIDAD_POR_DEFECTO,
  portalHabilitado: true,
} as const;

/** Completa una lectura de configuración con los valores por defecto. */
export function conValoresPorDefecto<T extends Record<string, any>>(
  config: T | null | undefined
): T & typeof CONFIG_POR_DEFECTO {
  const limpio = Object.fromEntries(
    Object.entries(config ?? {}).filter(([, valor]) => valor !== undefined && valor !== null)
  ) as T;
  return { ...CONFIG_POR_DEFECTO, ...limpio };
}

const InstitutionConfigSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre de la institución es requerido'],
      trim: true,
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
      match: [/^\S+@\S+\.\S+$/, 'El correo electrónico no tiene un formato válido'],
    },
    logoBase64: {
      type: String,
      default: '',
    },
    bgImageBase64: {
      type: String,
      default: '',
    },
    bgOpacity: {
      type: Number,
      default: 30,
      min: 0,
      max: 100,
    },
    horaIngreso: {
      type: String,
      trim: true,
      default: '08:00',
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'],
    },
    horaSalida: {
      type: String,
      trim: true,
      default: '13:00',
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'],
    },
    toleranciaMinutos: {
      type: Number,
      default: 10,
      min: 0,
      max: 120,
    },
    horasCierreTurno: {
      type: [String],
      default: () => ['12:30', '17:30'],
      validate: {
        validator: (horas: string[]) =>
          Array.isArray(horas) &&
          horas.length > 0 &&
          horas.every((hora) => HORA_REGEX.test(String(hora).trim())),
        message: 'Cada hora de cierre debe tener el formato HH:MM',
      },
    },
    avisarFaltaSinRegistro: {
      type: Boolean,
      default: true,
    },
    umbralTardanzas: {
      type: Number,
      default: 3,
      min: 0,
      max: 50,
    },
    umbralFaltas: {
      type: Number,
      default: 3,
      min: 0,
      max: 50,
    },
    avisoPrivacidad: {
      type: String,
      trim: true,
      maxlength: 4000,
      default: AVISO_PRIVACIDAD_POR_DEFECTO,
    },
    portalHabilitado: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

InstitutionConfigSchema.set('toJSON', {
  transform: function (_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const InstitutionConfig = mongoose.model<IInstitutionConfig>(
  'InstitutionConfig',
  InstitutionConfigSchema
);

export default InstitutionConfig;
