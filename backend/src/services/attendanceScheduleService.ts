import InstitutionConfig from '../models/InstitutionConfig';

export interface HorarioAsistencia {
  horaIngreso: string;
  horaSalida: string;
  toleranciaMinutos: number;
}

/** Valores por defecto cuando la institución aún no configuró su horario. */
export const HORARIO_POR_DEFECTO: HorarioAsistencia = {
  horaIngreso: '08:00',
  horaSalida: '13:00',
  toleranciaMinutos: 10,
};

const HORA_VALIDA = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

export function esHoraValida(valor: unknown): boolean {
  return typeof valor === 'string' && HORA_VALIDA.test(valor.trim());
}

/** Convierte "HH:MM" a minutos desde medianoche. */
export function aMinutos(hora: string): number {
  const [h, m] = String(hora).trim().split(':');
  return Number(h) * 60 + Number(m);
}

/** Minutos desde medianoche de una fecha dada. */
export function minutosDeFecha(fecha: Date): number {
  return fecha.getHours() * 60 + fecha.getMinutes();
}

/** Formatea "HH:MM" como texto de 12 h (ej. "08:00 a. m."). */
export function formatearHora12(hora: string): string {
  if (!esHoraValida(hora)) return hora;
  const [h, m] = hora.split(':').map(Number);
  const sufijo = h < 12 ? 'a. m.' : 'p. m.';
  const hora12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(hora12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${sufijo}`;
}

/**
 * Lee el horario de asistencia configurado en la institución.
 * Si no hay documento o los valores son inválidos, usa el horario por defecto.
 */
export async function obtenerHorarioAsistencia(): Promise<HorarioAsistencia> {
  const config = await InstitutionConfig.findOne({}).select(
    'horaIngreso horaSalida toleranciaMinutos'
  );

  const horaIngreso = esHoraValida(config?.horaIngreso)
    ? String(config!.horaIngreso)
    : HORARIO_POR_DEFECTO.horaIngreso;

  const horaSalida = esHoraValida(config?.horaSalida)
    ? String(config!.horaSalida)
    : HORARIO_POR_DEFECTO.horaSalida;

  const tolerancia = Number(config?.toleranciaMinutos);
  const toleranciaMinutos = Number.isFinite(tolerancia) && tolerancia >= 0
    ? tolerancia
    : HORARIO_POR_DEFECTO.toleranciaMinutos;

  return { horaIngreso, horaSalida, toleranciaMinutos };
}

/**
 * Clasifica una lectura de entrada comparándola con la hora de ingreso
 * configurada más los minutos de tolerancia.
 */
export function clasificarEntrada(fecha: Date, horario: HorarioAsistencia): 'Presente' | 'Tardanza' {
  const limite = aMinutos(horario.horaIngreso) + horario.toleranciaMinutos;
  return minutosDeFecha(fecha) <= limite ? 'Presente' : 'Tardanza';
}

/** Indica si la lectura de salida ocurre antes de la hora de salida configurada. */
export function esSalidaAnticipada(fecha: Date, horario: HorarioAsistencia): boolean {
  return minutosDeFecha(fecha) < aMinutos(horario.horaSalida);
}
