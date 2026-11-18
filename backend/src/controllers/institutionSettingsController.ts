import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import InstitutionConfig, {
  AVISO_PRIVACIDAD_POR_DEFECTO,
  CONFIG_POR_DEFECTO,
  conValoresPorDefecto,
} from '../models/InstitutionConfig';
import { ApiError } from '../middleware/errorHandler';

const HORA_REGEX = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

/** Convierte un valor de formulario/JSON a booleano sin caer en Boolean("false"). */
function aBooleano(valor: unknown): boolean {
  return valor === true || valor === 'true' || valor === 1 || valor === '1';
}

// @desc    Obtener configuración institucional (admin)
// @route   GET /api/institution-settings
// @access  Private (admin)
export const getSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = await InstitutionConfig.findOne({});

    if (!config) {
      // Retorna objeto vacío con HTTP 200 si no existe documento aún
      return res.status(200).json({
        success: true,
        data: {
          name: '',
          address: '',
          phone: '',
          email: '',
          logoBase64: '',
          bgImageBase64: '',
          bgOpacity: 30,
          horaIngreso: '08:00',
          horaSalida: '13:00',
          toleranciaMinutos: 10,
          horasCierreTurno: ['12:30', '17:30'],
          avisarFaltaSinRegistro: true,
          umbralTardanzas: 3,
          umbralFaltas: 3,
          avisoPrivacidad: AVISO_PRIVACIDAD_POR_DEFECTO,
          portalHabilitado: true,
        },
      });
    }

    res.status(200).json({ success: true, data: config });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener datos de branding públicos (sin auth) para la pantalla de login
// @route   GET /api/institution-settings/public
// @access  Public
export const getPublicSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = await InstitutionConfig.findOne(
      {},
      'name address logoBase64 bgImageBase64 bgOpacity horaIngreso horaSalida toleranciaMinutos'
    );
    res.status(200).json({
      success: true,
      data: {
        name:          config?.name          ?? '',
        address:       config?.address       ?? '',
        logoBase64:    config?.logoBase64    ?? '',
        bgImageBase64: config?.bgImageBase64 ?? '',
        bgOpacity:     config?.bgOpacity     ?? 30,
        horaIngreso:   config?.horaIngreso   ?? '08:00',
        horaSalida:    config?.horaSalida    ?? '13:00',
        toleranciaMinutos: config?.toleranciaMinutos ?? 10,
      },
    });
  } catch (error) {
    next(error);
  }
};


// @desc    Actualizar configuración institucional
// @route   PUT /api/institution-settings
// @access  Private (admin)
export const updateSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validar campos con express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(ApiError.badRequest(String(errors.array()[0].msg)));
    }

    const {
      name, address, phone, email, logoBase64, bgImageBase64, bgOpacity,
      horaIngreso, horaSalida, toleranciaMinutos,
      horasCierreTurno, avisarFaltaSinRegistro, umbralTardanzas, umbralFaltas,
      avisoPrivacidad, portalHabilitado,
    } = req.body;

    const updateData: Record<string, unknown> = { name: name.trim() };
    if (address      !== undefined) updateData.address      = address;
    if (phone        !== undefined) updateData.phone        = phone;
    if (email        !== undefined) updateData.email        = email;
    if (logoBase64   !== undefined) updateData.logoBase64   = logoBase64;
    if (bgImageBase64 !== undefined) updateData.bgImageBase64 = bgImageBase64;
    if (bgOpacity    !== undefined) updateData.bgOpacity    = Number(bgOpacity);
    if (horaIngreso  !== undefined) updateData.horaIngreso  = String(horaIngreso).trim();
    if (horaSalida   !== undefined) updateData.horaSalida   = String(horaSalida).trim();
    if (toleranciaMinutos !== undefined) updateData.toleranciaMinutos = Number(toleranciaMinutos);

    if (horasCierreTurno !== undefined) {
      const horas = (Array.isArray(horasCierreTurno) ? horasCierreTurno : [horasCierreTurno])
        .map((hora: unknown) => String(hora).trim())
        .filter(Boolean);
      const invalida = horas.find((hora) => !HORA_REGEX.test(hora));
      if (invalida) {
        return next(ApiError.badRequest(`Hora de cierre inválida: ${invalida}. Use HH:MM`));
      }
      updateData.horasCierreTurno = horas;
    }

    if (avisarFaltaSinRegistro !== undefined) {
      updateData.avisarFaltaSinRegistro = aBooleano(avisarFaltaSinRegistro);
    }
    if (umbralTardanzas !== undefined) updateData.umbralTardanzas = Number(umbralTardanzas);
    if (umbralFaltas   !== undefined) updateData.umbralFaltas   = Number(umbralFaltas);
    if (avisoPrivacidad !== undefined) {
      updateData.avisoPrivacidad = String(avisoPrivacidad).trim();
    }
    if (portalHabilitado !== undefined) {
      updateData.portalHabilitado = aBooleano(portalHabilitado);
    }

    const config = await InstitutionConfig.findOneAndUpdate(
      {},
      { $set: updateData },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: config });
  } catch (error) {
    next(error);
  }
};
